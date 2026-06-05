'use client'

import { useState, useTransition } from 'react'
import { ProductCard } from './ProductCard'
import type { Product } from '@/payload-types'

interface ProductsLoadMoreProps {
  initialProducts: Product[]
  categoryId?: string
  pageSize?: number
}

// Grille de produits avec bouton "Voir plus" — charge les pages suivantes via l'API Payload
export function ProductsLoadMore({ initialProducts, categoryId, pageSize = 8 }: ProductsLoadMoreProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialProducts.length >= pageSize)
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    startTransition(async () => {
      const nextPage = page + 1
      const params = new URLSearchParams({
        limit: String(pageSize),
        page: String(nextPage),
        depth: '2',
        'where[status][equals]': 'published',
        sort: '-createdAt',
      })
      if (categoryId) params.set('where[category][contains]', categoryId)

      try {
        const res = await fetch(`/api/products?${params.toString()}`)
        if (!res.ok) return
        const data = await res.json() as { docs: Product[]; hasNextPage: boolean }
        setProducts((prev) => [...prev, ...data.docs])
        setPage(nextPage)
        setHasMore(data.hasNextPage)
      } catch {
        // Silently ignore — le bouton réapparaîtra
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Grille produits */}
      <div className="w-full grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Bouton Voir plus */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="rounded-full border border-[#EBE6DF] bg-white px-8 py-3 text-sm font-medium text-foreground hover:border-[#E93D91] hover:text-[#E93D91] transition-all disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جارٍ التحميل...
            </span>
          ) : (
            'عرض المزيد من المنتجات'
          )}
        </button>
      )}
    </div>
  )
}
