import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Where } from 'payload'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

// Route interne boutique-admin — bypass auth REST Payload
// GET /api/boutique-admin/orders?limit=&page=&sort=&depth=&where=

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = req.nextUrl

    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10)
    const page  = parseInt(searchParams.get('page')  ?? '1',  10)
    const sort  = searchParams.get('sort')  ?? '-createdAt'
    const depth = parseInt(searchParams.get('depth') ?? '1',  10)
    const whereRaw = searchParams.get('where')

    let where: Where = {}
    if (whereRaw) {
      try { where = JSON.parse(whereRaw) } catch { /* ignore */ }
    }

    // limit=0 → comptage uniquement (retourne totalDocs sans docs)
    const limit = limitParam === 0 ? 1 : limitParam

    const result = await payload.find({
      collection: 'orders',
      where,
      limit,
      page,
      sort,
      depth,
      overrideAccess: true,
    })

    if (limitParam === 0) {
      return NextResponse.json({ totalDocs: result.totalDocs, docs: [] })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[boutique-admin/orders GET]', err)
    return NextResponse.json({ error: 'Erreur serveur', docs: [], totalDocs: 0 }, { status: 500 })
  }
}
