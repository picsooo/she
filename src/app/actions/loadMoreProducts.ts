'use server'

import { getProducts } from '@/lib/payload-client'
import type { Product } from '@/payload-types'

// Server Action — charge la page suivante de produits pour le bouton "voir plus"
export async function loadMoreProducts(options: {
  page: number
  category?: string
  sort?: string
}): Promise<{ docs: Product[]; hasMore: boolean }> {
  const result = await getProducts({
    limit: 24,
    page: options.page,
    category: options.category,
    sort: options.sort ?? '-createdAt',
  }).catch(() => ({ docs: [], totalPages: 1 }))

  const totalPages = (result as { totalPages?: number }).totalPages ?? 1

  return {
    docs: result.docs as Product[],
    hasMore: options.page < totalPages,
  }
}
