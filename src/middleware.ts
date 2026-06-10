import { NextResponse } from 'next/server'

// Coming soon désactivé — réactiver avant le lancement public
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
