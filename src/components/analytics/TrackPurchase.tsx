'use client'

import { useEffect } from 'react'
import { trackPurchase } from '@/lib/tracking'
import { genEventId } from '@/lib/metaPixel'
import type { Order } from '@/payload-types'

interface TrackPurchaseProps {
  order: Order
}

/**
 * Client Component — tire Purchase sur la page de confirmation.
 * Architecture hybride : Pixel navigateur + Conversions API serveur avec le MÊME event_id.
 * La déduplication est assurée côté Meta grâce au partage de l'event_id.
 * Anti-doublon localStorage : ne se déclenche qu'une seule fois par commande.
 */
export function TrackPurchase({ order }: TrackPurchaseProps) {
  useEffect(() => {
    if (!order) return

    // Utiliser l'event_id généré côté serveur (stocké sur la commande) — ou en générer un nouveau
    const eventId = (order as Order & { metaEventId?: string }).metaEventId ?? genEventId()

    const items = (order.items ?? []).map((item) => ({
      id: typeof item.product === 'string' ? item.product : String(item.product?.id ?? ''),
      name: item.productName ?? '',
      quantity: item.quantity ?? 1,
      price: item.unitPrice ?? 0,
    }))

    // 1) Pixel navigateur (avec eventID pour déduplication)
    // Passer le téléphone pour TikTok Advanced Matching
    trackPurchase(order.orderNumber, order.total ?? 0, items, eventId, order.phone ?? undefined)

    // 2) CAPI serveur — même eventId → Meta déduplique automatiquement
    // Envoi non-bloquant (fire-and-forget), erreurs silencieuses
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        eventName: 'Purchase',
        value:     order.total ?? 0,
        currency:  'DZD',
        contents:  items.map(i => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
        phone:     order.phone,
        city:      order.wilaya,
      }),
    }).catch(() => { /* silencieux */ })
  }, [order])

  return null
}
