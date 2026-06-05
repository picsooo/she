import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductBySlug, getRelatedProducts } from '@/lib/payload-client'
import { ProductGallery } from '@/components/product/ProductGallery'
import { VariantSelector } from '@/components/product/VariantSelector'
import { ProductCard } from '@/components/product/ProductCard'
import { t } from '@/lib/translations'
import { TrackViewContent } from '@/components/analytics/TrackViewContent'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product, Media } from '@/payload-types'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Métadonnées dynamiques basées sur le produit
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

  // Construire les images pour la galerie
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

  // Catégories pour les produits similaires
  const categoryIds = (product.category ?? [])
    .map((c) => (typeof c === 'object' ? c.id : c))
    .filter((id): id is string => typeof id === 'string')

  const relatedResult = await getRelatedProducts(categoryIds, product.id, 4).catch(() => ({
    docs: [],
  }))
  const related = relatedResult.docs as Product[]

  // Prix min pour ViewContent (variation la moins chère)
  const minPrice = Math.min(
    ...(product.variations ?? [])
      .map((v) => v.salePrice && v.salePrice > 0 ? v.salePrice : (v.regularPrice ?? 0))
      .filter((p) => p > 0)
  ) || 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Pixel ViewContent — déclenché côté client au chargement de la page */}
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

      {/* Contenu principal */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Galerie */}
        <ProductGallery images={galleryImages} productName={product.nameAr ?? ''} />

        {/* Infos + variantes */}
        <div className="flex flex-col gap-6">
          {/* Titre */}
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

          {/* Sélecteur variations + ajout panier */}
          <VariantSelector product={product} />

          {/* Description */}
          {product.descriptionAr && (
            <div className="rounded-2xl bg-[#F7F5F2] p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">الوصف</h3>
              {/* Description peut être rich text ou texte simple selon le niveau de saisie */}
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

          {/* Réassurance */}
          <div className="flex flex-col gap-2 text-sm text-foreground/60">
            <div className="flex items-center gap-2">
              <span className="text-[#CEA060]">🚚</span>
              <span>{t.reassurance.delivery}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#CEA060]">💳</span>
              <span>{t.reassurance.payment}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Produits similaires */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6 text-xl font-bold">{t.product.relatedProducts}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
