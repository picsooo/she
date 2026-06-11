import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient, YalidineCenter } from '@/lib/yalidine'
import { WILAYAS } from '@/lib/algeria-geo'

/**
 * GET /api/yalidine/centers?wilayaCode=16
 * Retourne les bureaux Yalidine de la wilaya.
 * Proxy serveur pour éviter les erreurs CORS côté client.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wilayaCode = searchParams.get('wilayaCode')

  if (!wilayaCode) {
    return NextResponse.json({ centers: [] })
  }

  try {
    const payload  = await getPayload({ config: configPromise })
    const settings = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })

    if (!settings?.yalidineEnabled || !settings.yalidineApiId || !settings.yalidineApiToken) {
      return NextResponse.json({ centers: [] })
    }

    const wilaya = WILAYAS.find(w => w.code === wilayaCode.padStart(2, '0'))
    if (!wilaya) return NextResponse.json({ centers: [] })

    const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

    const result = await Promise.race([
      client.getCenters(parseInt(wilaya.code)),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ])

    if (!result) return NextResponse.json({ centers: [] })

    const centers: YalidineCenter[] = result.data ?? []
    return NextResponse.json({ centers })
  } catch (err) {
    console.error('[yalidine/centers]', err)
    return NextResponse.json({ centers: [] })
  }
}
