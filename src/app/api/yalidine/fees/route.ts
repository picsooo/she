import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { YalidineClient } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/yalidine/fees?wilayaCode=16&communeNameAr=باب الواد
 *
 * Cache fichier persistant par paire de wilayas (24h).
 * → Yalidine n'est appelé qu'une fois par paire/jour, survit aux redémarrages.
 * → Déduplication des requêtes simultanées via Map de promises en cours.
 */

type PerCommuneEntry = {
  commune_name: string
  express_home: number | null
  express_desk: number | null
  economic_home: number | null
  economic_desk: number | null
}
type FileCache = Record<string, { perCommune: Record<string, PerCommuneEntry>; ts: number }>

const CACHE_DIR  = join(process.cwd(), '.fees-cache')
const CACHE_FILE = join(CACHE_DIR, 'yalidine-fees.json')
const CACHE_TTL  = 24 * 60 * 60 * 1000 // 24 heures

// ── Cache fichier ──────────────────────────────────────────────────────────────
function loadFileCache(): FileCache {
  try {
    if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as FileCache
  } catch { /* ignore */ }
  return {}
}

function saveFileCache(cache: FileCache) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')
  } catch { /* ignore */ }
}

function getCachedPair(key: string): Record<string, PerCommuneEntry> | null {
  const cache = loadFileCache()
  const entry  = cache[key]
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { delete cache[key]; saveFileCache(cache); return null }
  return entry.perCommune
}

function setPairCache(key: string, perCommune: Record<string, PerCommuneEntry>) {
  const cache = loadFileCache()
  cache[key]  = { perCommune, ts: Date.now() }
  saveFileCache(cache)
}

// ── Déduplication des requêtes en vol simultanées ─────────────────────────────
// Si 5 clients demandent la même wilaya en même temps, un seul appel Yalidine part.
const inFlight = new Map<string, Promise<Record<string, PerCommuneEntry> | null>>()

// ── Handler ────────────────────────────────────────────────────────────────────
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

    const cacheKey = `${fromWilaya.code}_${toWilaya.code}`

    // 1) Vérifier le cache fichier (persiste entre les redémarrages)
    let perCommune = getCachedPair(cacheKey)

    if (!perCommune) {
      // 2) Dédupliquer : si une requête Yalidine est déjà en cours pour cette paire, attendre
      if (!inFlight.has(cacheKey)) {
        const client = new YalidineClient(
          settings.yalidineApiId as string,
          settings.yalidineApiToken as string
        )
        const promise = Promise.race([
          client.getFees(parseInt(fromWilaya.code), parseInt(toWilaya.code)),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
        ]).then(fees => {
          inFlight.delete(cacheKey)
          if (!fees) return null
          const pc = fees.per_commune ?? {}
          setPairCache(cacheKey, pc) // persisté sur disque
          return pc
        }).catch(() => { inFlight.delete(cacheKey); return null })

        inFlight.set(cacheKey, promise)
      }

      perCommune = await inFlight.get(cacheKey)!
    }

    if (!perCommune) return NextResponse.json({ home: null, desk: null, source: 'timeout' })

    // Recherche commune — 7 passes de plus en plus tolérantes
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_']/g, ' ').trim()

    // Normalisation agressive : retire articles, préfixes courants
    const deepNorm = (s: string) =>
      normalize(s)
        .replace(/\b(el|les?|la|des?|du|ben|beni|bou|sidi|ain|oued|bir|ksar|bordj|djebel|mohamed|med)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const getTokens = (s: string) =>
      normalize(s).split(/\s+/).filter(w => w.length >= 3)

    const ourNorm   = normalize(commune.nameFr)
    const entries   = Object.values(perCommune)

    const communeData =
      // 1) Correspondance exacte (insensible à la casse)
      entries.find(c => c.commune_name.toLowerCase() === commune.nameFr.toLowerCase()) ??
      // 2) Normalisé (sans accents/tirets)
      entries.find(c => normalize(c.commune_name) === ourNorm) ??
      // 3) Nom Yalidine contenu dans notre nom FR
      entries.find(c => { const yn = normalize(c.commune_name); return yn.length >= 5 && ourNorm.includes(yn) }) ??
      // 4) Notre nom FR contenu dans le nom Yalidine
      entries.find(c => { const yn = normalize(c.commune_name); return ourNorm.length >= 5 && yn.includes(ourNorm) }) ??
      // 5) Normalisation agressive (sans articles/préfixes)
      (() => { const d = deepNorm(commune.nameFr); return d.length >= 3 ? entries.find(c => deepNorm(c.commune_name) === d) : undefined })() ??
      // 6) Matching par tokens
      (() => {
        const t = getTokens(commune.nameFr)
        if (t.length === 0) return undefined
        return entries.find(c => { const yn = normalize(c.commune_name); return t.every(w => yn.includes(w)) }) ??
               entries.find(c => { const yt = getTokens(c.commune_name); return yt.length > 0 && yt.every(w => ourNorm.includes(w)) })
      })() ??
      // 7) Sans espaces (concaténation)
      (() => { const c = ourNorm.replace(/\s/g, ''); return c.length >= 5 ? entries.find(e => normalize(e.commune_name).replace(/\s/g, '') === c) : undefined })()

    if (!communeData) return NextResponse.json({ home: null, desk: null, source: 'commune_not_found' })

    return NextResponse.json({
      home:            communeData.express_home ?? communeData.economic_home,
      desk:            communeData.express_desk ?? communeData.economic_desk,
      source:          'yalidine',
      yalidineCommuneName: communeData.commune_name,  // nom exact attendu par Yalidine
    })
  } catch (err) {
    console.error('[yalidine/fees]', err)
    return NextResponse.json({ home: null, desk: null, source: 'error' })
  }
}
