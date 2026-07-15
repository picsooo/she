'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createOrderSchema } from '@/lib/checkout-schema'
import { generateOrderNumber, getEffectivePrice } from '@/lib/utils'
import { getProductById, getNextOrderSequence } from '@/lib/payload-client'
import { sendOrderEmails } from '@/lib/email'
import { cookies, headers } from 'next/headers'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'
import { YalidineClient } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

type CreateOrderResult =
  | { success: true; orderNumber: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> }

// ── Cache fichier partagé avec /api/yalidine/fees ──────────────────────────────
// Même format et même dossier : évite d'appeler Yalidine en double
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

function loadFeesCache(): FileCache {
  try {
    if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as FileCache
  } catch { /* ignore */ }
  return {}
}

function saveFeesCache(cache: FileCache) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')
  } catch { /* ignore */ }
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_']/g, ' ').trim()

// Normalisation agressive : retire articles et préfixes courants
const deepNormalize = (s: string) =>
  normalize(s)
    .replace(/\b(el|les?|la|des?|du|ben|beni|bou|sidi|ain|oued|bir|ksar|bordj|djebel|mohamed|med)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const getTokens = (s: string) =>
  normalize(s).split(/\s+/).filter(w => w.length >= 3)

// Cherche une commune dans les données Yalidine (7 passes progressives)
function findCommuneData(entries: PerCommuneEntry[], communeNameFr: string): PerCommuneEntry | undefined {
  const ourNorm = normalize(communeNameFr)
  return (
    entries.find(c => c.commune_name.toLowerCase() === communeNameFr.toLowerCase()) ??
    entries.find(c => normalize(c.commune_name) === ourNorm) ??
    entries.find(c => { const yn = normalize(c.commune_name); return yn.length >= 5 && ourNorm.includes(yn) }) ??
    entries.find(c => { const yn = normalize(c.commune_name); return ourNorm.length >= 5 && yn.includes(ourNorm) }) ??
    // Normalisation agressive
    (() => { const d = deepNormalize(communeNameFr); return d.length >= 3 ? entries.find(c => deepNormalize(c.commune_name) === d) : undefined })() ??
    // Matching par tokens
    (() => {
      const t = getTokens(communeNameFr)
      if (t.length === 0) return undefined
      return entries.find(c => { const yn = normalize(c.commune_name); return t.every(w => yn.includes(w)) }) ??
             entries.find(c => { const yt = getTokens(c.commune_name); return yt.length > 0 && yt.every(w => ourNorm.includes(w)) })
    })() ??
    // Sans espaces
    (() => { const c = ourNorm.replace(/\s/g, ''); return c.length >= 5 ? entries.find(e => normalize(e.commune_name).replace(/\s/g, '') === c) : undefined })()
  )
}

// Calcule les frais de livraison en interrogeant Yalidine côté serveur
// Ne fait JAMAIS confiance au prix envoyé par le client — toujours recalculer
// Utilise le cache fichier partagé avec /api/yalidine/fees (24h TTL)
async function getShippingFeeFromYalidine(
  deliveryMode: 'home' | 'desk',
  wilayaCode: string,
  communeNameAr: string,
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings: any = await payload.findGlobal({ slug: 'delivery-settings', overrideAccess: true })

  // Fallback depuis les settings admin
  const fallbackFee = deliveryMode === 'desk'
    ? (settings?.defaultDeskDeliveryFee ?? 300)
    : (settings?.defaultHomeDeliveryFee ?? 400)

  // Si Yalidine désactivé ou pas de credentials, utiliser le fallback
  if (!settings?.yalidineEnabled || !settings.yalidineApiId || !settings.yalidineApiToken || !settings.yalidineFromWilayaName) {
    return fallbackFee
  }

  try {
    const fromWilaya = WILAYAS.find(w => w.nameFr.toLowerCase() === (settings.yalidineFromWilayaName as string).toLowerCase())
    const toWilaya = WILAYAS.find(w => w.code === wilayaCode.padStart(2, '0'))
    if (!fromWilaya || !toWilaya) return fallbackFee

    const commune = COMMUNES.find(c => c.wilayaCode === toWilaya.code && c.nameAr === communeNameAr)
    if (!commune) return fallbackFee

    const cacheKey = `${fromWilaya.code}_${toWilaya.code}`

    // 1) Vérifier le cache fichier (partagé avec /api/yalidine/fees, persiste entre redémarrages)
    const cache = loadFeesCache()
    const cached = cache[cacheKey]
    let perCommune: Record<string, PerCommuneEntry> | null = null

    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      perCommune = cached.perCommune
    } else {
      // 2) Cache expiré ou absent → appeler Yalidine avec retry
      const client = new YalidineClient(settings.yalidineApiId as string, settings.yalidineApiToken as string)

      // Timeout de 15s (plus généreux) avec 1 retry
      for (let attempt = 0; attempt < 2 && !perCommune; attempt++) {
        const fees = await Promise.race([
          client.getFees(parseInt(fromWilaya.code), parseInt(toWilaya.code)),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 15000)),
        ])
        if (fees) {
          perCommune = fees.per_commune ?? {}
          // Mettre en cache pour les prochaines commandes
          cache[cacheKey] = { perCommune, ts: Date.now() }
          saveFeesCache(cache)
        }
      }

      // 3) Yalidine n'a pas répondu mais on a un cache expiré → l'utiliser quand même
      if (!perCommune && cached) {
        console.warn('[createOrder] Yalidine timeout — utilisation du cache expiré')
        perCommune = cached.perCommune
      }
    }

    if (!perCommune) return fallbackFee

    const entries = Object.values(perCommune)
    const communeData = findCommuneData(entries, commune.nameFr)
    if (!communeData) return fallbackFee

    if (deliveryMode === 'desk') {
      return communeData.express_desk ?? communeData.economic_desk ?? fallbackFee
    }
    return communeData.express_home ?? communeData.economic_home ?? fallbackFee
  } catch (err) {
    console.error('[createOrder] Yalidine fee fetch failed, using fallback:', err)
    return fallbackFee
  }
}

// Auto-assigne la commande en round-robin strict :
// chaque nouvelle commande va à la confirmatrice suivante dans la liste ordonnée.
// Logique : on regarde la dernière commande assignée et on prend la suivante.
async function autoAssignConfirmatrice(payload: Awaited<ReturnType<typeof getPayload>>): Promise<string | undefined> {
  try {
    // Récupère les confirmatrices triées par email (ordre stable)
    const { docs: confirmatrices } = await payload.find({
      collection: 'users',
      where: {
        and: [
          { role: { equals: 'confirmatrice' } },
          { active: { not_equals: false } },
        ],
      },
      sort: 'email',
      limit: 20,
    })

    if (confirmatrices.length === 0) return undefined
    if (confirmatrices.length === 1) return confirmatrices[0].id as string

    // Trouve la dernière commande qui a une confirmatrice assignée
    const { docs: lastOrders } = await payload.find({
      collection: 'orders',
      where: { assignedTo: { exists: true } },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
    })

    if (lastOrders.length === 0) {
      // Première commande → confirmatrice 0
      return confirmatrices[0].id as string
    }

    const lastAssignedId = typeof lastOrders[0].assignedTo === 'object'
      ? (lastOrders[0].assignedTo as { id: string }).id
      : String(lastOrders[0].assignedTo)

    const confirmatriceIds = confirmatrices.map(u => String(u.id))
    const lastIdx = confirmatriceIds.indexOf(lastAssignedId)

    // Passe à la suivante (round-robin)
    const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % confirmatrices.length
    return confirmatrices[nextIdx].id as string
  } catch (err) {
    console.error('[autoAssign] Erreur:', err)
    return undefined
  }
}

// Server Action — crée une commande depuis le checkout
export async function createOrder(rawData: unknown): Promise<CreateOrderResult> {
  console.log('[createOrder] rawData reçu:', JSON.stringify(rawData, null, 2))

  const parsed = createOrderSchema.safeParse(rawData)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.errors.forEach((err) => {
      const rawPath = err.path.join('.')
      const field = rawPath.startsWith('customer.') ? rawPath.slice('customer.'.length) : rawPath
      if (!fieldErrors[field]) fieldErrors[field] = err.message
    })
    const errorMsg = Object.keys(fieldErrors).length > 0
      ? Object.values(fieldErrors)[0]
      : 'تحقق من المعلومات المدخلة'
    return { success: false, error: errorMsg, fieldErrors }
  }

  // Récupérer l'IP pour le rate limiting
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  // Max 5 commandes par IP par heure pour éviter le spam COD
  const rl = rateLimit(`checkout:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.allowed) {
    return { success: false, error: 'Trop de tentatives. Veuillez réessayer dans une heure.' }
  }

  const { customer, items } = parsed.data

  try {
    const payload = await getPayload({ config: configPromise })

    // Résoudre chaque article et vérifier le stock
    const resolvedItems: Array<{
      product: string
      productName: string
      variationIndex: number
      colorAr: string
      size: string
      quantity: number
      unitPrice: number
    }> = []

    let subtotal = 0

    for (const orderItem of items) {
      const product = await getProductById(orderItem.productId)
      if (!product) {
        return { success: false, error: `منتج غير موجود: ${orderItem.productId}` }
      }

      const variation = product.variations?.[orderItem.variationIndex]
      if (!variation) {
        return { success: false, error: `تشكيلة غير متوفرة للمنتج: ${product.nameAr}` }
      }

      // Les cadeaux offerts (isFreeGift) ont prix 0 — ne pas recalculer depuis la BDD
      const unitPrice = orderItem.isFreeGift
        ? 0
        : getEffectivePrice(variation.regularPrice ?? 0, variation.salePrice)

      // Les articles offerts (prix 0) ne sont pas soumis au contrôle de stock
      if (!variation.inStock && unitPrice > 0) {
        return {
          success: false,
          error: `المنتج "${product.nameAr}" (${variation.colorAr ?? ''} - ${variation.size ?? ''}) غير متوفر`,
        }
      }
      subtotal += unitPrice * orderItem.quantity

      resolvedItems.push({
        product: product.id,
        productName: product.nameAr ?? '',
        variationIndex: orderItem.variationIndex,
        colorAr: variation.colorAr ?? '',
        size: variation.size ?? '',
        quantity: orderItem.quantity,
        unitPrice,
      })
    }

    // Frais de livraison : TOUJOURS recalculer côté serveur via Yalidine
    // Ne jamais faire confiance au shippingFee du client (peut être le fallback 400 DA)
    const deliveryMode = customer.deliveryMode ?? 'home'
    const shippingFee = await getShippingFeeFromYalidine(
      deliveryMode,
      customer.wilayaCode,
      customer.commune,
      payload,
    )
    const total = subtotal + shippingFee

    // Numéro de commande unique
    const sequence = await getNextOrderSequence()
    const orderNumber = generateOrderNumber(sequence)

    // Auto-assignation à la confirmatrice
    const assignedTo = await autoAssignConfirmatrice(payload)

    // Génère un event_id stable pour la déduplication Meta Pixel / CAPI
    const metaEventId = randomUUID()

    // Cookies Meta (_fbp, _fbc) — capturés côté serveur pour améliorer le matching CAPI
    const cookieStore = await cookies()
    const fbp = cookieStore.get('_fbp')?.value ?? undefined
    const fbc = cookieStore.get('_fbc')?.value ?? undefined

    // Créer la commande
    await payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        customerName: customer.customerName,
        phone: customer.phone,
        email: customer.email || undefined,
        wilaya: customer.wilayaName,
        commune: customer.commune,
        address: customer.address,
        note: customer.note,
        items: resolvedItems,
        subtotal,
        shippingFee,
        total,
        deliveryMode,
        status: 'new',
        metaEventId,
        ...(fbp ? { fbp } : {}),
        ...(fbc ? { fbc } : {}),
        ...(assignedTo ? { assignedTo } : {}),
        ...(customer.trafficSource ? { trafficSource: customer.trafficSource } : {}),
      },
    })

    // Envoi emails (ne bloque pas la réponse — erreurs silencieuses)
    sendOrderEmails({
      orderNumber,
      customerName: customer.customerName,
      phone: customer.phone,
      email: customer.email || undefined,
      wilaya: customer.wilayaName,
      commune: customer.commune,
      address: customer.address,
      note: customer.note,
      deliveryMode,
      items: resolvedItems,
      subtotal,
      shippingFee,
      total,
    }).catch(err => console.error('[createOrder] sendOrderEmails error:', err))

    // Upsert client
    const existingCustomer = await payload.find({
      collection: 'customers',
      where: { phone: { equals: customer.phone } },
      limit: 1,
    })

    if (existingCustomer.docs.length > 0) {
      const existing = existingCustomer.docs[0]
      await payload.update({
        collection: 'customers',
        id: existing.id,
        data: {
          ordersCount: ((existing as { ordersCount?: number }).ordersCount ?? 0) + 1,
          wilaya: customer.wilayaName,
          commune: customer.commune,
        },
      })
    } else {
      await payload.create({
        collection: 'customers',
        data: {
          name: customer.customerName,
          phone: customer.phone,
          wilaya: customer.wilayaName,
          commune: customer.commune,
          address: customer.address,
          ordersCount: 1,
        },
      })
    }

    return { success: true, orderNumber }
  } catch (err) {
    console.error('Erreur création commande:', err)
    return { success: false, error: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مجدداً.' }
  }
}
