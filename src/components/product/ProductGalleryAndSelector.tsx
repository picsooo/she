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
  // Cherche l'image par URL et l'active si trouvée
  setActiveByUrl: (url: string) => void
  uniqueColors: string[]
  // URLs de toutes les images de la galerie (pour la recherche par URL)
  imageUrls: string[]
}

const GalleryContext = createContext<GalleryContextValue | null>(null)

export function useGalleryContext() {
  return useContext(GalleryContext)
}

interface ProviderProps {
  product: Product
  // URLs des images de la galerie (dans le même ordre que ProductGallery)
  imageUrls?: string[]
  children: React.ReactNode
}

/**
 * Wrapper provider à placer autour du grid produit.
 * Partage l'état activeIndex entre la galerie et le sélecteur.
 */
export function ProductGalleryProvider({ product, imageUrls = [], children }: ProviderProps) {
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

  // Cherche l'image par URL (partielle ou complète) et l'active
  const setActiveByUrl = (url: string) => {
    const idx = imageUrls.findIndex(u => u === url || u.includes(url) || url.includes(u))
    if (idx >= 0) setActiveIndex(idx)
  }

  return (
    <GalleryContext.Provider value={{ activeIndex, setActiveIndex, setActiveByUrl, uniqueColors, imageUrls }}>
      {children}
    </GalleryContext.Provider>
  )
}
