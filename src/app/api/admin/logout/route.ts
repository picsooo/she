import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Route de déconnexion — appelle le logout Payload côté serveur (efface le cookie avec les bons flags)
// puis retourne 200 pour que le client puisse rediriger
export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value

  // Appel au logout Payload côté serveur pour effacer le cookie avec tous ses attributs (Secure, HttpOnly…)
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/users/logout`,
      {
        method: 'POST',
        headers: token ? { Authorization: `JWT ${token}`, Cookie: `payload-token=${token}` } : {},
      }
    )
  } catch { /* ignore — on supprime le cookie de toute façon */ }

  // Supprimer le cookie manuellement avec tous les attributs nécessaires
  const res = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  res.cookies.set('payload-token', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
  return res
}
