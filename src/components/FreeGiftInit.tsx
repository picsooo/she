'use client'

import { useEffect } from 'react'
import { useFreeGiftStore, type FreeGiftData } from '@/stores/freeGift'

// Composant client "invisible" — reçoit les données du chapeau depuis le layout serveur
// et les injecte dans le store global Zustand dès le premier rendu.
export function FreeGiftInit({ chapeau }: { chapeau: FreeGiftData | null }) {
  const setChapeau = useFreeGiftStore((s) => s.setChapeau)
  // Ne met à jour le store que si le chapeau est non-null (une erreur serveur ne doit pas effacer le store)
  useEffect(() => {
    if (chapeau !== null) setChapeau(chapeau)
  }, [chapeau, setChapeau])
  return null
}
