'use client'

import { useEffect } from 'react'
import { trackViewContent } from '@/lib/tracking'

interface TrackViewContentProps {
  productId: string
  productName: string
  price: number
}

/**
 * Client Component — tire ViewContent une fois que la page produit est chargée.
 * Intégré dans la page produit (Server Component) via un petit wrapper client.
 */
export function TrackViewContent({ productId, productName, price }: TrackViewContentProps) {
  useEffect(() => {
    trackViewContent(productId, productName, price)
  }, [productId, productName, price])

  return null
}
