/**
 * Vérifie l'authentification JWT Payload sur les routes API boutique-admin.
 * Lit le cookie "payload-token" depuis les headers de la requête.
 * Retourne l'utilisateur si authentifié, null sinon.
 */
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function requireAuth(
  req: NextRequest
): Promise<{ user: { id: string; role?: string; email: string } } | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.auth({ headers: req.headers })
    if (!result.user) return null
    return { user: result.user as { id: string; role?: string; email: string } }
  } catch {
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Non autorisé — connexion requise' },
    { status: 401 }
  )
}
