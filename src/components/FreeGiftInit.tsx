'use client'

import { useEffect } from 'react'
import { useFreeGiftStore, type FreeGiftData } from '@/stores/freeGift'

// Composant client "invisible" — reçoit les données du chapeau depuis le layout serveur
// et les injecte dans le store global Zustand dès le premier rendu.
export function FreeGiftInit({ chapeau }: { chapeau: FreeGiftData | null }) {
  const setChapeau = useFreeGiftStore((s) => s.setChapeau)
  useEffect(() => {
    setChapeau(chapeau)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
