'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createOrderSchema } from '@/lib/checkout-schema'
import { generateOrderNumber, getEffectivePrice } from '@/lib/utils'
import { getProductById, getNextOrderSequence } from '@/lib/payload-client'
import { sendOrderEmails } from '@/lib/email'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

type CreateOrderResult =
  | { success: true; orderNumber: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

// Calcule les frais de livraison selon le mode et les paramètres admin
async function getShippingFee(deliveryMode: 'home' | 'desk', payload: Awaited<ReturnType<typeof getPayload>>): Promise<number> {
  try {
    const settings = await payload.findGlobal({ slug: 'delivery-settings' })
    const fee = deliveryMode === 'desk'
      ? (settings as { defaultDeskDeliveryFee?: number }).defaultDeskDeliveryFee ?? 300
      : (settings as { defaultHomeDeliveryFee?: number }).defaultHomeDeliveryFee ?? 400
    return fee
  } catch {
    return deliveryMode === 'desk' ? 300 : 400
  }
}

// Auto-assigne la commande en round-robin strict :
// chaque nouvelle commande va à la confirmatrice suivante dans la liste ordonnée.
// Logique : on regarde la dernière commande assignée et on prend la suivante.
async function autoAssignConfirmatrice(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string | undefined> {
  try {
    // Récupère les confirmatrices triées par email (ordre stable)
    const { docs: confirmatrices } = await payload.find({
      collection: 'users',
      where: {
        and: [
          { role: { equals: 'confirmatrice' } },
          { active: { not_equals: false } },
        ],
      },
      sort: 'email',
      limit: 20,
    })

    if (confirmatrices.length === 0) return undefined
    if (confirmatrices.length === 1) return confirmatrices[0].id as string

    // Trouve la dernière commande qui a une confirmatrice assignée
    const { docs: lastOrders } = await payload.find({
      collection: 'orders',
      where: { assignedTo: { exists: true } },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })

    if (lastOrders.length === 0) {
      // Première commande → confirmatrice 0
      return confirmatrices[0].id as string
    }

    const lastAssignedId = typeof lastOrders[0].assignedTo === 'object'
      ? (lastOrders[0].assignedTo as { id: string }).id
      : String(lastOrders[0].assignedTo)

    const confirmatriceIds = confirmatrices.map(u => String(u.id))
    const lastIdx = confirmatriceIds.indexOf(lastAssignedId)

    // Passe à la suivante (round-robin)
    const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % confirmatrices.length
    return confirmatrices[nextIdx].id as string
  } catch (err) {
    console.error('[autoAssign] Erreur:', err)
    return undefined
  }
}

// Server Action — crée une commande depuis le checkout
export async function createOrder(rawData: unknown): Promise<CreateOrderResult> {
  console.log('[createOrder] rawData reçu:', JSON.stringify(rawData, null, 2))

  const parsed = createOrderSchema.safeParse(rawData)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.errors.forEach((err) => {
      const rawPath = err.path.join('.')
      const field = rawPath.startsWith('customer.') ? rawPath.slice('customer.'.length) : rawPath
      if (!fieldErrors[field]) fieldErrors[field] = err.message
    })
    const errorMsg = Object.keys(fieldErrors).length > 0
      ? Object.values(fieldErrors)[0]
      : 'تحقق من المعلومات المدخلة'
    return { success: false, error: errorMsg, fieldErrors }
  }

  const { customer, items } = parsed.data

  try {
    const payload = await getPayload({ config: configPromise })

    // Résoudre chaque article et vérifier le stock
    const resolvedItems: Array<{
      product: string
      productName: string
      variationIndex: number
      colorAr: string
      size: string
      quantity: number
      unitPrice: number
    }> = []

    let subtotal = 0

    for (const orderItem of items) {
      const product = await getProductById(orderItem.productId)
      if (!product) {
        return { success: false, error: `منتج غير موجود: ${orderItem.productId}` }
      }

      const variation = product.variations?.[orderItem.variationIndex]
      if (!variation) {
        return { success: false, error: `تشكيلة غير متوفرة للمنتج: ${product.nameAr}` }
      }

      // Les cadeaux offerts (isFreeGift) ont prix 0 — ne pas recalculer depuis la BDD
      const unitPrice = orderItem.isFreeGift
        ? 0
        : getEffectivePrice(variation.regularPrice ?? 0, variation.salePrice)

      // Les articles offerts (prix 0) ne sont pas soumis au contrôle de stock
      if (!variation.inStock && unitPrice > 0) {
        return {
          success: false,
          error: `المنتج "${product.nameAr}" (${variation.colorAr ?? ''} - ${variation.size ?? ''}) غير متوفر`,
        }
      }
      subtotal += unitPrice * orderItem.quantity

      resolvedItems.push({
        product: product.id,
        productName: product.nameAr ?? '',
        variationIndex: orderItem.variationIndex,
        colorAr: variation.colorAr ?? '',
        size: variation.size ?? '',
        quantity: orderItem.quantity,
        unitPrice,
      })
    }

    // Frais de livraison : utiliser le tarif Yalidine passé depuis le checkout
    // s'il est disponible, sinon fallback sur les tarifs par défaut des settings
    const deliveryMode = customer.deliveryMode ?? 'home'
    const shippingFee = customer.shippingFee != null
      ? customer.shippingFee
      : await getShippingFee(deliveryMode, payload)
    const total = subtotal + shippingFee

    // Numéro de commande unique
    const sequence = await getNextOrderSequence()
    const orderNumber = generateOrderNumber(sequence)

    // Auto-assignation à la confirmatrice
    const assignedTo = await autoAssignConfirmatrice(payload)

    // Génère un event_id stable pour la déduplication Meta Pixel / CAPI
    const metaEventId = randomUUID()

    // Cookies Meta (_fbp, _fbc) — capturés côté serveur pour améliorer le matching CAPI
    const cookieStore = await cookies()
    const fbp = cookieStore.get('_fbp')?.value ?? undefined
    const fbc = cookieStore.get('_fbc')?.value ?? undefined

    // Créer la commande
    await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        customerName: customer.customerName,
        phone: customer.phone,
        email: customer.email || undefined,
        wilaya: customer.wilayaName,
        commune: customer.commune,
        address: customer.address,
        note: customer.note,
        items: resolvedItems,
        subtotal,
        shippingFee,
        total,
        deliveryMode,
        status: 'new',
        metaEventId,
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      },
    })

    // Envoi emails (ne bloque pas la réponse — erreurs silencieuses)
    sendOrderEmails({
      orderNumber,
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email || undefined,
      wilaya: customer.wilayaName,
      commune: customer.commune,
      address: customer.address,
      note: customer.note,
      deliveryMode,
      items: resolvedItems,
      subtotal,
      shippingFee,
      total,
    }).catch(err => console.error('[createOrder] sendOrderEmails error:', err))

    // Upsert client
    const existingCustomer = await payload.find({
      collection: 'customers',
      where: { phone: { equals: customer.phone } },
      limit: 1,
    })

    if (existingCustomer.docs.length > 0) {
      const existing = existingCustomer.docs[0]
      await payload.update({
        collection: 'customers',
        id: existing.id,
        data: {
          ordersCount: ((existing as { ordersCount?: number }).ordersCount ?? 0) + 1,
          wilaya: customer.wilayaName,
          commune: customer.commune,
        },
      })
    } else {
      await payload.create({
        collection: 'customers',
        data: {
          name: customer.customerName,
          phone: customer.phone,
          wilaya: customer.wilayaName,
          commune: customer.commune,
          address: customer.address,
          ordersCount: 1,
        },
      })
    }

    return { success: true, orderNumber }
  } catch (err) {
    console.error('Erreur création commande:', err)
    return { success: false, error: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مجدداً.' }
  }
}
