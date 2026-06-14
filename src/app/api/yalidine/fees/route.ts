import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'

/**
 * GET /api/yalidine/fees?wilayaCode=16&communeNameAr=باب الواد
 * Retourne les frais réels Yalidine pour la commune (utilisé dans le checkout).
 *
 * Cache serveur en mémoire par paire de wilayas (clé = fromCode_toCode).
 * TTL = 1 heure → Yalidine n'est appelé qu'une fois par paire/heure,
 * puis toutes les communes de la paire sont servies instantanément.
 */

type PerCommuneEntry = { commune_name: string; express_home: number | null; express_desk: number | null; economic_home: number | null; economic_desk: number | null }
type CachedFees = { perCommune: Record<string, PerCommuneEntry>; ts: number }

// Cache module-level (réinitialisé uniquement au redémarrage du serveur)
const feesCache = new Map<string, CachedFees>()
const CACHE_TTL = 60 * 60 * 1000 // 1 heure

function getCached(key: string): Record<string, PerCommuneEntry> | null {
  const entry = feesCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { feesCache.delete(key); return null }
  return entry.perCommune
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wilayaCode    = searchParams.get('wilayaCode')
  const communeNameAr = searchParams.get('communeNameAr')

  if (!wilayaCode || !communeNameAr) {
    return NextResponse.json({ home: null, desk: null, source: 'error' })
  }

  try {
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

    // ── Lecture du cache ──────────────────────────────────────────────────────
    const cacheKey = `${fromWilaya.code}_${toWilaya.code}`
    let perCommune = getCached(cacheKey)

    if (!perCommune) {
      // Cache miss → appel Yalidine (1 seul appel pour toute la wilaya)
      const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

      const fees = await Promise.race([
        client.getFees(parseInt(fromWilaya.code), parseInt(toWilaya.code)),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
      ])

      if (!fees) return NextResponse.json({ home: null, desk: null, source: 'timeout' })

      // Stocker toutes les communes de la wilaya dans le cache
      perCommune = fees.per_commune ?? {}
      feesCache.set(cacheKey, { perCommune, ts: Date.now() })
    }

    // ── Recherche de la commune dans les données (cache hit ou fresh) ─────────
    // 1) Correspondance exacte (insensible à la casse)
    // 2) Correspondance sans accents en repli (ex: "El Harrach" vs "El-Harrach")
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ')

    const communeEntries = Object.values(perCommune)
    const communeData =
      communeEntries.find(c => c.commune_name.toLowerCase() === commune.nameFr.toLowerCase()) ??
      communeEntries.find(c => normalize(c.commune_name) === normalize(commune.nameFr))

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
