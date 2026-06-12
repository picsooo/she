import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// PATCH /api/boutique-admin/users/[id] — mise à jour d'un utilisateur (toggle active, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const payload = await getPayload({ config: configPromise })

    const updated = await payload.update({
      collection: 'users',
      id,
      data: body,
      overrideAccess: true,
    })

    const { hash: _h, salt: _s, ...safe } = updated as typeof updated & { hash?: string; salt?: string }
    return NextResponse.json(safe)
  } catch (err) {
    console.error('[boutique-admin/users PATCH]', err)
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}
