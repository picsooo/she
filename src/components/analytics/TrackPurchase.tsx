'use client'

import { useEffect } from 'react'
import { trackPurchase } from '@/lib/tracking'
import type { Order } from '@/payload-types'

interface TrackPurchaseProps {
  order: Order
}

/**
 * Client Component — tire Purchase/CompletePayment sur la thank-you page.
 * Protection anti-doublon intégrée dans trackPurchase() via localStorage.
 * S'assure que le pixel ne se déclenche qu'une seule fois par commande,
 * même si l'utilisateur recharge la page de confirmation.
 */
export function TrackPurchase({ order }: TrackPurchaseProps) {
  useEffect(() => {
    if (!order) return

    const items = (order.items ?? []).map((item) => ({
      id: typeof item.product === 'string' ? item.product : item.product.id,
      name: item.productName ?? '',
      quantity: item.quantity ?? 1,
      price: item.unitPrice ?? 0,
    }))

    trackPurchase(order.orderNumber, order.total ?? 0, items)
  }, [order])

  return null
}
