import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const { id } = await params
    const depth = parseInt(req.nextUrl.searchParams.get('depth') ?? '0', 10)
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.findByID({ collection: 'products', id, depth, overrideAccess: true })
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const { id } = await params
    const data = await req.json()
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.update({ collection: 'products', id, data, overrideAccess: true })
    return NextResponse.json(doc)
  } catch (err) {
    console.error('[boutique-admin/products/:id PATCH]', err)
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })
    await payload.delete({ collection: 'products', id, overrideAccess: true })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[boutique-admin/products/:id DELETE]', err)
    return NextResponse.json({ error: 'Suppression échouée' }, { status: 500 })
  }
}
