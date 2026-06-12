import { NextRequest, NextResponse } from 'next/server'

// Middleware minimal — le coming-soon est désactivé, le site est public.
// boutique-admin et confirmatrice ont leur propre auth (LoginPage).
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
