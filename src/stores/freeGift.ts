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
  chapeau: FreeGiftData | null
  setChapeau: (data: FreeGiftData | null) => void
}

// Store global — initialisé une fois depuis le layout server component
export const useFreeGiftStore = create<FreeGiftStore>((set) => ({
  chapeau: null,
  setChapeau: (data) => set({ chapeau: data }),
}))
