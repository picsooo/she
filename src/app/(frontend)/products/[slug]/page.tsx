import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, getRelatedProducts, getCategories, getProducts } from '@/lib/payload-client'
import { ProductGallery } from '@/components/product/ProductGallery'
import { VariantSelector } from '@/components/product/VariantSelector'
import { ProductCard } from '@/components/product/ProductCard'
import { ProductSidebar, CategorySidebar } from '@/components/product/ProductSidebar'
import { SocialProofNotification, LiveViewerCount, StockUrgency } from '@/components/product/SocialProof'
import { t } from '@/lib/translations'
import { TrackViewContent } from '@/components/analytics/TrackViewContent'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product, Media, Category } from '@/payload-types'

interface PageProps {
  params: Promise<{ slug: string }>
}

// FAQ rassurance — questions fréquentes en darija algérien
const FAQ_ITEMS = [
  {
    q: 'نقدر نبدل لوكان مايجينيش ؟',
    a: 'واه، عندنا سياسة إرجاع مرنة. تقدري تبدلي المنتج خلال 7 أيام من الاستلام.'
  },
  {
    q: 'نقدر نفتح الكولي قبل ما نخلص ؟',
    a: 'بالطبع! الدفع عند الاستلام — تفتحي وتشوفي المنتج قبل ما تخلصي.'
  },
  {
    q: 'اوقتاش تلحقني ؟',
    a: 'سنتواصل معكِ خلال 24 ساعة لتأكيد الطلب. التوصيل من 2 إلى 5 أيام.'
  },
  {
    q: 'هل المقاسات حقيقية ؟',
    a: 'نعم! المقاسات دقيقة ومطابقة. عندكِ شك؟ تواصلي معنا على واتساب ونساعدكِ.'
  },
]

// Numéro WhatsApp de la boutique
const WHATSAPP_NUMBER = '213550000000'

function isBurkiniProduct(product: Product, categories: Category[]): boolean {
  const productCatIds = (product.category ?? []).map((c) =>
    typeof c === 'object' ? c.id : c
  )
  return categories.some((cat) =>
    productCatIds.includes(cat.id) &&
    ((cat.nameAr ?? '').includes('بوركيني') || (cat.nameFr ?? '').toLowerCase().includes('burkini'))
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'منتج غير موجود' }
  return {
    title: product.nameAr ?? '',
    description: `${product.nameAr} — She's Fit & Beauty`,
  }
}

export const revalidate = 3600

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) notFound()

  // Images galerie
  const galleryImages = (product.images ?? [])
    .map((img) => {
      const media = img.image as Media | null
      if (!media || typeof media !== 'object') return null
      return {
        url: toRelativeMediaUrl((media as Media & { url?: string }).url) ?? '',
        alt: (media as Media & { alt?: string }).alt ?? product.nameAr ?? '',
        thumbnail:
          toRelativeMediaUrl((media as Media & { sizes?: { thumbnail?: { url?: string } } })?.sizes?.thumbnail?.url) ?? undefined,
      }
    })
    .filter((img): img is NonNullable<typeof img> => img !== null && img.url !== '')

  const categoryIds = (product.category ?? [])
    .map((c) => (typeof c === 'object' ? c.id : c))
    .filter((id): id is string => typeof id === 'string')

  // Chargement parallèle
  const [relatedResult, categoriesResult] = await Promise.all([
    getRelatedProducts(categoryIds, product.id, 8).catch(() => ({ docs: [] })),
    getCategories().catch(() => ({ docs: [] })),
  ])

  const related = relatedResult.docs as Product[]
  const allCategories = (categoriesResult.docs as Category[])
    .filter((c) => !c.parent)
    .map((c) => ({ id: c.id, nameAr: c.nameAr ?? '' }))

  const allCategoriesFull = categoriesResult.docs as Category[]

  // Détecter si c'est un burkini pour le cadeau chapeau
  const isBurkini = isBurkiniProduct(product, allCategoriesFull)

  // Si c'est un burkini, chercher le produit chapeau/شابو comme cadeau
  let freeGiftProduct = null
  if (isBurkini) {
    try {
      // Chercher le chapeau précisément — "cap" exclut volontairement car
      // il matche "Burkini Cap Horizon" qui n'est pas un chapeau
      const hatResult = await getProducts({
        where: {
          and: [
            {
              or: [
                { nameAr: { contains: 'شابو' } },
                { nameFr: { contains: 'Chapeau' } },
                { nameFr: { contains: 'chapeau' } },
                { nameFr: { equals: 'hat' } },
              ],
            },
            { status: { equals: 'published' } },
          ],
        },
        limit: 1,
      }).catch(() => ({ docs: [] }))

      const hatProduct = hatResult.docs[0] as Product | undefined
      if (hatProduct && hatProduct.variations && hatProduct.variations.length > 0) {
        const firstVar = hatProduct.variations[0]
        const hatImage = hatProduct.images?.[0]?.image
        freeGiftProduct = {
          productId: String(hatProduct.id),
          productSlug: hatProduct.slug ?? '',
          productNameAr: hatProduct.nameAr ?? 'شابو',
          productImage: toRelativeMediaUrl(
            hatImage && typeof hatImage === 'object'
              ? (hatImage as Media & { url?: string }).url ?? null
              : null
          ),
          variationIndex: 0,
          colorAr: firstVar.colorAr ?? '',
          size: firstVar.size ?? '',
        }
      }
    } catch {
      // pas de chapeau trouvé — pas de cadeau
    }
  }

  // Suggestions complémentaires pour les burkinis (sacs de plage + pareos)
  let burkiniCrossSell: Product[] = []
  if (isBurkini) {
    try {
      const crossSellCats = allCategoriesFull.filter((c) =>
        (c.nameAr ?? '').includes('باريو') ||
        (c.nameAr ?? '').includes('حقائب') ||
        (c.nameFr ?? '').toLowerCase().includes('pareo') ||
        (c.nameFr ?? '').toLowerCase().includes('sac')
      )
      if (crossSellCats.length > 0) {
        const crossResult = await getProducts({
          where: {
            category: { in: crossSellCats.map((c) => c.id) },
            status: { equals: 'published' },
          },
          limit: 4,
        }).catch(() => ({ docs: [] }))
        burkiniCrossSell = crossResult.docs as Product[]
      }
    } catch {
      // pas de cross-sell trouvé
    }
  }

  const minPrice = Math.min(
    ...(product.variations ?? [])
      .map((v) => v.salePrice && v.salePrice > 0 ? v.salePrice : (v.regularPrice ?? 0))
      .filter((p) => p > 0)
  ) || 0

  const inStockCount = (product.variations ?? []).filter((v) => v.inStock).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <TrackViewContent
        productId={product.id}
        productName={product.nameAr ?? ''}
        price={minPrice}
      />

      {/* Fil d'Ariane */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-foreground/50">
        <a href="/" className="hover:text-foreground transition-colors">{t.nav.home}</a>
        <span>/</span>
        <a href="/products" className="hover:text-foreground transition-colors">{t.nav.catalog}</a>
        <span>/</span>
        <span className="text-foreground">{product.nameAr}</span>
      </nav>

      {/* Bannière burkini si applicable */}
      {isBurkini && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#0d2347] to-[#1a8fb8] px-5 py-3 text-white">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-sm font-bold">عرض خاص: شابو مجاني مع البوركيني!</p>
            <p className="text-xs text-white/70">يضاف الشابو تلقائياً عند إضافة البوركيني للسلة</p>
          </div>
        </div>
      )}

      {/* Layout 3 colonnes */}
      <div className="flex gap-6 items-start">

        {/* ── Colonne gauche : catégories + infos marque ── */}
        <CategorySidebar categories={allCategories} currentCategoryIds={categoryIds} />

        {/* ── Contenu principal ── */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Galerie */}
            <ProductGallery images={galleryImages} productName={product.nameAr ?? ''} />

            {/* Infos + variantes */}
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-2xl font-bold text-foreground leading-snug">
                  {product.nameAr}
                </h1>
                {product.sku && (
                  <p className="mt-1 text-xs text-foreground/40">
                    {t.product.sku}: {product.sku}
                  </p>
                )}
              </div>

              <LiveViewerCount productId={product.id} />
              <StockUrgency inStockCount={inStockCount} />

              {/* Sélecteur variations + ajout panier */}
              <VariantSelector product={product} freeGiftProduct={freeGiftProduct} />

              {/* Réassurance */}
              <div className="flex flex-col gap-2 text-sm text-foreground/60 rounded-xl bg-[#F7F5F2] p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#CEA060]">🚚</span>
                  <span>{t.reassurance.delivery}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#CEA060]">💳</span>
                  <span>{t.reassurance.payment}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#CEA060]">✅</span>
                  <span>جودة مضمونة — إرجاع مجاني</span>
                </div>
              </div>

              {/* Description */}
              {product.descriptionAr && (
                <div className="rounded-2xl bg-[#F7F5F2] p-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground/70">الوصف</h3>
                  <div className="text-sm text-foreground/70 leading-relaxed">
                    {typeof product.descriptionAr === 'string'
                      ? product.descriptionAr
                      : 'وصف المنتج متاح في المتجر'}
                  </div>
                  {product.aiGenerated && (
                    <p className="mt-2 text-xs text-[#CEA060]">✦ وصف معتمد بمساعدة الذكاء الاصطناعي</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── FAQ rassurance ── */}
          <section className="mt-12">
            <div className="mb-5 flex items-center gap-3">
              <span className="text-2xl">💬</span>
              <h2 className="text-xl font-bold text-foreground">أسئلة شائعة</h2>
            </div>
            <div className="flex flex-col gap-3">
              {FAQ_ITEMS.map((item, idx) => (
                <FaqItem key={idx} question={item.q} answer={item.a} />
              ))}
            </div>

            {/* CTA WhatsApp */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 px-5 py-4">
              <span className="text-2xl">📱</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">سؤال آخر؟ تواصلي معنا مباشرة</p>
                <p className="text-xs text-foreground/60">سنردّ عليكِ في أقرب وقت</p>
              </div>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-xs font-bold text-white hover:bg-green-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                واتساب
              </a>
            </div>
          </section>

          {/* ── Cross-sell burkini (sacs de plage + pareos) ── */}
          {burkiniCrossSell.length > 0 && (
            <section className="mt-12">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-2xl">🏖️</span>
                <h2 className="section-title text-xl font-bold">أكملي إطلالة الشاطئ</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {burkiniCrossSell.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Produits similaires ── */}
          {related.length > 0 && (
            <section className="mt-12">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <h2 className="section-title text-xl font-bold">{t.product.relatedProducts}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {related.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Section "complète ton look" ── */}
          {related.length > 4 && (
            <section className="mt-10">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-2xl">👗</span>
                <h2 className="section-title text-xl font-bold">أكملي إطلالتكِ</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {related.slice(4, 8).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Colonne droite : suggestions + avis + livraison ── */}
        <ProductSidebar related={related} currentProductId={product.id} />
      </div>

      {/* Notification sociale flottante */}
      <SocialProofNotification productId={product.id} productName={product.nameAr ?? ''} />
    </div>
  )
}

// ── Composant FAQ accordéon ──────────────────────────────────────────────────
function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl border border-[#EBE6DF] bg-white overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-foreground list-none select-none hover:bg-[#F7F5F2] transition-colors">
        <span>{question}</span>
        <svg
          className="h-4 w-4 flex-shrink-0 text-[#E93D91] transition-transform duration-200 group-open:rotate-180"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="border-t border-[#EBE6DF] px-5 py-4 text-sm text-foreground/70 leading-relaxed">
        {answer}
      </div>
    </details>
  )
}
