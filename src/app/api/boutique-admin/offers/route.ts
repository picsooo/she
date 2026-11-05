import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

/**
 * GET  /api/boutique-admin/offers — lit la config de l'offre pack
 * POST /api/boutique-admin/offers — enregistre la config (authentification requise)
 */

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const payload = await getPayload({ config: configPromise })
    // depth 1 : on veut le nom des produits sélectionnés pour les afficher dans l'admin
    const offer = await payload.findGlobal({ slug: 'pack-offer', depth: 1, overrideAccess: true })
    return NextResponse.json({ offer })
  } catch (err) {
    console.error('[boutique-admin/offers GET]', err)
    return NextResponse.json({ offer: {} }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const body = await req.json() as {
      enabled?: boolean
      titleAr?: string
      subtitleAr?: string
      products?: Array<string | number>
      packQuantity?: number
      packPrice?: number
      repeatable?: boolean
    }

    // On ne recopie que les champs attendus — pas de spread d'un corps de requête non filtré
    const data = {
      enabled: body.enabled === true,
      titleAr: (body.titleAr ?? '').trim(),
      subtitleAr: (body.subtitleAr ?? '').trim(),
      products: Array.isArray(body.products) ? body.products : [],
      packQuantity: Math.max(2, Math.floor(Number(body.packQuantity) || 2)),
      packPrice: Math.max(0, Math.round(Number(body.packPrice) || 0)),
      repeatable: body.repeatable !== false,
    }

    const payload = await getPayload({ config: configPromise })
    await payload.updateGlobal({ slug: 'pack-offer', data, overrideAccess: true })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[boutique-admin/offers POST]', err)
    return NextResponse.json({ error: 'Sauvegarde échouée' }, { status: 500 })
  }
}
