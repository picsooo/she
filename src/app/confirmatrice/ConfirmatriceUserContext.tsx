'use client'
import { createContext, useContext } from 'react'

export interface ConfUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
}

export const ConfirmatriceUserContext = createContext<ConfUser | null>(null)

export function useConfUser() {
  return useContext(ConfirmatriceUserContext)
}
