import type { Metadata } from 'next'
import Link from 'next/link'
import { getActiveRootCategories, getProductsByCategory } from '@/lib/payload-client'
import { ProductCard } from '@/components/product/ProductCard'
import { HeroSlider } from '@/components/layout/HeroSlider'
import { t } from '@/lib/translations'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product, Category, Media } from '@/payload-types'

export const metadata: Metadata = {
  title: "She's Fit & Beauty — أزياء المرأة الجزائرية",
}

export const revalidate = 3600

// Dégradé de fallback affiché si le produit n'a pas encore d'image
const CATEGORY_GRADIENTS: Record<string, string> = {
  burkini:   'linear-gradient(135deg,#0d2347,#1e4d8c,#1a8fb8)',
  robe:      'linear-gradient(135deg,#3d0a22,#7a1040,#E93D91)',
  manteau:   'linear-gradient(135deg,#0a2010,#1a4020,#2d6e3e)',
  ensemble:  'linear-gradient(135deg,#3d1a00,#7a3a00,#c06018)',
  sac:       'linear-gradient(135deg,#2d1a00,#5e3a0a,#9f6f3b)',
  chaussure: 'linear-gradient(135deg,#2a0808,#5c1010,#a83030)',
  pareo:     'linear-gradient(135deg,#082020,#0d4040,#1a7a7a)',
  jupe:      'linear-gradient(135deg,#1a0830,#3d1060,#7a30b8)',
  chemise:   'linear-gradient(135deg,#0a1a10,#183a28,#2d6a4a)',
  pantalon:  'linear-gradient(135deg,#181818,#2a2a2a,#444444)',
  default:   'linear-gradient(135deg,#1a1010,#3d2020,#6b3030)',
}

const CATEGORY_ICONS: Record<string, string> = {
  'بوركيني': '🏊‍♀️', 'بوركيني شي': '🏊‍♀️',
  'فستان حجاب': '👗', 'فستان': '👗',
  'معاطف وسترات': '🧥', 'طقم': '👚',
  'حقائب': '👜', 'أحذية': '👟',
  'باريو': '🏖️', 'تنورة': '👘',
  'قميص': '👕', 'بنطال': '👖',
}

function getCategoryAssets(cat: Category) {
  const key = (cat.nameFr ?? '').toLowerCase()
  let gradient = CATEGORY_GRADIENTS['default']
  for (const k of Object.keys(CATEGORY_GRADIENTS)) {
    if (k !== 'default' && key.includes(k)) { gradient = CATEGORY_GRADIENTS[k]; break }
  }
  return { gradient }
}

function isBurkini(cat: Category) {
  return (cat.nameAr ?? '').includes('بوركيني') || (cat.nameFr ?? '').toLowerCase().includes('burkini')
}

export default async function HomePage() {
  const categoriesResult = await getActiveRootCategories().catch(() => ({ docs: [] }))
  const allCategories = categoriesResult.docs as Category[]

  // Charger 10 produits par catégorie (toutes les racines)
  const productResults = await Promise.all(
    allCategories.map((cat) =>
      getProductsByCategory(cat.id, 10).catch(() => ({ docs: [] as Product[] }))
    )
  )

  const categoriesWithData = allCategories.map((cat, i) => ({
    cat,
    products: productResults[i].docs as Product[],
    count: productResults[i].docs.length,
  }))

  // ── Tri : Burkini en premier, puis ≥ 2 produits décroissant, < 2 en bas
  // ── Filtre : catégories sans aucun produit sont exclues
  const sorted = [
    ...categoriesWithData.filter((c) => isBurkini(c.cat) && c.count > 0),
    ...categoriesWithData.filter((c) => !isBurkini(c.cat) && c.count >= 2).sort((a, b) => b.count - a.count),
    ...categoriesWithData.filter((c) => !isBurkini(c.cat) && c.count === 1),
    // c.count === 0 → exclus
  ]

  return (
    <>
      {/* ── Slider hero plein écran ───────────────────────────────────── */}
      <HeroSlider />

      {/* ── Cards catégories — défilement horizontal ─────────────────── */}
      {sorted.length > 0 && (
        <section className="py-12 overflow-hidden">
          {/* Titre */}
          <div className="mx-auto max-w-7xl px-4 mb-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-2 h-px w-10 bg-[#CEA060]" />
                <h2 className="text-2xl font-extrabold text-foreground md:text-3xl">
                  {t.home.categoriesSection}
                </h2>
              </div>
              <Link href="/products"
                className="text-sm font-medium text-[#E93D91] hover:text-[#D32D80] transition-colors">
                عرض الكل ←
              </Link>
            </div>
          </div>

          {/* Scroll horizontal avec snap */}
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 md:px-8 pb-2">
              {sorted.map(({ cat, products }) => {
                const { gradient } = getCategoryAssets(cat)
                const icon = CATEGORY_ICONS[cat.nameAr ?? ''] ?? '🛍️'

                // Prendre l'image du premier produit de la catégorie
                const firstProduct = products[0]
                const rawImage = firstProduct?.images?.[0]?.image
                const productImageUrl = toRelativeMediaUrl(
                  rawImage && typeof rawImage === 'object'
                    ? ((rawImage as Media).url ?? null)
                    : null
                )

                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="group relative flex-shrink-0 snap-start overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl"
                    style={{
                      width: '220px',
                      height: '300px',
                      background: gradient,   // fallback si pas d'image produit
                    }}
                  >
                    {/* Image du premier produit comme fond */}
                    {productImageUrl && (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${productImageUrl})` }}
                      />
                    )}

                    {/* Overlay dégradé bas → lisibilité du texte */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />

                    {/* Icône flottante centrée */}
                    <div className="absolute inset-0 flex items-center justify-center pb-14">
                      <span className="text-4xl drop-shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2">
                        {icon}
                      </span>
                    </div>

                    {/* Nom en bas */}
                    <div className="absolute bottom-0 inset-x-0 p-4 text-center">
                      <div className="mx-auto mb-2 h-px w-8 bg-[#CEA060] opacity-90 transition-all duration-300 group-hover:w-14" />
                      <p className="text-sm font-bold text-white leading-tight drop-shadow-md">
                        {cat.nameAr}
                      </p>
                      {cat.nameFr && (
                        <p className="mt-0.5 text-[10px] text-white/50 uppercase tracking-wider">
                          {cat.nameFr}
                        </p>
                      )}
                    </div>

                    {/* Badge survol */}
                    <div className="absolute top-3 end-3 rounded-full bg-[#E93D91] px-2.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 shadow-md">
                      تسوقي
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Sections produits par catégorie ──────────────────────────── */}
      {sorted.map(({ cat, products, count }, idx) => {
        const icon = CATEGORY_ICONS[cat.nameAr ?? ''] ?? '🛍️'

        return (
          <section key={cat.id} className={idx % 2 === 1 ? 'bg-[#F7F5F2]' : 'bg-white'}>
            <div className="mx-auto max-w-7xl px-4 py-12">
              {/* En-tête section */}
              <div className="mb-7 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{icon}</span>
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground md:text-2xl">
                      {cat.nameAr}
                    </h2>
                    {cat.nameFr && (
                      <p className="text-[11px] text-foreground/40 uppercase tracking-wide">
                        {cat.nameFr}
                      </p>
                    )}
                  </div>
                  <div className="hidden h-px w-12 bg-[#CEA060] sm:block" />
                  <span className="hidden sm:inline text-xs text-foreground/30 font-medium">
                    {count}+ منتج
                  </span>
                </div>

                <Link
                  href={`/products?category=${cat.id}`}
                  className="shrink-0 rounded-full border border-[#E93D91] px-4 py-1.5 text-xs font-semibold text-[#E93D91] transition-all hover:bg-[#E93D91] hover:text-white"
                >
                  {t.home.seeAll} ←
                </Link>
              </div>

              {/* Grille 2→3→4→5 colonnes */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Bouton voir plus */}
              <div className="mt-8 text-center">
                <Link
                  href={`/products?category=${cat.id}`}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#1A1A1A] px-9 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#E93D91] hover:scale-105 hover:shadow-lg"
                >
                  <span>عرض جميع منتجات {cat.nameAr}</span>
                  <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>
        )
      })}

      {/* État vide */}
      {sorted.length === 0 && (
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
