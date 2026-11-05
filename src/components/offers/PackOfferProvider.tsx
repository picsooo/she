'use client'

import { createContext, useContext } from 'react'
import type { PackOfferConfig } from '@/lib/pack-offer'

// Rend la configuration de l'offre pack disponible partout côté client
// (panier, drawer, checkout, cartes produit) sans la re-télécharger à chaque page.
// Elle est lue une seule fois côté serveur dans le layout frontend.
const PackOfferContext = createContext<PackOfferConfig | null>(null)

export function PackOfferProvider({
  offer,
  children,
}: {
  offer: PackOfferConfig | null
  children: React.ReactNode
}) {
  return <PackOfferContext.Provider value={offer}>{children}</PackOfferContext.Provider>
}

export function usePackOfferConfig(): PackOfferConfig | null {
  return useContext(PackOfferContext)
}
