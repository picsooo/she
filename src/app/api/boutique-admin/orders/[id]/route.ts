import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.findByID({ collection: 'orders', id, depth: 2, overrideAccess: true })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await req.json()
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.update({ collection: 'orders', id, data, overrideAccess: true })
    return NextResponse.json(doc)
  } catch (err) {
    console.error('[boutique-admin/orders/:id PATCH]', err)
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
    await payload.delete({ collection: 'orders', id, overrideAccess: true })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[boutique-admin/orders/:id DELETE]', err)
    return NextResponse.json({ error: 'Suppression échouée' }, { status: 500 })
  }
}
