import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
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
