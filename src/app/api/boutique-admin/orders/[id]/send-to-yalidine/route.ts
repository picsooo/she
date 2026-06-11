import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getYalidineClient, orderToYalidineParcel } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'

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

    // Vérifier que la commande n'est pas déjà envoyée
    if (order.yalidineTrackingId) {
      return NextResponse.json({ error: 'Cette commande a déjà été envoyée à Yalidine (tracking: ' + order.yalidineTrackingId + ')' }, { status: 400 })
    }

    // Récupérer les paramètres de livraison
    const settingsRes = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/globals/delivery-settings`,
      { cache: 'no-store' }
    )
    if (!settingsRes.ok) return NextResponse.json({ error: 'Paramètres Yalidine introuvables' }, { status: 500 })
    const settings = await settingsRes.json()

    if (!settings.yalidineEnabled) return NextResponse.json({ error: 'Yalidine non activé dans les paramètres' }, { status: 400 })
    if (!settings.yalidineFromWilayaName) return NextResponse.json({ error: 'Wilaya d\'expédition non configurée dans les paramètres Yalidine' }, { status: 400 })

    // Mapper wilaya arabe → nom français (pour Yalidine)
    const wilayaEntry = WILAYAS.find(
      w => w.nameAr === order.wilaya || w.nameFr === order.wilaya
    )
    if (!wilayaEntry) {
      return NextResponse.json({ error: `Wilaya inconnue : "${order.wilaya}". Vérifiez le nom dans algeria-geo.ts.` }, { status: 400 })
    }

    // Mapper commune arabe → nom français (pour Yalidine)
    const communeEntry = COMMUNES.find(
      c => c.wilayaCode === wilayaEntry.code && (c.nameAr === order.commune || c.nameFr === order.commune)
    )
    if (!communeEntry) {
      return NextResponse.json({ error: `Commune inconnue : "${order.commune}" dans la wilaya "${order.wilaya}".` }, { status: 400 })
    }

    // Construire la liste des articles pour Yalidine
    const items = (order.items ?? []).map((item: {
      productName?: string
      colorAr?: string
      size?: string
      quantity?: number
    }) => ({
      name:     item.productName ?? 'Article',
      quantity: item.quantity ?? 1,
      color:    item.colorAr,
      size:     item.size,
    }))

    // Convertir la commande au format Yalidine
    const parcel = orderToYalidineParcel({
      orderNumber:      order.orderNumber,
      customerName:     order.customerName,
      phone:            order.phone,
      address:          order.address ?? '',
      fromWilayaNameFr: settings.yalidineFromWilayaName,
      toWilayaNameFr:   wilayaEntry.nameFr,
      toCommuneNameFr:  communeEntry.nameFr,
      total:            order.total,
      shippingFee:      order.shippingFee ?? 0,
      deliveryMode:     (order.deliveryMode as 'home' | 'desk') ?? 'home',
      items,
      note:             order.note,
    })

    // Appeler l'API Yalidine
    const client = await getYalidineClient()
    if (!client) return NextResponse.json({ error: 'Client Yalidine indisponible (credentials manquants ?)' }, { status: 500 })

    const result = await client.createParcel(parcel)

    if (!result.success) {
      return NextResponse.json({ error: `Yalidine a refusé le colis : ${result.message}` }, { status: 422 })
    }

    // Sauvegarder le tracking ID, l'URL du bordereau et la date d'envoi
    await payload.update({
      collection: 'orders',
      id,
      overrideAccess: true,
      data: {
        yalidineTrackingId: result.tracking ?? undefined,
        yalidineLabelUrl:   result.label ?? undefined,
        yalidineStatus:     'En préparation',
        yalidineSentAt:     new Date().toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      tracking: result.tracking,
      label:    result.label,
      labels:   result.labels,
      message:  'Colis créé avec succès chez Yalidine',
    })
  } catch (err) {
    console.error('[send-to-yalidine]', err)
    return NextResponse.json({ error: 'Erreur interne lors de l\'envoi à Yalidine' }, { status: 500 })
  }
}
