'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { PriceDisplay } from './PriceDisplay'
import { t } from '@/lib/translations'
import { cn, toRelativeMediaUrl, getEffectivePrice } from '@/lib/utils'
import { useCartStore } from '@/stores/cart'
import { useFreeGiftStore } from '@/stores/freeGift'
import { trackAddToCart } from '@/lib/tracking'
import type { Product, Category } from '@/payload-types'

// Détecte si un produit appartient à la catégorie burkini (nom FR ou AR)
function isProductBurkini(product: Product): boolean {
  for (const c of (product.category ?? [])) {
    if (typeof c !== 'object' || c === null) continue
    const cat = c as Category
    if ((cat.nameAr ?? '').includes('بوركيني') || (cat.nameFr ?? '').toLowerCase().includes('burkini')) return true
    const parent = typeof cat.parent === 'object' && cat.parent !== null ? cat.parent as Category : null
    if (parent && ((parent.nameAr ?? '').includes('بوركيني') || (parent.nameFr ?? '').toLowerCase().includes('burkini'))) return true
  }
  return false
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const addItems = useCartStore((s) => s.addItems)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const chapeau = useFreeGiftStore((s) => s.chapeau)
  const variations = useMemo(() => product.variations ?? [], [product.variations])

  // ── Couleurs uniques ────────────────────────────────────────────────
  const colors = useMemo(() => {
    const seen = new Set<string>()
    const result: { colorAr: string; colorFr: string }[] = []
    for (const v of variations) {
      const key = v.colorAr ?? ''
      if (!seen.has(key)) { seen.add(key); result.push({ colorAr: key, colorFr: v.colorFr ?? '' }) }
    }
    return result
  }, [variations])

  // ── Tailles uniques (non vides) ─────────────────────────────────────
  const sizes = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const v of variations) {
      const s = v.size ?? ''
      if (s && s !== 'UNIQUE' && !seen.has(s)) { seen.add(s); result.push(s) }
    }
    return result
  }, [variations])

  // ── Sélection initiale ──────────────────────────────────────────────
  const [selectedColor, setSelectedColor] = useState<string>(colors[0]?.colorAr ?? '')
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] ?? '')
  const [added, setAdded] = useState(false)

  // ── Variation active ────────────────────────────────────────────────
  // Chercher la variation dont la couleur ET la taille correspondent
  // Les deux champs peuvent être '' (produit sans attribut)
  const activeVariation = useMemo(() => {
    if (variations.length === 0) return null
    if (variations.length === 1) return variations[0]
    return (
      variations.find(
        (v) => (v.colorAr ?? '') === selectedColor && (v.size ?? '') === selectedSize
      ) ??
      // Fallback : n'importe quelle variation en stock avec cette couleur
      variations.find((v) => (v.colorAr ?? '') === selectedColor && v.inStock) ??
      // Dernier fallback : première variation de cette couleur
      variations.find((v) => (v.colorAr ?? '') === selectedColor) ??
      null
    )
  }, [variations, selectedColor, selectedSize])

  const activeVariationIndex = useMemo(() => {
    if (!activeVariation) return -1
    return variations.indexOf(activeVariation)
  }, [variations, activeVariation])

  // ── Tailles disponibles pour la couleur active ─────────────────────
  const sizesForColor = useMemo(() => {
    if (!selectedColor && selectedColor !== '') return sizes
    return variations
      .filter((v) => (v.colorAr ?? '') === selectedColor)
      .map((v) => v.size ?? '')
      .filter((s) => s && s !== 'UNIQUE')
  }, [variations, selectedColor, sizes])

  // ── Prix ────────────────────────────────────────────────────────────
  const prices = variations
    .map((v) => ({ regular: v.regularPrice ?? 0, sale: v.salePrice ?? null }))
    .filter((p) => p.regular > 0)
  const minRegular = prices.length > 0 ? Math.min(...prices.map((p) => p.regular)) : 0
  const hasSale = prices.some((p) => p.sale && p.sale > 0 && p.sale < p.regular)
  const minSale = hasSale ? Math.min(...prices.filter((p) => p.sale && p.sale > 0).map((p) => p.sale!)) : null
  const discountPct = hasSale && minSale && minRegular ? Math.round(((minRegular - minSale) / minRegular) * 100) : null

  const displayPrice = activeVariation
    ? { regular: activeVariation.regularPrice ?? 0, sale: activeVariation.salePrice ?? null }
    : { regular: minRegular, sale: minSale }

  const overallInStock = variations.some((v) => v.inStock)

  // ── Image ───────────────────────────────────────────────────────────
  const firstImage = product.images?.[0]?.image
  const imageUrl = toRelativeMediaUrl(
    typeof firstImage === 'object' && firstImage !== null
      ? ((firstImage as { url?: string; sizes?: { thumbnail?: { url?: string } } })?.sizes?.thumbnail?.url ??
          (firstImage as { url?: string }).url)
      : null
  )

  // ── Ajout au panier ─────────────────────────────────────────────────
  const canAdd = !!activeVariation && !!activeVariation.inStock && activeVariationIndex >= 0

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canAdd) return
    const price = getEffectivePrice(activeVariation!.regularPrice ?? 0, activeVariation!.salePrice)
    const mainItem = {
      productId: String(product.id),
      productSlug: product.slug ?? '',
      productNameAr: product.nameAr ?? '',
      productImage: imageUrl ?? null,
      variationIndex: activeVariationIndex,
      colorAr: activeVariation!.colorAr ?? '',
      colorFr: activeVariation!.colorFr ?? '',
      size: activeVariation!.size ?? '',
      regularPrice: activeVariation!.regularPrice ?? 0,
      salePrice: activeVariation!.salePrice,
    }
    // Si c'est un burkini et que le chapeau est disponible, ajouter les deux d'un coup
    if (chapeau && isProductBurkini(product)) {
      addItems([
        mainItem,
        {
          productId: chapeau.productId,
          productSlug: chapeau.productSlug,
          productNameAr: `🎁 ${chapeau.productNameAr} (مجاني)`,
          productImage: chapeau.productImage,
          variationIndex: chapeau.variationIndex,
          colorAr: chapeau.colorAr,
          colorFr: '',
          size: chapeau.size,
          regularPrice: 0,
          salePrice: undefined,
        },
      ])
    } else {
      addItem(mainItem)
    }
    trackAddToCart(product.id, product.nameAr ?? '', price, 1)
    setAdded(true)
    setTimeout(() => { setAdded(false); openDrawer() }, 700)
  }

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-lg"
      style={{ border: '1px solid #EBE6DF' }}
    >
      {/* Image → page produit */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] block overflow-hidden bg-[#F7F5F2]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.nameAr ?? ''}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground/20">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute start-3 top-3 flex flex-col gap-1">
          {discountPct && discountPct > 0 && <Badge variant="promo">-{discountPct}%</Badge>}
          {!overallInStock && <Badge variant="outofstock">{t.product.outOfStock}</Badge>}
        </div>
      </Link>

      {/* Infos + sélecteurs */}
      <div className="flex flex-col gap-2 p-3">
        {/* Nom */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug hover:text-[#E93D91] transition-colors">
            {product.nameAr}
          </h3>
        </Link>

        {/* Prix */}
        {displayPrice.regular > 0 && (
          <PriceDisplay regularPrice={displayPrice.regular} salePrice={displayPrice.sale} size="sm" />
        )}

        {/* Sélecteur couleur (si plusieurs) */}
        {colors.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {colors.map(({ colorAr }) => (
              <button
                key={colorAr}
                onClick={() => {
                  setSelectedColor(colorAr)
                  // Réinitialiser taille si indisponible dans la nouvelle couleur
                  const available = variations
                    .filter((v) => (v.colorAr ?? '') === colorAr)
                    .map((v) => v.size ?? '')
                  if (!available.includes(selectedSize)) setSelectedSize(available[0] ?? '')
                }}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
                  selectedColor === colorAr
                    ? 'border-[#E93D91] bg-[#E93D91] text-white'
                    : 'border-[#EBE6DF] text-foreground/70 hover:border-[#E93D91]'
                )}
              >
                {colorAr || '—'}
              </button>
            ))}
          </div>
        )}

        {/* Sélecteur taille — toujours visible pour permettre le choix direct */}
        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sizes.map((size) => {
              const available = sizesForColor.includes(size)
              const varForSize = variations.find(
                (v) => (v.colorAr ?? '') === selectedColor && v.size === size
              )
              const sizeStock = varForSize?.inStock ?? false
              return (
                <button
                  key={size}
                  disabled={!available}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'rounded-lg border px-2.5 py-0.5 text-[11px] font-medium transition-all',
                    selectedSize === size
                      ? 'border-[#E93D91] bg-[#FFF0F7] text-[#E93D91]'
                      : available
                        ? 'border-[#EBE6DF] text-foreground/70 hover:border-[#E93D91]'
                        : 'border-[#EBE6DF] text-foreground/25 cursor-not-allowed',
                    available && !sizeStock && 'opacity-50'
                  )}
                >
                  {size}
                </button>
              )
            })}
          </div>
        )}

        {/* Bouton ajouter au panier */}
        <button
          onClick={handleAdd}
          disabled={!canAdd || added}
          className={cn(
            'mt-1 w-full rounded-xl py-2 text-sm font-semibold transition-all',
            added
              ? 'bg-green-500 text-white'
              : canAdd
                ? 'bg-[#E93D91] text-white hover:bg-[#D32D80] active:scale-95'
                : 'bg-[#F7F5F2] text-foreground/30 cursor-not-allowed'
          )}
        >
          {added ? '✓ ' + t.product.addedToCart : t.product.addToCart}
        </button>
      </div>
    </div>
  )
}
