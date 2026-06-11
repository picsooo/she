import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { mapYalidineStatusToOrder } from '@/lib/yalidine'

/**
 * POST /api/yalidine/webhook
 * Reçoit les mises à jour de statut en temps réel depuis Yalidine.
 *
 * Yalidine envoie un tableau de mises à jour :
 * [{ tracking, last_status, date_status, ... }]
 *
 * Configuration dans votre espace Yalidine → API → Webhook URL :
 * https://votre-domaine.com/api/yalidine/webhook
 */
export async function POST(req: NextRequest) {
  try {
    // Yalidine peut envoyer un tableau ou un objet unique
    const body = await req.json() as unknown

    const updates: Array<{ tracking: string; last_status?: string; status?: string }> =
      Array.isArray(body) ? body : [body]

    if (updates.length === 0) return NextResponse.json({ received: 0 })

    const payload = await getPayload({ config: configPromise })
    let processed = 0

    for (const update of updates) {
      const tracking    = update.tracking
      const newYalidineStatus = update.last_status ?? update.status

      if (!tracking || !newYalidineStatus) continue

      // Trouver la commande par son tracking Yalidine
      const result = await payload.find({
        collection: 'orders',
        where: { yalidineTrackingId: { equals: tracking } },
        limit: 1,
        overrideAccess: true,
      })

      const order = result.docs[0]
      if (!order) continue

      // Mapper le statut Yalidine vers notre statut commande
      const mappedStatus = mapYalidineStatusToOrder(newYalidineStatus)

      // Préparer les champs à mettre à jour
      const dataToUpdate: Record<string, unknown> = {
        yalidineStatus: newYalidineStatus,
      }

      // Changer le statut commande seulement si le mapping est défini
      // et que ce n'est pas un retour en arrière inutile
      if (mappedStatus && order.status !== mappedStatus) {
        // Ne jamais repasser en statut antérieur pour les statuts finaux
        const finalStatuses = ['delivered', 'cancelled']
        if (!finalStatuses.includes(order.status)) {
          dataToUpdate.status = mappedStatus
        }
      }

      await payload.update({
        collection: 'orders',
        id: order.id,
        data: dataToUpdate,
        overrideAccess: true,
      })

      processed++
    }

    return NextResponse.json({ received: updates.length, processed })
  } catch (err) {
    console.error('[yalidine/webhook]', err)
    // Yalidine attend un 200, sinon il retentera — répondre quand même 200
    return NextResponse.json({ error: 'Erreur traitement webhook' }, { status: 200 })
  }
}
