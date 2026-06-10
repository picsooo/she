import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Where } from 'payload'

function makeSlug(text: string): string {
  const base = text.toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (base || 'product') + '-' + Date.now()
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    // Garantir un slug unique (timestamp suffix)
    if (!data.slug) data.slug = makeSlug(data.nameAr || data.nameFr || '')
    const payload = await getPayload({ config: configPromise })
    const doc = await payload.create({ collection: 'products', data, overrideAccess: true })
    return NextResponse.json({ doc }, { status: 201 })
  } catch (err) {
    console.error('[boutique-admin/products POST]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = req.nextUrl

    const limit = parseInt(searchParams.get('limit') ?? '15', 10)
    const page  = parseInt(searchParams.get('page')  ?? '1',  10)
    const sort  = searchParams.get('sort')  ?? '-updatedAt'
    const depth = parseInt(searchParams.get('depth') ?? '2',  10)
    const whereRaw = searchParams.get('where')

    let where: Where = {}
    if (whereRaw) {
      try { where = JSON.parse(whereRaw) } catch { /* ignore */ }
    }

    const result = await payload.find({
      collection: 'products',
      where,
      limit,
      page,
      sort,
      depth,
      overrideAccess: true,
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[boutique-admin/products GET]', err)
    return NextResponse.json({ error: 'Erreur serveur', docs: [], totalDocs: 0 }, { status: 500 })
  }
}
