'use client'

/**
 * Contexte partagé entre ProductGallery et VariantSelector.
 * Quand l'utilisateur sélectionne une couleur, l'index actif de la galerie
 * se met à jour vers l'image correspondante (i-ème couleur → i-ème image).
 */

import { createContext, useContext, useState, useMemo } from 'react'
import type { Product } from '@/payload-types'

interface GalleryContextValue {
  activeIndex: number
  setActiveIndex: (idx: number) => void
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

/**
 * Wrapper provider à placer autour du grid produit.
 * Partage l'état activeIndex entre la galerie et le sélecteur.
 */
export function ProductGalleryProvider({ product, children }: ProviderProps) {
  const [activeIndex, setActiveIndex] = useState(0)

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
    <GalleryContext.Provider value={{ activeIndex, setActiveIndex, uniqueColors }}>
      {children}
    </GalleryContext.Provider>
  )
}
