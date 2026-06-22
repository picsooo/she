/**
 * Vérifie l'authentification JWT Payload sur les routes API boutique-admin.
 * Lit le cookie "payload-token" puis appelle /api/users/me pour valider.
 * C'est la même approche que le layout boutique-admin — on sait que ça marche.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function requireAuth(
  req: NextRequest
): Promise<{ user: { id: string; role?: string; email: string } } | null> {
  try {
    // Lire le cookie payload-token depuis la requête entrante
    const token = req.cookies.get('payload-token')?.value
    if (!token) return null

    // Vérifier le token via l'endpoint Payload (même logique que le layout)
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
    const res = await fetch(`${serverUrl}/api/users/me`, {
      headers: { Authorization: `JWT ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const data = await res.json() as { user?: { id: string; role?: string; email: string } }
    if (!data.user) return null

    return { user: data.user }
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
