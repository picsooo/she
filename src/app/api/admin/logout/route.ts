import { NextResponse } from 'next/server'

// Route de déconnexion — efface le cookie payload-token (réponse 200 pour que fetch() applique bien le Set-Cookie)
export async function POST() {
  const res = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  // Supprimer le cookie avec les mêmes attributs que Payload
  res.cookies.set('payload-token', '', { maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' })
  return res
}
