import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getYalidineClient } from '@/lib/yalidine'

/**
 * PATCH — Modifier un colis déjà envoyé à Yalidine.
 * Uniquement possible quand yalidineStatus = "En préparation" (avant ramassage).
 * Body attendu : { price?: number, product_list?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json() as { price?: number; product_list?: string }
    const payload = await getPayload({ config: configPromise })

    // Récupérer la commande
    const order = await payload.findByID({ collection: 'orders', id, overrideAccess: true })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (!order.yalidineTrackingId) {
      return NextResponse.json({ error: 'Cette commande n\'a pas encore été envoyée à Yalidine' }, { status: 400 })
    }

    // Vérifier que le statut Yalidine autorise la modification
    if (order.yalidineStatus !== 'En préparation') {
      return NextResponse.json({
        error: `Modification impossible : le colis est en statut "${order.yalidineStatus}". La modification n'est autorisée que quand le statut est "En préparation".`,
      }, { status: 400 })
    }

    // Valider le body
    const updateData: { price?: number; product_list?: string } = {}
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0 || body.price > 150000) {
        return NextResponse.json({ error: 'Prix invalide (0–150 000 DZD)' }, { status: 400 })
      }
      updateData.price = body.price
    }
    if (body.product_list !== undefined) {
      updateData.product_list = String(body.product_list).slice(0, 500)
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Aucune donnée à modifier' }, { status: 400 })
    }

    // Appeler l'API Yalidine PATCH
    const client = await getYalidineClient()
    if (!client) return NextResponse.json({ error: 'Client Yalidine indisponible' }, { status: 500 })

    const result = await client.updateParcel(order.yalidineTrackingId, updateData)

    // Mettre à jour le total local si le prix a changé
    if (body.price !== undefined) {
      await payload.update({
        collection: 'orders',
        id,
        overrideAccess: true,
        data: { total: body.price },
      })
    }

    return NextResponse.json({ success: true, parcel: result })
  } catch (err) {
    console.error('[update-yalidine]', err)
    return NextResponse.json({ error: 'Erreur lors de la modification chez Yalidine' }, { status: 500 })
  }
}
