'use client'

import { useEffect } from 'react'
import { useFreeGiftStore, type FreeGiftData } from '@/stores/freeGift'

// Composant client "invisible" — reçoit toutes les variations du chapeau depuis le layout serveur
// et les injecte dans le store global Zustand dès le premier rendu.
export function FreeGiftInit({ chapeauVariations }: { chapeauVariations: FreeGiftData[] }) {
  const setChapeauVariations = useFreeGiftStore((s) => s.setChapeauVariations)
  useEffect(() => {
    if (chapeauVariations.length > 0) setChapeauVariations(chapeauVariations)
  }, [chapeauVariations, setChapeauVariations])
  return null
}
