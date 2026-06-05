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
}) {
  const payload = await getPayloadClient()

  const where: Where = {
    status: { equals: options?.status ?? 'published' },
  }

  if (options?.category) {
    where.category = { contains: options.category }
  }

  return payload.find({
    collection: 'products',
    where,
    limit: options?.limit ?? 24,
    page: options?.page ?? 1,
    sort: options?.sort ?? '-createdAt',
    depth: 2, // résoudre les relations (category, images)
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
