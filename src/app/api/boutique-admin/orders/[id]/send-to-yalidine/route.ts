import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient, orderToYalidineParcel } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { requireAuth, unauthorizedResponse } from '@/lib/boutique-admin-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()
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
    // Algorithme en 7 passes de plus en plus tolérantes
    const normalizeCommune = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_']/g, ' ').trim()

    // Normalisation agressive : retire articles, préfixes courants, espaces multiples
    const deepNormalize = (s: string) =>
      normalizeCommune(s)
        .replace(/\b(el|les?|la|des?|du|ben|beni|bou|sidi|ain|oued|bir|ksar|bordj|djebel|mohamed|med)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    // Extrait les mots significatifs (≥3 caractères) pour un matching par tokens
    const getTokens = (s: string) =>
      normalizeCommune(s).split(/\s+/).filter(w => w.length >= 3)

    function findYalidineCommune(perCommune: Record<string, { commune_name: string }>, ourNameFr: string): string | null {
      const ourNorm = normalizeCommune(ourNameFr)
      const entries = Object.values(perCommune)

      // 1) Correspondance exacte (insensible casse)
      const pass1 = entries.find(c => c.commune_name.toLowerCase() === ourNameFr.toLowerCase())
      if (pass1) return pass1.commune_name

      // 2) Normalisé (sans accents/tirets)
      const pass2 = entries.find(c => normalizeCommune(c.commune_name) === ourNorm)
      if (pass2) return pass2.commune_name

      // 3) Notre nom contient le nom Yalidine (Yalidine supprime parfois les préfixes)
      const pass3 = entries.find(c => { const yn = normalizeCommune(c.commune_name); return yn.length >= 5 && ourNorm.includes(yn) })
      if (pass3) return pass3.commune_name

      // 4) Nom Yalidine contient notre nom
      const pass4 = entries.find(c => { const yn = normalizeCommune(c.commune_name); return ourNorm.length >= 5 && yn.includes(ourNorm) })
      if (pass4) return pass4.commune_name

      // 5) Normalisation agressive (retire articles/préfixes courants)
      const ourDeep = deepNormalize(ourNameFr)
      if (ourDeep.length >= 3) {
        const pass5 = entries.find(c => deepNormalize(c.commune_name) === ourDeep)
        if (pass5) return pass5.commune_name
      }

      // 6) Matching par tokens : tous les mots significatifs de notre nom dans celui de Yalidine
      const ourTokens = getTokens(ourNameFr)
      if (ourTokens.length > 0) {
        const pass6 = entries.find(c => {
          const yn = normalizeCommune(c.commune_name)
          return ourTokens.every(t => yn.includes(t))
        })
        if (pass6) return pass6.commune_name
        // Ou inversement : tous les tokens de Yalidine dans notre nom
        const pass6b = entries.find(c => {
          const yTokens = getTokens(c.commune_name)
          return yTokens.length > 0 && yTokens.every(t => ourNorm.includes(t))
        })
        if (pass6b) return pass6b.commune_name
      }

      // 7) Dernier recours : correspondance sans espaces (concaténation)
      const ourCompact = ourNorm.replace(/\s/g, '')
      if (ourCompact.length >= 5) {
        const pass7 = entries.find(c => normalizeCommune(c.commune_name).replace(/\s/g, '') === ourCompact)
        if (pass7) return pass7.commune_name
      }

      return null
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
      console.error('[send-to-yalidine] Refusé par Yalidine:', {
        order: order.orderNumber,
        communeOur: communeEntry.nameFr,
        communeSent: toCommuneNameFr,
        wilaya: wilayaEntry.nameFr,
        message: result.message,
      })
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
