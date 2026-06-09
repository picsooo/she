import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Where } from 'payload'

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
