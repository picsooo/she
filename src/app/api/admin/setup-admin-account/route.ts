import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Endpoint temporaire — crée ou met à jour le compte admin contact@boutique-she.com
// Protégé par PAYLOAD_SECRET
// GET /api/admin/setup-admin-account?key=<PAYLOAD_SECRET>

export async function GET(req: NextRequest) {
  const key    = req.nextUrl.searchParams.get('key')
  const secret = process.env.PAYLOAD_SECRET
  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })
  const email   = 'contact@boutique-she.com'
  const password = 'She2026!Admin#DOlK'

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: { password, role: 'admin' },
      overrideAccess: true,
    })
    return NextResponse.json({ status: 'updated', email, password })
  }

  await payload.create({
    collection: 'users',
    data: { email, password, role: 'admin', firstName: 'Admin', lastName: 'She' },
    overrideAccess: true,
  })

  return NextResponse.json({ status: 'created', email, password })
}
