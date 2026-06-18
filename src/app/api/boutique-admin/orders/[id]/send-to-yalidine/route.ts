import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient, orderToYalidineParcel } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    // Récupérer la commande
    const order = await payload.findByID({ collection: 'orders', id, depth: 2, overrideAccess: true })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (order.yalidineTrackingId) {
      return NextResponse.json({ error: 'Cette commande a déjà été envoyée à Yalidine (tracking: ' + order.yalidineTrackingId + ')' }, { status: 400 })
    }

    // Récupérer les paramètres Yalidine directement via Payload (pas de HTTP interne)
    const settings = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })

    if (!settings?.yalidineEnabled) return NextResponse.json({ error: 'Yalidine non activé dans les paramètres' }, { status: 400 })
    if (!settings.yalidineApiId || !settings.yalidineApiToken) return NextResponse.json({ error: 'Credentials Yalidine manquants dans les paramètres' }, { status: 400 })
    if (!settings.yalidineFromWilayaName) return NextResponse.json({ error: 'Wilaya d\'expédition non configurée dans les paramètres Yalidine' }, { status: 400 })

    // Mapper wilaya arabe → nom français
    const wilayaEntry = WILAYAS.find(w => w.nameAr === order.wilaya || w.nameFr.toLowerCase() === (order.wilaya ?? '').toLowerCase())
    if (!wilayaEntry) {
      return NextResponse.json({ error: `Wilaya inconnue : "${order.wilaya}"` }, { status: 400 })
    }

    // Mapper commune arabe → nom français
    const communeEntry = COMMUNES.find(
      c => c.wilayaCode === wilayaEntry.code && (c.nameAr === order.commune || c.nameFr === order.commune)
    )
    if (!communeEntry) {
      return NextResponse.json({ error: `Commune inconnue : "${order.commune}" dans la wilaya "${order.wilaya}"` }, { status: 400 })
    }

    const items = (order.items ?? []).map((item: { productName?: string; colorAr?: string; size?: string; quantity?: number }) => ({
      name:     item.productName ?? 'Article',
      quantity: item.quantity ?? 1,
      color:    item.colorAr,
      size:     item.size,
    }))

    // subtotal = montant produits seuls (sans frais livraison)
    // Yalidine ajoute ses propres frais → COD final correct pour le client
    const subtotal = order.subtotal
      ?? (order.items ?? []).reduce(
          (sum: number, item: { unitPrice?: number; price?: number; quantity?: number }) =>
            sum + ((item.unitPrice ?? item.price ?? 0) * (item.quantity ?? 1)),
          0
        )

    // Trouver le nom de commune EXACT attendu par Yalidine
    // Les noms FR locaux peuvent différer : accents, tirets, préfixes ("Mohamed", "Sidi"...)
    // Algorithme en 4 passes de plus en plus tolérantes, identique à la route /fees
    const normalizeCommune = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_']/g, ' ').trim()

    function findYalidineCommune(perCommune: Record<string, { commune_name: string }>, ourNameFr: string): string | null {
      const ourNorm = normalizeCommune(ourNameFr)
      const entries = Object.values(perCommune)
      const found =
        entries.find(c => c.commune_name.toLowerCase() === ourNameFr.toLowerCase()) ??
        entries.find(c => normalizeCommune(c.commune_name) === ourNorm) ??
        entries.find(c => { const yn = normalizeCommune(c.commune_name); return yn.length >= 6 && ourNorm.includes(yn) }) ??
        entries.find(c => { const yn = normalizeCommune(c.commune_name); return ourNorm.length >= 6 && yn.includes(ourNorm) })
      return found?.commune_name ?? null
    }

    let toCommuneNameFr = communeEntry.nameFr
    try {
      const fromWilaya = WILAYAS.find(
        w => w.nameFr.toLowerCase() === (settings.yalidineFromWilayaName as string).toLowerCase()
      )
      if (fromWilaya) {
        // 1) Essayer le cache fichier (rapide, pas d'appel Yalidine)
        const cacheFile = join(process.cwd(), '.fees-cache', 'yalidine-fees.json')
        let perCommune: Record<string, { commune_name: string }> | null = null
        if (existsSync(cacheFile)) {
          const fileCache = JSON.parse(readFileSync(cacheFile, 'utf-8')) as Record<string, {
            perCommune: Record<string, { commune_name: string }>
          }>
          perCommune = fileCache[`${fromWilaya.code}_${wilayaEntry.code}`]?.perCommune ?? null
        }
        // 2) Si pas en cache, appeler l'API Yalidine
        if (!perCommune) {
          const tempClient = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)
          const fees = await Promise.race([
            tempClient.getFees(parseInt(fromWilaya.code), parseInt(wilayaEntry.code)),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 6000)),
          ])
          if (fees?.per_commune) perCommune = fees.per_commune as Record<string, { commune_name: string }>
        }
        if (perCommune) {
          const found = findYalidineCommune(perCommune, communeEntry.nameFr)
          if (found) toCommuneNameFr = found
        }
      }
    } catch {
      // Conserver communeEntry.nameFr comme repli
    }

    const parcel = orderToYalidineParcel({
      orderNumber:      order.orderNumber,
      customerName:     order.customerName,
      phone:            order.phone,
      address:          order.address ?? '',
      fromWilayaNameFr: settings.yalidineFromWilayaName as string,
      toWilayaNameFr:   wilayaEntry.nameFr,
      toCommuneNameFr,
      total:            order.total,
      subtotal,
      shippingFee:      order.shippingFee ?? 0,
      deliveryMode:     (order.deliveryMode as 'home' | 'desk') ?? 'home',
      items,
      note:             order.note,
    })

    // Construire le client Yalidine directement avec les credentials
    const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)
    const result = await client.createParcel(parcel)

    if (!result.success) {
      return NextResponse.json({ error: `Yalidine a refusé le colis : ${result.message}` }, { status: 422 })
    }

    await payload.update({
      collection: 'orders',
      id,
      overrideAccess: true,
      data: {
        status:             'shipping',        // passer en "En livraison" dès l'envoi à Yalidine
        yalidineTrackingId: result.tracking ?? undefined,
        yalidineLabelUrl:   result.label ?? undefined,
        yalidineStatus:     'En préparation',
        yalidineSentAt:     new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, tracking: result.tracking, label: result.label, labels: result.labels })
  } catch (err) {
    console.error('[send-to-yalidine]', err)
    return NextResponse.json({ error: 'Erreur interne lors de l\'envoi à Yalidine' }, { status: 500 })
  }
}
