import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'site_preview'
const COOKIE_VALUE = 'granted_2026'

// Routes accessibles sans mot de passe
const PUBLIC_PREFIXES = [
  '/coming-soon',
  '/api/preview-auth',
  '/_next',
  '/media',
  '/branding',
  '/favicon.ico',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Laisser passer les assets et routes publiques
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Vérifier le cookie
  const cookie = req.cookies.get(COOKIE)
  if (cookie?.value === COOKIE_VALUE) {
    return NextResponse.next()
  }

  // Rediriger vers coming soon
  const url = req.nextUrl.clone()
  url.pathname = '/coming-soon'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
