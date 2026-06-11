import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'

/**
 * GET /api/yalidine/fees?wilayaCode=16&communeNameAr=باب الواد
 * Retourne les frais réels Yalidine pour la commune (utilisé dans le checkout).
 * Passe par Payload directement pour éviter le middleware coming-soon.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wilayaCode    = searchParams.get('wilayaCode')
  const communeNameAr = searchParams.get('communeNameAr')

  if (!wilayaCode || !communeNameAr) {
    return NextResponse.json({ home: null, desk: null, source: 'error' })
  }

  try {
    // Récupérer les paramètres via Payload directement (pas de HTTP interne)
    const payload  = await getPayload({ config: configPromise })
    const settings = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })

    if (!settings?.yalidineEnabled || !settings.yalidineFromWilayaName) {
      return NextResponse.json({ home: null, desk: null, source: 'disabled' })
    }
    if (!settings.yalidineApiId || !settings.yalidineApiToken) {
      return NextResponse.json({ home: null, desk: null, source: 'disabled' })
    }

    const fromWilaya = WILAYAS.find(w => w.nameFr.toLowerCase() === (settings.yalidineFromWilayaName as string).toLowerCase())
    if (!fromWilaya) return NextResponse.json({ home: null, desk: null, source: 'error' })

    const toWilaya = WILAYAS.find(w => w.code === wilayaCode.padStart(2, '0'))
    if (!toWilaya) return NextResponse.json({ home: null, desk: null, source: 'error' })

    const commune = COMMUNES.find(c => c.wilayaCode === toWilaya.code && c.nameAr === communeNameAr)
    if (!commune) return NextResponse.json({ home: null, desk: null, source: 'error' })

    const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

    const fees = await Promise.race([
      client.getFees(parseInt(fromWilaya.code), parseInt(toWilaya.code)),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ])

    if (!fees) return NextResponse.json({ home: null, desk: null, source: 'timeout' })

    const communeData = fees.per_commune?.[commune.nameFr]
    if (!communeData) return NextResponse.json({ home: null, desk: null, source: 'commune_not_found' })

    return NextResponse.json({
      home:   communeData.express_home   ?? communeData.economic_home,
      desk:   communeData.express_desk   ?? communeData.economic_desk,
      source: 'yalidine',
    })
  } catch (err) {
    console.error('[yalidine/fees]', err)
    return NextResponse.json({ home: null, desk: null, source: 'error' })
  }
}
