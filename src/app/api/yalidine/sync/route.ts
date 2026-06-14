import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient, mapYalidineStatusToOrder } from '@/lib/yalidine'

/**
 * GET /api/yalidine/sync
 *
 * Interroge l'API Yalidine pour toutes les commandes non-finales
 * qui ont un numéro de suivi Yalidine, et met à jour leur statut si Yalidine
 * indique une livraison ou annulation.
 *
 * Utilisé en fallback (cron toutes les 15 min) en cas de webhook manqué.
 * Protégé par X-Sync-Key = PAYLOAD_SECRET.
 */
export async function GET(req: NextRequest) {
  // Vérification de la clé de sécurité
  const syncKey = req.headers.get('x-sync-key')
  if (syncKey !== process.env.PAYLOAD_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })

  // Charger les settings Yalidine directement via Payload (pas d'appel HTTP)
  const settings = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })
  if (!settings?.yalidineEnabled || !settings.yalidineApiId || !settings.yalidineApiToken) {
    return NextResponse.json({ skipped: true, reason: 'Yalidine non configuré ou désactivé' })
  }
  const yalidine = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

  // Récupère toutes les commandes non-finales avec un tracking Yalidine
  // (inclut 'confirmed' et 'shipping' — rattrape les commandes envoyées avant le fix du send-to-yalidine)
  let allOrders: Array<{ id: string; status: string; yalidineTrackingId?: string; orderNumber?: string }> = []
  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'orders',
      where: {
        and: [
          { status: { not_in: ['delivered', 'cancelled', 'returned'] } },
          { yalidineTrackingId: { exists: true } },
        ],
      },
      select: { id: true, status: true, yalidineTrackingId: true, orderNumber: true } as Record<string, true>,
      limit: 100,
      page,
      overrideAccess: true,
    })
    allOrders = allOrders.concat(result.docs as typeof allOrders)
    if (page >= result.totalPages) break
    page++
  }

  if (allOrders.length === 0) {
    return NextResponse.json({ synced: 0, updated: 0, message: 'Aucune commande en livraison avec tracking Yalidine' })
  }

  let updated = 0
  const errors: string[] = []
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
  // Yalidine : 50 req/min max → 1 req toutes les 1.5s pour rester sous le quota
  const RATE_DELAY = 1500

  for (const order of allOrders) {
    if (!order.yalidineTrackingId) continue
    try {
      const detail = await yalidine.getParcel(order.yalidineTrackingId)
      const parcel = detail.data?.[0]
      if (!parcel) { await delay(RATE_DELAY); continue }

      const mappedStatus = mapYalidineStatusToOrder(parcel.last_status)
      if (!mappedStatus || order.status === mappedStatus) { await delay(RATE_DELAY); continue }

      // Ne jamais reculer depuis un statut final
      const finalStatuses = ['delivered', 'cancelled', 'returned']
      if (finalStatuses.includes(order.status)) { await delay(RATE_DELAY); continue }

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: mappedStatus,
          yalidineStatus: parcel.last_status,
        },
        overrideAccess: true,
      })
      updated++
    } catch (err) {
      errors.push(`${order.yalidineTrackingId}: ${err instanceof Error ? err.message : 'Erreur'}`)
    }
    await delay(RATE_DELAY)
  }

  return NextResponse.json({
    synced: allOrders.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  })
}
