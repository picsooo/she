import type { Metadata } from 'next'
import Link from 'next/link'
import { getFeaturedProducts, getRootCategories } from '@/lib/payload-client'
import { ProductsLoadMore } from '@/components/product/ProductsLoadMore'
import { t } from '@/lib/translations'
import type { Product, Category } from '@/payload-types'

export const metadata: Metadata = {
  title: "She's Fit & Beauty — أزياء المرأة الجزائرية",
}

export const revalidate = 3600

// Icônes emoji par catégorie arabe
const CATEGORY_ICONS: Record<string, string> = {
  'بوركيني': '🏊‍♀️',
  'بوركيني شي': '🏊‍♀️',
  'فستان حجاب': '👗',
  'فستان': '👗',
  'معاطف وسترات': '🧥',
  'طقم': '👚',
  'حقائب': '👜',
  'أحذية': '👟',
  'باريو': '🏖️',
  'تنورة': '👘',
  'قميص': '👕',
  'بنطال': '👖',
  'تونيك': '🩱',
  'عباية': '🧕',
  'قفطان': '👘',
  'إكسسوارات': '💎',
}

export default async function HomePage() {
  const [featuredResult, categoriesResult] = await Promise.all([
    getFeaturedProducts(8).catch(() => ({ docs: [] })),
    getRootCategories().catch(() => ({ docs: [] })),
  ])

  const products = featuredResult.docs as Product[]
  const categories = categoriesResult.docs as Category[]

  // Identifier la catégorie Burkini pour le highlight
  const burkiniCat = categories.find(
    (c) => (c.nameAr ?? '').includes('بوركيني') || (c.nameFr ?? '').toLowerCase().includes('burkini')
  )

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#F7F5F2] px-4 py-14 text-center md:py-20">
        <div className="mx-auto mb-5 h-px w-16 bg-[#CEA060]" />
        <h1 className="mb-3 text-3xl font-bold text-foreground md:text-5xl leading-tight">
          {t.home.heroTitle}
        </h1>
        <p className="mb-7 text-sm text-foreground/60 md:text-base">
          {t.home.heroSubtitle}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-full bg-[#E93D91] px-7 py-3 font-semibold text-white hover:bg-[#D32D80] transition-colors text-sm"
        >
          {t.home.heroCta}
          <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>

      {/* ── Catégories ────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#EBE6DF]" />
            <h2 className="text-base font-bold text-foreground/70 px-3">{t.home.categoriesSection}</h2>
            <span className="h-px flex-1 bg-[#EBE6DF]" />
          </div>

          {/* Grille catégories */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {/* Burkini en highlight — occupant 2 colonnes si présent */}
            {burkiniCat && (
              <Link
                href={`/products?category=${burkiniCat.id}`}
                className="col-span-2 row-span-1 flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#E93D91] to-[#D32D80] p-5 text-white text-center transition-all hover:shadow-lg hover:scale-[1.02]"
              >
                <span className="text-4xl">🏊‍♀️</span>
                <span className="font-bold text-sm">{burkiniCat.nameAr}</span>
                <span className="text-[10px] opacity-80 bg-white/20 rounded-full px-2 py-0.5">
                  كوليكشن الصيف ☀️
                </span>
              </Link>
            )}

            {/* Toutes les autres catégories */}
            {categories
              .filter((c) => c.id !== burkiniCat?.id)
              .map((cat) => {
                const icon = CATEGORY_ICONS[cat.nameAr ?? ''] ?? '🛍️'
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#EBE6DF] bg-white p-4 text-center transition-all hover:border-[#E93D91] hover:text-[#E93D91] hover:shadow-md"
                  >
                    <span className="text-3xl">{icon}</span>
                    <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">
                      {cat.nameAr}
                    </span>
                  </Link>
                )
              })}
          </div>
        </section>
      )}

      {/* ── Bandeau réassurance ───────────────────────────────────────── */}
      <section className="bg-[#F7F5F2] py-8">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {[
            { icon: '🚚', text: t.reassurance.delivery },
            { icon: '💳', text: t.reassurance.payment },
            { icon: '✨', text: t.reassurance.quality },
            { icon: '🔄', text: t.reassurance.returns },
          ].map(({ icon, text }) => (
            <div key={text} className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-medium text-foreground/70">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Produits en vedette ────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground section-title">
              {t.home.featuredProducts}
            </h2>
            <Link
              href="/products"
              className="text-sm font-medium text-[#E93D91] hover:text-[#D32D80] transition-colors"
            >
              {t.home.seeAll}
            </Link>
          </div>

          {/* ProductsLoadMore — gère la pagination côté client */}
          <ProductsLoadMore initialProducts={products} pageSize={8} />
        </section>
      )}

      {/* Message si aucun produit importé */}
      {products.length === 0 && (
        <section className="mx-auto max-w-lg px-4 py-24 text-center text-foreground/40">
          <p className="text-lg mb-2">لم يتم استيراد المنتجات بعد</p>
          <p className="text-sm">
            قم بتشغيل:{' '}
            <code className="bg-[#F7F5F2] px-2 py-0.5 rounded text-xs">npm run import:products</code>
          </p>
        </section>
      )}
    </>
  )
}
