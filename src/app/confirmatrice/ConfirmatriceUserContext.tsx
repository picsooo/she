'use client'
import { createContext, useContext } from 'react'

export interface ConfUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  // Champs prime (chargés depuis l'API users/me)
  confirmatriceType?: 'salarie' | 'non_salarie'
  salaireMensuel?: number
  seuilCommandes?: number
  primeParCommande?: number
}

export const ConfirmatriceUserContext = createContext<ConfUser | null>(null)

export function useConfUser() {
  return useContext(ConfirmatriceUserContext)
}
