import type { Metadata } from 'next'
import { getProducts, getCategories } from '@/lib/payload-client'
import { ProductCard } from '@/components/product/ProductCard'
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
    page?: string
    sort?: string
  }>
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentPage = Number(params.page ?? 1)
  const categoryFilter = params.category
  const sort = params.sort ?? '-createdAt'

  const [productsResult, categoriesResult] = await Promise.all([
    getProducts({
      limit: 24,
      page: currentPage,
      category: categoryFilter,
      sort,
    }).catch(() => ({ docs: [], totalPages: 1, totalDocs: 0 })),
    getCategories().catch(() => ({ docs: [] })),
  ])

  const products = productsResult.docs as Product[]
  const categories = categoriesResult.docs as Category[]
  const totalPages = (productsResult as { totalPages?: number }).totalPages ?? 1
  const totalDocs = (productsResult as { totalDocs?: number }).totalDocs ?? 0

  const sortOptions = [
    { value: '-createdAt', label: t.catalog.sortNewest },
    { value: 'variations.regularPrice', label: t.catalog.sortPriceAsc },
    { value: '-variations.regularPrice', label: t.catalog.sortPriceDesc },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Titre */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title text-2xl font-bold">{t.catalog.title}</h1>
          {totalDocs > 0 && (
            <p className="mt-1 text-sm text-foreground/50">
              {t.catalog.productsCount(totalDocs)}
            </p>
          )}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground/60">{t.catalog.sortBy}:</span>
          <div className="flex gap-1">
            {sortOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/products?${new URLSearchParams({ ...(categoryFilter ? { category: categoryFilter } : {}), sort: opt.value }).toString()}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-[#E93D91] text-white'
                    : 'bg-[#F7F5F2] text-foreground/70 hover:text-foreground'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filtres */}
        <aside className="hidden md:flex md:w-48 lg:w-56 flex-shrink-0 flex-col gap-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              {t.catalog.filterCategory}
            </h3>
            <div className="flex flex-col gap-1">
              <Link
                href="/products"
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  !categoryFilter
                    ? 'bg-[#FFF0F7] font-semibold text-[#E93D91]'
                    : 'text-foreground/70 hover:bg-[#F7F5F2]'
                }`}
              >
                الكل
              </Link>
              {categories
                .filter((c) => !(c.parent))
                .map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}${sort !== '-createdAt' ? `&sort=${sort}` : ''}`}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      categoryFilter === cat.id
                        ? 'bg-[#FFF0F7] font-semibold text-[#E93D91]'
                        : 'text-foreground/70 hover:bg-[#F7F5F2]'
                    }`}
                  >
                    {cat.nameAr}
                  </Link>
                ))}
            </div>
          </div>
        </aside>

        {/* Grille produits */}
        <div className="flex-1 min-w-0">
          {/* Filtres mobiles */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
            <Link
              href="/products"
              className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                !categoryFilter ? 'bg-[#E93D91] text-white' : 'bg-[#F7F5F2] text-foreground/70'
              }`}
            >
              الكل
            </Link>
            {categories.filter((c) => !(c.parent)).map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  categoryFilter === cat.id ? 'bg-[#E93D91] text-white' : 'bg-[#F7F5F2] text-foreground/70'
                }`}
              >
                {cat.nameAr}
              </Link>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-foreground/40">
              <p className="text-xl mb-2">😔</p>
              <p>{t.catalog.noResults}</p>
              <Link href="/products" className="mt-4 text-sm text-[#E93D91] hover:underline">
                {t.catalog.resetFilters}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/products?${new URLSearchParams({ ...(categoryFilter ? { category: categoryFilter } : {}), sort, page: String(currentPage - 1) }).toString()}`}
                  className="rounded-full border border-[#EBE6DF] px-4 py-2 text-sm hover:border-[#E93D91] transition-colors"
                >
                  {t.general.previous}
                </Link>
              )}
              <span className="text-sm text-foreground/60">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/products?${new URLSearchParams({ ...(categoryFilter ? { category: categoryFilter } : {}), sort, page: String(currentPage + 1) }).toString()}`}
                  className="rounded-full border border-[#EBE6DF] px-4 py-2 text-sm hover:border-[#E93D91] transition-colors"
                >
                  {t.general.next}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
