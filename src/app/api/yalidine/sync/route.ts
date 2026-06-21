import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient, mapYalidineStatusToOrder } from '@/lib/yalidine'

/**
 * GET /api/yalidine/sync
 *
 * Interroge l'API Yalidine pour mettre à jour les statuts de commandes.
 *
 * PASSE 1 : vérifie individuellement les commandes non-finales qui ont déjà
 * un yalidineTrackingId dans notre base (fallback webhook manqué).
 *
 * PASSE 2 (sync inversé) : récupère TOUS les colis Yalidine paginés (max 10
 * pages = 1000 colis) et cherche dans notre DB les commandes correspondantes
 * via orderNumber = parcel.order_id. Rattrape les commandes dont le tracking
 * n'a jamais été sauvegardé ou dont le webhook a été complètement raté.
 *
 * Protégé par X-Sync-Key = PAYLOAD_SECRET. Lancé par le cron toutes les 15 min.
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

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
  // Passe 1 : 1 req/1.5s (50 req/min max)
  const RATE_DELAY_PASS1 = 1500
  // Passe 2 : on liste les colis (req de liste, moins lourde) → 200ms entre chaque page
  const RATE_DELAY_PASS2 = 200

  const errors: string[] = []
  let updated = 0
  let reverseUpdated = 0

  // ── PASSE 1 : commandes avec tracking connu ────────────────────────────────
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

  for (const order of allOrders) {
    if (!order.yalidineTrackingId) continue
    try {
      const detail = await yalidine.getParcel(order.yalidineTrackingId)
      const parcel = detail.data?.[0]
      if (!parcel) { await delay(RATE_DELAY_PASS1); continue }

      const mappedStatus = mapYalidineStatusToOrder(parcel.last_status)
      if (!mappedStatus || order.status === mappedStatus) { await delay(RATE_DELAY_PASS1); continue }

      // Ne jamais reculer depuis un statut final
      const finalStatuses = ['delivered', 'cancelled', 'returned']
      if (finalStatuses.includes(order.status)) { await delay(RATE_DELAY_PASS1); continue }

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
      errors.push(`Pass1 ${order.yalidineTrackingId}: ${err instanceof Error ? err.message : 'Erreur'}`)
    }
    await delay(RATE_DELAY_PASS1)
  }

  // ── PASSE 2 : sync inversé — liste de TOUS les colis Yalidine ────────────
  // Limite à 10 pages (1000 colis) pour éviter timeout
  const MAX_PAGES = 10
  let reversePage = 1
  let reverseChecked = 0

  while (reversePage <= MAX_PAGES) {
    let pageData: { data: Array<{ tracking: string; order_id: string; last_status: string }>; total_pages: number }
    try {
      pageData = await yalidine.listParcels(reversePage, 100)
    } catch (err) {
      errors.push(`Pass2 page ${reversePage}: ${err instanceof Error ? err.message : 'Erreur'}`)
      break
    }

    if (!pageData.data || pageData.data.length === 0) break

    for (const parcel of pageData.data) {
      // On ne traite que les colis avec un statut mappable (non-null)
      const mappedStatus = mapYalidineStatusToOrder(parcel.last_status)
      if (!mappedStatus) continue

      reverseChecked++

      // Chercher la commande dans notre DB par numéro de commande (= order_id Yalidine)
      try {
        const orderResult = await payload.find({
          collection: 'orders',
          where: { orderNumber: { equals: parcel.order_id } },
          limit: 1,
          select: { id: true, status: true } as Record<string, true>,
          overrideAccess: true,
        })
        const order = orderResult.docs[0] as { id: string; status: string } | undefined
        if (!order) continue

        // Ne pas reculer depuis un statut final
        const finalStatuses = ['delivered', 'cancelled', 'returned']
        if (finalStatuses.includes(order.status)) continue

        // Mettre à jour uniquement si le statut est différent
        if (order.status === mappedStatus) continue

        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            status: mappedStatus,
            yalidineStatus: parcel.last_status,
            // Sauvegarder le tracking s'il n'était pas encore présent
            yalidineTrackingId: parcel.tracking,
          },
          overrideAccess: true,
        })
        reverseUpdated++
      } catch (err) {
        errors.push(`Pass2 order ${parcel.order_id}: ${err instanceof Error ? err.message : 'Erreur'}`)
      }
    }

    if (reversePage >= pageData.total_pages) break
    reversePage++
    await delay(RATE_DELAY_PASS2)
  }

  return NextResponse.json({
    synced: allOrders.length,
    updated,
    reverse_synced: reverseChecked,
    reverse_updated: reverseUpdated,
    errors: errors.length > 0 ? errors : undefined,
  })
}
