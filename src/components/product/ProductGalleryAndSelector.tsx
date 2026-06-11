'use client'

/**
 * Contexte partagé entre ProductGallery et VariantSelector.
 * Quand l'utilisateur sélectionne une couleur :
 *  - Si la variation a une image spécifique (variationImageUrl) → override direct
 *  - Sinon → fallback index (i-ème couleur → i-ème image principale)
 */

import { createContext, useContext, useState, useMemo } from 'react'
import type { Product } from '@/payload-types'

interface GalleryContextValue {
  activeIndex: number
  setActiveIndex: (idx: number) => void
  // Override URL : si défini, la galerie affiche cette image plutôt que celle de activeIndex
  overrideImageUrl: string | null
  setOverrideImageUrl: (url: string | null) => void
  uniqueColors: string[]
}

const GalleryContext = createContext<GalleryContextValue | null>(null)

export function useGalleryContext() {
  return useContext(GalleryContext)
}

interface ProviderProps {
  product: Product
  children: React.ReactNode
}

export function ProductGalleryProvider({ product, children }: ProviderProps) {
  const [activeIndex,      setActiveIndex]      = useState(0)
  const [overrideImageUrl, setOverrideImageUrl] = useState<string | null>(null)

  const uniqueColors = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const v of product.variations ?? []) {
      const c = v.colorAr ?? ''
      if (!seen.has(c)) { seen.add(c); result.push(c) }
    }
    return result
  }, [product.variations])

  return (
    <GalleryContext.Provider value={{ activeIndex, setActiveIndex, overrideImageUrl, setOverrideImageUrl, uniqueColors }}>
      {children}
    </GalleryContext.Provider>
  )
}
