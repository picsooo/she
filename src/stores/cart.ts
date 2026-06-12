'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getEffectivePrice } from '@/lib/utils'
import type { FreeGiftData } from './freeGift'

// Article du panier avec sa variation choisie
export interface CartItem {
  productId: string
  productSlug: string
  productNameAr: string
  productImage: string | null
  variationIndex: number   // index dans le tableau variations[] du produit
  colorAr: string
  colorFr: string
  size: string
  regularPrice: number
  salePrice?: number | null
  quantity: number
  // Marqueur pour les burkinis : indique la couleur de chapeau associée
  // Utilisé par syncHats() pour recalculer les quantités chapeaux automatiquement
  burkiniHatColor?: 'beige' | 'bleu'
}

interface CartState {
  items: CartItem[]
  isDrawerOpen: boolean

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  // Ajoute plusieurs articles en une seule opération atomique (évite les conflits de state)
  addItems: (items: Omit<CartItem, 'quantity'>[]) => void
  removeItem: (productId: string, variationIndex: number) => void
  updateQuantity: (productId: string, variationIndex: number, quantity: number) => void
  updateVariation: (
    productId: string,
    oldVariationIndex: number,
    newVariation: Pick<CartItem, 'variationIndex' | 'colorAr' | 'colorFr' | 'size' | 'regularPrice' | 'salePrice'>
  ) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void

  // Synchronise les chapeaux cadeaux selon la quantité des burkinis dans le panier
  // Appelé automatiquement par useHatSync quand les burkinis changent
  syncHats: (beigeGift: FreeGiftData | null, bleuGift: FreeGiftData | null) => void

  // Calculés
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      // Ajoute un article ou incrémente la quantité si déjà présent
      addItem: (newItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.productId === newItem.productId &&
              item.variationIndex === newItem.variationIndex
          )

          if (existingIndex >= 0) {
            const updated = [...state.items]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1,
            }
            return { items: updated, isDrawerOpen: true }
          }

          return {
            items: [...state.items, { ...newItem, quantity: 1 }],
            isDrawerOpen: true,
          }
        })
      },

      // Ajoute plusieurs articles en une seule opération atomique
      addItems: (newItems) => {
        set((state) => {
          let items = [...state.items]
          for (const newItem of newItems) {
            const existingIndex = items.findIndex(
              (item) =>
                item.productId === newItem.productId &&
                item.variationIndex === newItem.variationIndex
            )
            if (existingIndex >= 0) {
              items = items.map((item, i) =>
                i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
              )
            } else {
              items = [...items, { ...newItem, quantity: 1 }]
            }
          }
          return { items, isDrawerOpen: true }
        })
      },

      removeItem: (productId, variationIndex) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.variationIndex === variationIndex)
          ),
        }))
      },

      updateQuantity: (productId, variationIndex, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId, variationIndex)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.variationIndex === variationIndex
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      // Permet de changer la variation (taille/couleur) depuis le panier ou le drawer
      updateVariation: (productId, oldVariationIndex, newVariation) => {
        set((state) => {
          const existingNew = state.items.find(
            (item) =>
              item.productId === productId &&
              item.variationIndex === newVariation.variationIndex
          )

          if (existingNew) {
            return {
              items: state.items
                .filter(
                  (item) =>
                    !(item.productId === productId && item.variationIndex === oldVariationIndex)
                )
                .map((item) =>
                  item.productId === productId && item.variationIndex === newVariation.variationIndex
                    ? {
                        ...item,
                        quantity:
                          item.quantity +
                          (state.items.find(
                            (i) =>
                              i.productId === productId && i.variationIndex === oldVariationIndex
                          )?.quantity ?? 0),
                      }
                    : item
                ),
            }
          }

          return {
            items: state.items.map((item) =>
              item.productId === productId && item.variationIndex === oldVariationIndex
                ? { ...item, ...newVariation }
                : item
            ),
          }
        })
      },

      // Synchronise les chapeaux cadeaux : quantité chapeau = somme des quantités burkinis correspondants
      syncHats: (beigeGift, bleuGift) => {
        set((state) => {
          // Calculer les quantités totales de burkinis par couleur de chapeau
          let beigeQty = 0
          let bleuQty = 0
          for (const item of state.items) {
            if (item.burkiniHatColor === 'beige') beigeQty += item.quantity
            else if (item.burkiniHatColor === 'bleu') bleuQty += item.quantity
          }

          let items = [...state.items]

          // Helper : mettre à jour ou ajouter/supprimer un chapeau
          const applyHat = (gift: FreeGiftData, neededQty: number) => {
            const idx = items.findIndex(
              (i) => i.productId === gift.productId && i.variationIndex === gift.variationIndex
            )
            if (neededQty > 0) {
              if (idx >= 0) {
                // Mettre à jour la quantité seulement si différente
                if (items[idx].quantity !== neededQty) {
                  items = items.map((item, i) =>
                    i === idx ? { ...item, quantity: neededQty } : item
                  )
                }
              } else {
                // Ajouter le chapeau
                items = [...items, {
                  productId: gift.productId,
                  productSlug: gift.productSlug,
                  productNameAr: `🎁 ${gift.productNameAr} (مجاني)`,
                  productImage: gift.productImage,
                  variationIndex: gift.variationIndex,
                  colorAr: gift.colorAr,
                  colorFr: gift.colorFr,
                  size: gift.size,
                  regularPrice: 0,
                  salePrice: null,
                  quantity: neededQty,
                }]
              }
            } else {
              // Supprimer le chapeau si aucun burkini ne le nécessite
              if (idx >= 0) {
                items = items.filter((_, i) => i !== idx)
              }
            }
          }

          if (beigeGift) applyHat(beigeGift, beigeQty)
          if (bleuGift) applyHat(bleuGift, bleuQty)

          return { items }
        })
      },

      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      getTotalItems: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce(
          (sum, item) =>
            sum + getEffectivePrice(item.regularPrice, item.salePrice) * item.quantity,
          0
        ),
    }),
    {
      name: 'she-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
