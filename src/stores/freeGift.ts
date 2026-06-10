'use client'

import { create } from 'zustand'

// Données du produit cadeau (chapeau offert avec burkini)
export interface FreeGiftData {
  productId: string
  productSlug: string
  productNameAr: string
  productImage: string | null
  variationIndex: number
  colorAr: string
  size: string
}

interface FreeGiftStore {
  // Toutes les variations du chapeau (bleu, beige…) — choisie dynamiquement selon la couleur du burkini
  chapeauVariations: FreeGiftData[]
  setChapeauVariations: (data: FreeGiftData[]) => void
}

// Store global — initialisé une fois depuis le layout server component
export const useFreeGiftStore = create<FreeGiftStore>((set) => ({
  chapeauVariations: [],
  setChapeauVariations: (data) => set({ chapeauVariations: data }),
}))
