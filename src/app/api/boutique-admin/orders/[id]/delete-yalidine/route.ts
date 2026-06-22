import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient } from '@/lib/yalidine'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

/**
 * DELETE /api/boutique-admin/orders/[id]/delete-yalidine
 * Supprime le colis chez Yalidine et efface les champs tracking sur la commande.
 * Seulement possible si yalidineStatus = "En préparation" (avant ramassage).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    const order = await payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (!order.yalidineTrackingId) {
      return NextResponse.json({ error: 'Cette commande n\'a pas été envoyée à Yalidine' }, { status: 400 })
    }

    const settings = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })
    if (!settings?.yalidineEnabled || !settings.yalidineApiId || !settings.yalidineApiToken) {
      return NextResponse.json({ error: 'Yalidine non configuré' }, { status: 400 })
    }

    const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

    try {
      await client.deleteParcel(order.yalidineTrackingId as string)
    } catch (err) {
      // Yalidine peut retourner une erreur si le colis n'est plus supprimable
      console.error('[delete-yalidine] Erreur API Yalidine:', err)
      return NextResponse.json({ error: 'Yalidine a refusé la suppression (colis déjà ramassé ?)' }, { status: 422 })
    }

    // Effacer les champs Yalidine sur la commande
    await payload.update({
      collection: 'orders',
      id,
      overrideAccess: true,
      data: {
        yalidineTrackingId: null,
        yalidineLabelUrl:   null,
        yalidineStatus:     null,
        yalidineSentAt:     null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-yalidine]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
