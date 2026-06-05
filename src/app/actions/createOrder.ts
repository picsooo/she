'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createOrderSchema } from '@/lib/checkout-schema'
import { generateOrderNumber, getEffectivePrice } from '@/lib/utils'
import { getProductById, getNextOrderSequence } from '@/lib/payload-client'

// Résultat de la création de commande
type CreateOrderResult =
  | { success: true; orderNumber: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

// Server Action — crée une commande depuis le checkout
// Validation Zod côté serveur obligatoire (jamais faire confiance au client)
export async function createOrder(rawData: unknown): Promise<CreateOrderResult> {
  // 1. Valider les données avec Zod
  const parsed = createOrderSchema.safeParse(rawData)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.errors.forEach((err) => {
      const field = err.path.join('.')
      fieldErrors[field] = err.message
    })
    return { success: false, error: 'بيانات غير صحيحة', fieldErrors }
  }

  const { customer, items } = parsed.data

  try {
    const payload = await getPayload({ config: configPromise })

    // 2. Résoudre chaque article et vérifier le stock
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

    // 3. Générer le numéro de commande unique
    const sequence = await getNextOrderSequence()
    const orderNumber = generateOrderNumber(sequence)

    // 4. Créer la commande dans Payload
    await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        customerName: customer.customerName,
        phone: customer.phone,
        wilaya: customer.wilayaName,
        commune: customer.commune,
        address: customer.address,
        note: customer.note,
        items: resolvedItems,
        subtotal,
        shippingFee: 0, // TODO: calculer selon wilaya
        total: subtotal,
        status: 'new',
      },
    })

    // 5. Créer ou mettre à jour le client (upsert sur téléphone)
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
