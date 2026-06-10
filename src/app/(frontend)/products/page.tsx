import type { Metadata } from 'next'
import { getProducts, getActiveRootCategories, getFeaturedProducts } from '@/lib/payload-client'
import { ProductsGrid } from '@/components/product/ProductsGrid'
import { CatalogPromoPanel, CatalogCategorySidebar } from '@/components/product/CatalogPromoPanel'
import { t } from '@/lib/translations'
import Link from 'next/link'
import type { Product, Category } from '@/payload-types'

export const metadata: Metadata = {
  title: 'المتجر',
  description: 'تصفحي مجموعتنا الكاملة من أزياء المرأة',
}

export const revalidate = 1800

interface PageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
  }>
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const categoryFilter = params.category
  const sort = params.sort ?? '-createdAt'

  const [productsResult, categoriesResult, featuredResult] = await Promise.all([
    getProducts({
      limit: 24,
      page: 1,
      category: categoryFilter,
      sort,
    }).catch(() => ({ docs: [], totalPages: 1, totalDocs: 0 })),
    getActiveRootCategories().catch(() => ({ docs: [] as unknown[] })),
    getFeaturedProducts(6).catch(() => ({ docs: [] })),
  ])

  const products = productsResult.docs as Product[]
  // getActiveRootCategories() retourne { docs: [...] } — extraire le tableau correctement
  const categories = ((categoriesResult as { docs?: unknown[] })?.docs ?? []) as Category[]
  const featured = featuredResult.docs as Product[]
  const totalPages = (productsResult as { totalPages?: number }).totalPages ?? 1
  const totalDocs = (productsResult as { totalDocs?: number }).totalDocs ?? 0

  const sortOptions = [
    { value: '-createdAt', label: t.catalog.sortNewest },
    { value: 'variations.regularPrice', label: t.catalog.sortPriceAsc },
    { value: '-variations.regularPrice', label: t.catalog.sortPriceDesc },
  ]

  const categoryList = categories.map((c) => ({ id: c.id, nameAr: c.nameAr ?? '' }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">

      {/* ── Titre + tri ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title text-2xl font-bold">{t.catalog.title}</h1>
          {totalDocs > 0 && (
            <p className="mt-1 text-sm text-foreground/50">
              {t.catalog.productsCount(totalDocs)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/60">{t.catalog.sortBy}:</span>
          <div className="flex gap-1 flex-wrap">
            {sortOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/products?${new URLSearchParams({ ...(categoryFilter ? { category: categoryFilter } : {}), sort: opt.value }).toString()}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-[#E93D91] text-white shadow-sm shadow-[#E93D91]/30'
                    : 'bg-[#F7F5F2] text-foreground/70 hover:text-foreground'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filtres mobiles ── */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden scrollbar-hide">
        <Link
          href="/products"
          className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
            !categoryFilter ? 'bg-[#E93D91] text-white' : 'bg-[#F7F5F2] text-foreground/70'
          }`}
        >
          🛍️ الكل
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.id}`}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
              categoryFilter === String(cat.id) ? 'bg-[#E93D91] text-white' : 'bg-[#F7F5F2] text-foreground/70'
            }`}
          >
            {cat.nameAr}
          </Link>
        ))}
      </div>

      {/* ── Layout 3 colonnes ── */}
      <div className="flex gap-5 items-start">

        {/* Colonne gauche — catégories animées */}
        <CatalogCategorySidebar
          categories={categoryList}
          activeCategory={categoryFilter}
          sort={sort}
        />

        {/* Centre — grille produits */}
        <div className="flex-1 min-w-0">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-foreground/40">
              <p className="text-4xl mb-4">😔</p>
              <p className="text-lg">{t.catalog.noResults}</p>
              <Link href="/products" className="mt-4 text-sm text-[#E93D91] hover:underline">
                {t.catalog.resetFilters}
              </Link>
            </div>
          ) : (
            <ProductsGrid
              key={`${categoryFilter ?? 'all'}-${sort}`}
              initialProducts={products}
              hasMore={totalPages > 1}
              category={categoryFilter}
              sort={sort}
            />
          )}
        </div>

        {/* Colonne droite — promo panel */}
        <CatalogPromoPanel featuredProducts={featured} />
      </div>
    </div>
  )
}
