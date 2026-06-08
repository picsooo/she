'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createOrderSchema } from '@/lib/checkout-schema'
import { generateOrderNumber, getEffectivePrice } from '@/lib/utils'
import { getProductById, getNextOrderSequence } from '@/lib/payload-client'
import { sendOrderEmails } from '@/lib/email'

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

// Auto-assigne la commande à la confirmatrice avec le moins de commandes actives
async function autoAssignConfirmatrice(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string | undefined> {
  try {
    // Récupère tous les comptes confirmatrice
    const confirmatrices = await payload.find({
      collection: 'users',
      where: { role: { equals: 'confirmatrice' } },
      limit: 20,
    })

    if (confirmatrices.docs.length === 0) return undefined

    // Compte les commandes actives (non livrées/annulées) par confirmatrice
    const counts = await Promise.all(
      confirmatrices.docs.map(async (u) => {
        const { totalDocs } = await payload.find({
          collection: 'orders',
          where: {
            and: [
              { assignedTo: { equals: u.id } },
              { status: { not_in: ['delivered', 'cancelled', 'failed'] } },
            ],
          },
          limit: 0,
        })
        return { id: u.id as string, count: totalDocs }
      })
    )

    // Assignation à la confirmatrice avec le moins de commandes
    counts.sort((a, b) => a.count - b.count)
    return counts[0]?.id
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

      if (!variation.inStock) {
        return {
          success: false,
          error: `المنتج "${product.nameAr}" (${variation.colorAr ?? ''} - ${variation.size ?? ''}) غير متوفر`,
        }
      }

      const unitPrice = getEffectivePrice(variation.regularPrice ?? 0, variation.salePrice)
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

    // Calcul des frais de livraison selon le mode choisi
    const deliveryMode = customer.deliveryMode ?? 'home'
    const shippingFee = await getShippingFee(deliveryMode, payload)
    const total = subtotal + shippingFee

    // Numéro de commande unique
    const sequence = await getNextOrderSequence()
    const orderNumber = generateOrderNumber(sequence)

    // Auto-assignation à la confirmatrice
    const assignedTo = await autoAssignConfirmatrice(payload)

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
