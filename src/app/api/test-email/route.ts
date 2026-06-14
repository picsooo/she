import { NextResponse } from 'next/server'
import { sendOrderEmails } from '@/lib/email'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Route temporaire — envoie l'email de la dernière commande réelle
export async function GET() {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'orders',
    limit: 1,
    sort: '-createdAt',
    depth: 0,
    overrideAccess: true,
  })

  const order = result.docs[0] as Record<string, unknown>
  if (!order) return NextResponse.json({ error: 'Aucune commande' }, { status: 404 })

  const items = ((order.items as Array<Record<string, unknown>>) ?? []).map(item => ({
    productName: (item.productName as string) ?? '—',
    colorAr:     (item.colorAr as string) ?? '',
    size:        (item.size as string) ?? '',
    quantity:    (item.quantity as number) ?? 1,
    unitPrice:   (item.unitPrice as number) ?? 0,
  }))

  await sendOrderEmails({
    orderNumber:  (order.orderNumber as string),
    customerName: (order.customerName as string),
    phone:        (order.phone as string),
    email:        (order.email as string | undefined),
    wilaya:       (order.wilaya as string),
    commune:      (order.commune as string) ?? '',
    address:      (order.address as string) ?? '',
    note:         (order.note as string | undefined),
    deliveryMode: ((order.deliveryMode as string) ?? 'home') as 'home' | 'desk',
    items,
    subtotal:    (order.subtotal as number) ?? 0,
    shippingFee: (order.shippingFee as number) ?? 0,
    total:       (order.total as number) ?? 0,
  })

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber, message: 'Email envoyé' })
}
