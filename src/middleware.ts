import { NextRequest, NextResponse } from 'next/server'

const COOKIE       = 'site_preview'
const COOKIE_VALUE = 'granted_2026'

// Routes accessibles sans mot de passe
const PUBLIC_PREFIXES = [
  '/coming-soon',
  '/api/preview-auth',
  '/api/admin/setup-admin-account',
  '/_next',
  '/media',
  '/branding',
  '/favicon.ico',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Assets et routes publiques toujours accessibles
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Cookie valide → accès total (site + boutique-admin)
  const cookie = req.cookies.get(COOKIE)
  if (cookie?.value === COOKIE_VALUE) {
    return NextResponse.next()
  }

  // Sinon → coming soon
  const url = req.nextUrl.clone()
  url.pathname = '/coming-soon'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
