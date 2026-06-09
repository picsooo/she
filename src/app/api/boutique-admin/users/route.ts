import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Where } from 'payload'

// Route interne — lecture des utilisateurs pour le dashboard boutique-admin
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const { searchParams } = req.nextUrl

    const limit = parseInt(searchParams.get('limit') ?? '20', 10)
    const depth = parseInt(searchParams.get('depth') ?? '0', 10)
    const sort  = searchParams.get('sort') ?? 'email'

    // Construire le where à partir des query params Payload-style (where[field][op]=val)
    const where: Where = {}
    for (const [key, val] of searchParams.entries()) {
      const match = key.match(/^where\[(\w+)\]\[(\w+)\]$/)
      if (match) {
        const [, field, op] = match
        ;(where as Record<string, unknown>)[field] = { [op]: val }
      }
    }

    const result = await payload.find({
      collection: 'users',
      where,
      limit,
      sort,
      depth,
      overrideAccess: true,
    })

    // Ne pas exposer les hash de mots de passe
    const safeDocs = result.docs.map(({ hash: _h, salt: _s, ...u }) => u)

    return NextResponse.json({ ...result, docs: safeDocs })
  } catch (err) {
    console.error('[boutique-admin/users GET]', err)
    return NextResponse.json({ docs: [], totalDocs: 0 }, { status: 500 })
  }
}
