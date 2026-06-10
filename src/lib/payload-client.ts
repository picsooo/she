import { getPayload } from 'payload'
import type { Where } from 'payload'
import configPromise from '@payload-config'
import type { Product, Category, Order, MarketingSettings } from '@/payload-types'

// Helper unique pour accéder à Payload depuis les Server Components
// Pattern HMR-safe recommandé par Payload 3.x
async function getPayloadClient() {
  return getPayload({ config: configPromise })
}

// ── Produits ──────────────────────────────────────────────────────────

export async function getProducts(options?: {
  limit?: number
  page?: number
  category?: string
  status?: string
  sort?: string
  where?: Where
}) {
  const payload = await getPayloadClient()

  // Utiliser le where personnalisé s'il est fourni, sinon construire le filtre standard
  // SQLite stocke les FK en INTEGER — convertir la string de l'URL en number pour éviter
  // le mismatch de type qui fait échouer silencieusement le filtre IN.
  const catId = options?.category
    ? (Number.isNaN(Number(options.category)) ? options.category : Number(options.category))
    : undefined

  // Inclure les sous-catégories pour que "Burkini" montre aussi les produits "Burkini SHE"
  let categoryIds: (string | number)[] | undefined
  if (catId !== undefined && !options?.where) {
    const childIds = await getChildCategoryIds(payload, catId)
    categoryIds = [catId, ...childIds]
  }

  const where: Where = options?.where ?? {
    status: { equals: options?.status ?? 'published' },
    ...(categoryIds !== undefined ? { category: { in: categoryIds } } : {}),
  }

  return payload.find({
    collection: 'products',
    where,
    limit: options?.limit ?? 24,
    page: options?.page ?? 1,
    sort: options?.sort ?? '-createdAt',
    depth: 2,
  })
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const payload = await getPayloadClient()

  const result = await payload.find({
    collection: 'products',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
    depth: 2,
  })

  return (result.docs[0] as Product) ?? null
}

export async function getProductById(id: string): Promise<Product | null> {
  const payload = await getPayloadClient()
  try {
    const product = await payload.findByID({
      collection: 'products',
      id,
      depth: 2,
    })
    return product as Product
  } catch {
    return null
  }
}

export async function getFeaturedProducts(limit = 8) {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    sort: '-createdAt',
    limit,
    depth: 2,
  })
}

// Helper : retourne les IDs des sous-catégories directes d'une catégorie parent.
// depth:0 → parent retourné comme ID brut (number), évite les problèmes de population
// sur les relations auto-référentielles (Payload 3.x + PostgreSQL).
// Retourne [] en cas d'erreur pour ne jamais casser l'appel parent.
async function getChildCategoryIds(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  parentId: string | number
): Promise<(string | number)[]> {
  try {
    // depth: 0 → parent renvoyé comme ID brut (number) — plus fiable que depth:1
    // qui peut retourner null/undefined sur les relations auto-référentielles
    const all = await payload.find({
      collection: 'categories',
      limit: 200,
      depth: 0,
    })
    const parentIdNum = Number(parentId)
    return all.docs
      .filter((c) => {
        const p = c.parent
        if (p === null || p === undefined) return false
        // depth:0 → p est un ID brut (number ou string)
        return Number(p) === parentIdNum
      })
      .map((c) => c.id)
  } catch {
    return []
  }
}

// Produits d'une catégorie donnée (pour les sections homepage par catégorie)
// Inclut les produits des sous-catégories (ex: "Burkini SHE" quand on demande "Burkini")
export async function getProductsByCategory(categoryId: string, limit = 4) {
  const payload = await getPayloadClient()
  const numId = Number.isNaN(Number(categoryId)) ? categoryId : Number(categoryId)
  const childIds = await getChildCategoryIds(payload, numId) // retourne [] en cas d'erreur
  return payload.find({
    collection: 'products',
    where: {
      status: { equals: 'published' },
      category: { in: [numId, ...childIds] },
    },
    limit,
    sort: '-createdAt',
    depth: 2,
  })
}

export async function getRelatedProducts(categoryIds: string[], excludeId: string, limit = 4) {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'products',
    where: {
      status: { equals: 'published' },
      id: { not_equals: excludeId },
      category: { in: categoryIds },
    },
    limit,
    depth: 2,
  })
}

// ── Catégories ────────────────────────────────────────────────────────

// Retourne uniquement les catégories racines qui ont au moins 1 produit publié
// Utilisée par le Header et la homepage pour ne pas afficher de catégories vides
export async function getActiveRootCategories() {
  const payload = await getPayloadClient()
  const cats = await payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    limit: 50,
    sort: 'nameAr',
    depth: 1,
  })
  // Vérifier en parallèle quelles catégories ont au moins 1 produit
  // On inclut les sous-catégories : une catégorie est "active" si elle OU ses enfants ont des produits
  const checks = await Promise.all(
    cats.docs.map(async (cat) => {
      const childIds = await getChildCategoryIds(payload, cat.id)
      const r = await payload.find({
        collection: 'products',
        where: { status: { equals: 'published' }, category: { in: [cat.id, ...childIds] } },
        limit: 1,
        depth: 0,
      })
      return { cat, hasProducts: r.totalDocs > 0 }
    })
  )
  return { docs: checks.filter((c) => c.hasProducts).map((c) => c.cat) }
}

export async function getCategories() {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'nameAr',
    depth: 1,
  })
}

export async function getRootCategories() {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'categories',
    where: { parent: { exists: false } },
    limit: 50,
    sort: 'nameAr',
    depth: 1,
  })
}

// ── Commandes ─────────────────────────────────────────────────────────

export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'orders',
    where: { orderNumber: { equals: orderNumber } },
    limit: 1,
    depth: 2,
  })
  return (result.docs[0] as Order) ?? null
}

// ── Paramètres marketing (Global) ────────────────────────────────────

export async function getMarketingSettings(): Promise<MarketingSettings | null> {
  const payload = await getPayloadClient()
  try {
    const settings = await payload.findGlobal({
      slug: 'marketing-settings',
    })
    return settings as unknown as MarketingSettings
  } catch {
    // Global pas encore initialisé (avant premier enregistrement admin)
    return null
  }
}

// Retourne les données du chapeau offert avec les burkinis (cadeau gratuit)
// Appelée depuis le layout — disponible sur toutes les pages frontend
export async function getChapeauGift(): Promise<{
  productId: string; productSlug: string; productNameAr: string
  productImage: string | null; variationIndex: number; colorAr: string; size: string
} | null> {
  try {
    const payload = await getPayloadClient()
    const result = await payload.find({
      collection: 'products',
      where: { slug: { equals: 'chapeau' }, status: { equals: 'published' } },
      limit: 1,
      depth: 1,
    })
    const hat = result.docs[0] as Product | undefined
    if (!hat || !hat.variations || hat.variations.length === 0) return null
    const allVars = hat.variations
    const inStockIdx = allVars.findIndex((v) => v.inStock)
    const chosenIdx = inStockIdx >= 0 ? inStockIdx : 0
    const chosenVar = allVars[chosenIdx]
    const hatImage = hat.images?.[0]?.image
    const rawUrl = hatImage && typeof hatImage === 'object'
      ? (hatImage as { url?: string }).url ?? null : null
    // Normaliser l'URL pour qu'elle soit relative (même comportement que toRelativeMediaUrl)
    const imageUrl = rawUrl?.startsWith('http') ? rawUrl : rawUrl ? rawUrl : null
    return {
      productId: String(hat.id),
      productSlug: hat.slug ?? '',
      productNameAr: hat.nameAr ?? 'شابو',
      productImage: imageUrl,
      variationIndex: chosenIdx,
      colorAr: chosenVar.colorAr ?? '',
      size: chosenVar.size ?? '',
    }
  } catch {
    return null
  }
}

export async function getNextOrderSequence(): Promise<number> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'orders',
    limit: 1,
    sort: '-createdAt',
  })
  // Extraire le numéro depuis le dernier orderNumber SHE-YYYY-NNNN
  if (result.docs.length > 0) {
    const last = result.docs[0] as Order
    const match = last.orderNumber?.match(/(\d+)$/)
    if (match) return parseInt(match[1], 10) + 1
  }
  return 1
}
