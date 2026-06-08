'use client'

import { useState, useTransition } from 'react'
import { ProductCard } from './ProductCard'
import { loadMoreProducts } from '@/app/actions/loadMoreProducts'
import type { Product } from '@/payload-types'

interface ProductsGridProps {
  initialProducts: Product[]
  hasMore: boolean
  category?: string
  sort?: string
}

// Grille produits avec bouton "voir plus" — pas de pagination, chargement Ajax
export function ProductsGrid({ initialProducts, hasMore: initialHasMore, category, sort }: ProductsGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(2)
  const [isPending, startTransition] = useTransition()

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadMoreProducts({ page, category, sort })
      setProducts((prev) => [...prev, ...result.docs])
      setHasMore(result.hasMore)
      setPage((p) => p + 1)
    })
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
        {products.map((product, i) => (
          <div key={product.id} className={`product-card-${Math.min(i, 11)}`}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="relative overflow-hidden rounded-full border-2 border-[#E93D91] px-10 py-3 text-sm font-semibold text-[#E93D91] transition-all hover:bg-[#E93D91] hover:text-white disabled:opacity-60"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#E93D91] border-t-transparent" />
                جارٍ التحميل...
              </span>
            ) : (
              'عرض المزيد'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
