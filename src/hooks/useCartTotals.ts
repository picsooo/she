'use client'

import { useCartStore } from '@/stores/cart'
import { getEffectivePrice } from '@/lib/utils'
import { usePackOfferConfig } from '@/components/offers/PackOfferProvider'
import { computePackOffer, type PackOfferConfig, type PackResult } from '@/lib/pack-offer'

export interface CartTotals extends PackResult {
  /** Somme des articles à leur prix unitaire, avant offre pack */
  subtotal: number
  /** Total à payer hors livraison (subtotal - discount) */
  total: number
  offer: PackOfferConfig | null
}

// Source unique des totaux du panier côté client — utilisée par le drawer,
// la page panier et le checkout pour qu'ils affichent tous le même montant.
export function useCartTotals(): CartTotals {
  const items = useCartStore((state) => state.items)
  const offer = usePackOfferConfig()

  const subtotal = items.reduce(
    (sum, item) => sum + getEffectivePrice(item.regularPrice, item.salePrice) * item.quantity,
    0
  )

  const pack = computePackOffer(
    items.map((item) => ({
      productId: item.productId,
      unitPrice: getEffectivePrice(item.regularPrice, item.salePrice),
      quantity: item.quantity,
    })),
    offer
  )

  return {
    ...pack,
    subtotal,
    total: Math.max(0, subtotal - pack.discount),
    offer,
  }
}
