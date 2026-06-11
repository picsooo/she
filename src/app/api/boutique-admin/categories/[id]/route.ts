import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.update({ collection: 'categories', id, data, overrideAccess: true })
    return NextResponse.json(doc)
  } catch (err) {
    console.error('[boutique-admin/categories PATCH]', err)
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })
    await payload.delete({ collection: 'categories', id, overrideAccess: true })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[boutique-admin/categories DELETE]', err)
    return NextResponse.json({ error: 'Suppression échouée' }, { status: 500 })
  }
}
