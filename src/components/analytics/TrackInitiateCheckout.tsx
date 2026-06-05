'use client'

import { useEffect } from 'react'
import { trackInitiateCheckout } from '@/lib/tracking'
import { useCartStore } from '@/stores/cart'

/**
 * Client Component — tire InitiateCheckout à l'arrivée sur /checkout.
 * Lit le panier depuis Zustand pour avoir le total et le nombre d'articles.
 */
export function TrackInitiateCheckout() {
  const { getTotalPrice, getTotalItems } = useCartStore()

  useEffect(() => {
    const total = getTotalPrice()
    const numItems = getTotalItems()
    if (total > 0) {
      trackInitiateCheckout(total, numItems)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Seulement au montage (arrivée sur la page)

  return null
}
