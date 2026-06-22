import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

/**
 * GET  /api/boutique-admin/settings — lit les deux globals (delivery + marketing)
 * POST /api/boutique-admin/settings — sauvegarde (authentification requise)
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const payload = await getPayload({ config: configPromise })
    const [delivery, marketing] = await Promise.all([
      payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true }),
      payload.findGlobal({ slug: 'marketing-settings', overrideAccess: true }),
    ])
    return NextResponse.json({ delivery, marketing })
  } catch (err) {
    console.error('[boutique-admin/settings GET]', err)
    return NextResponse.json({ delivery: {}, marketing: {} }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const { delivery, marketing } = await req.json() as {
      delivery?: Record<string, unknown>
      marketing?: Record<string, unknown>
    }
    const payload = await getPayload({ config: configPromise })

    await Promise.all([
      delivery  ? payload.updateGlobal({ slug: 'delivery-settings',  data: delivery,  overrideAccess: true }) : Promise.resolve(),
      marketing ? payload.updateGlobal({ slug: 'marketing-settings', data: marketing, overrideAccess: true }) : Promise.resolve(),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[boutique-admin/settings POST]', err)
    return NextResponse.json({ error: 'Sauvegarde échouée' }, { status: 500 })
  }
}
