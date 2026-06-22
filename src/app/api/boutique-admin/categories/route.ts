import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const data = await req.json()
    // Auto-slug depuis le nom
    if (!data.slug) {
      const ascii = (data.nameAr || data.name || '').toLowerCase()
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
      data.slug = (ascii || 'category') + '-' + Date.now()
    }
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.create({ collection: 'categories', data, overrideAccess: true })
    return NextResponse.json({ doc }, { status: 201 })
  } catch (err) {
    console.error('[boutique-admin/categories POST]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = req.nextUrl
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)
    const sort  = searchParams.get('sort') ?? 'nameAr'
    const depth = parseInt(searchParams.get('depth') ?? '0', 10)

    const result = await payload.find({
      collection: 'categories',
      limit,
      sort,
      depth,
      overrideAccess: true,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[boutique-admin/categories GET]', err)
    return NextResponse.json({ docs: [], totalDocs: 0 }, { status: 500 })
  }
}
