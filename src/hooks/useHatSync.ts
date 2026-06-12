'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/stores/cart'
import { useFreeGiftStore } from '@/stores/freeGift'

// Hook qui observe les burkinis dans le panier et synchronise automatiquement
// les quantités de chapeaux cadeaux (beige ou bleu) en fonction
export function useHatSync() {
  const syncHats = useCartStore((s) => s.syncHats)
  const chapeauVariations = useFreeGiftStore((s) => s.chapeauVariations)

  // Sélecteur stable : retourne une chaîne "beigeQty:bleuQty" pour éviter les re-renders infinis
  const burkiniQtySummary = useCartStore((s) => {
    let beige = 0
    let bleu = 0
    for (const item of s.items) {
      if (item.burkiniHatColor === 'beige') beige += item.quantity
      else if (item.burkiniHatColor === 'bleu') bleu += item.quantity
    }
    return `${beige}:${bleu}`
  })

  useEffect(() => {
    if (chapeauVariations.length === 0) return
    const beigeRegex = /beige/i
    const beigeGift = chapeauVariations.find((v) => beigeRegex.test(v.colorFr)) ?? null
    const bleuGift = chapeauVariations.find((v) => !beigeRegex.test(v.colorFr)) ?? null
    syncHats(beigeGift, bleuGift)
  }, [burkiniQtySummary, chapeauVariations, syncHats])
}
