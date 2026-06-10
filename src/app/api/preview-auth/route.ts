import { NextRequest, NextResponse } from 'next/server'

const PASSWORD = 'admin2026'
const COOKIE   = 'site_preview'
const COOKIE_VALUE = 'granted_2026'

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))

  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // 30 jours
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
