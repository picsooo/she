import { NextResponse } from 'next/server'

// Route de déconnexion — efface le cookie payload-token et redirige vers boutique-admin
export async function POST(req: Request) {
  const redirectTo = new URL('/boutique-admin', process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000')
  const res = NextResponse.redirect(redirectTo)
  // Supprimer le cookie Payload
  res.cookies.set('payload-token', '', { maxAge: 0, path: '/' })
  return res
}

// Support GET pour les liens directs
export async function GET() {
  return POST(new Request('http://localhost'))
}
