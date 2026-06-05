'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/translations'
import { PriceDisplay } from './PriceDisplay'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/stores/cart'
import { trackAddToCart } from '@/lib/tracking'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product } from '@/payload-types'

interface VariantSelectorProps {
  product: Product
}

// Sélecteur de variations couleur × taille — met à jour le prix/stock en temps réel
export function VariantSelector({ product }: VariantSelectorProps) {
  const addItem = useCartStore((s) => s.addItem)

  const variations = product.variations ?? []

  // Couleurs uniques
  const colors = useMemo(() => {
    const seen = new Set<string>()
    return variations
      .filter((v) => {
        if (seen.has(v.colorAr ?? '')) return false
        seen.add(v.colorAr ?? '')
        return true
      })
      .map((v) => ({ colorAr: v.colorAr ?? '', colorFr: v.colorFr ?? '' }))
  }, [variations])

  // Tailles uniques
  const sizes = useMemo(() => {
    const seen = new Set<string>()
    return variations
      .filter((v) => {
        if (seen.has(v.size ?? '')) return false
        seen.add(v.size ?? '')
        return true
      })
      .map((v) => v.size ?? '')
      .filter(Boolean)
  }, [variations])

  const [selectedColor, setSelectedColor] = useState<string | null>(
    colors.length === 1 ? colors[0].colorAr : null
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(
    sizes.length === 1 ? sizes[0] : null
  )
  const [added, setAdded] = useState(false)

  // Variation active selon couleur + taille choisies
  const activeVariation = useMemo(() => {
    if (!selectedColor || !selectedSize) return null
    return variations.find(
      (v) => v.colorAr === selectedColor && v.size === selectedSize
    ) ?? null
  }, [variations, selectedColor, selectedSize])

  // Index de la variation active
  const activeVariationIndex = useMemo(() => {
    if (!activeVariation) return -1
    return variations.findIndex(
      (v) => v.colorAr === selectedColor && v.size === selectedSize
    )
  }, [variations, activeVariation, selectedColor, selectedSize])

  // Tailles disponibles pour la couleur sélectionnée
  const availableSizesForColor = useMemo(() => {
    if (!selectedColor) return sizes
    return variations
      .filter((v) => v.colorAr === selectedColor)
      .map((v) => v.size ?? '')
      .filter(Boolean)
  }, [variations, selectedColor, sizes])

  const handleAddToCart = () => {
    if (!activeVariation || activeVariationIndex < 0) return

    // Image principale du produit
    const firstImage = product.images?.[0]?.image
    const imageUrl = toRelativeMediaUrl(
      typeof firstImage === 'object' && firstImage !== null
        ? (firstImage as { sizes?: { thumbnail?: { url?: string } }; url?: string })
            ?.sizes?.thumbnail?.url ??
          (firstImage as { url?: string }).url ??
          null
        : null
    )

    const effectivePrice = activeVariation.salePrice && activeVariation.salePrice > 0
      ? activeVariation.salePrice
      : (activeVariation.regularPrice ?? 0)

    addItem({
      productId: product.id,
      productSlug: product.slug ?? '',
      productNameAr: product.nameAr ?? '',
      productImage: imageUrl ?? null,
      variationIndex: activeVariationIndex,
      colorAr: activeVariation.colorAr ?? '',
      colorFr: activeVariation.colorFr ?? '',
      size: activeVariation.size ?? '',
      regularPrice: activeVariation.regularPrice ?? 0,
      salePrice: activeVariation.salePrice,
    })

    // Événement AddToCart vers les pixels marketing
    trackAddToCart(product.id, product.nameAr ?? '', effectivePrice, 1)

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // Prix à afficher : variation active ou fourchette
  const displayPrice = activeVariation
    ? { regular: activeVariation.regularPrice ?? 0, sale: activeVariation.salePrice }
    : null

  return (
    <div className="flex flex-col gap-5">
      {/* Prix */}
      {displayPrice ? (
        <PriceDisplay
          regularPrice={displayPrice.regular}
          salePrice={displayPrice.sale}
          size="lg"
        />
      ) : (
        <div className="text-sm text-foreground/50">{t.product.selectVariant}</div>
      )}

      {/* Stock */}
      {activeVariation && (
        <Badge variant={activeVariation.inStock ? 'instock' : 'outofstock'}>
          {activeVariation.inStock ? t.product.inStock : t.product.outOfStock}
        </Badge>
      )}

      {/* Sélecteur couleur */}
      {colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {t.product.selectColor}
            {selectedColor && <span className="me-2 text-foreground/60"> — {selectedColor}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map(({ colorAr }) => (
              <button
                key={colorAr}
                onClick={() => {
                  setSelectedColor(colorAr)
                  // Reset taille si non dispo dans nouvelle couleur
                  const sizesForNewColor = variations
                    .filter((v) => v.colorAr === colorAr)
                    .map((v) => v.size)
                  if (selectedSize && !sizesForNewColor.includes(selectedSize)) {
                    setSelectedSize(null)
                  }
                }}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm transition-all',
                  selectedColor === colorAr
                    ? 'border-[#E93D91] bg-[#E93D91] text-white'
                    : 'border-[#EBE6DF] text-foreground hover:border-[#E93D91]'
                )}
              >
                {colorAr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sélecteur taille */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t.product.selectSize}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = availableSizesForColor.includes(size)
              const varForSize = variations.find(
                (v) => v.colorAr === selectedColor && v.size === size
              )
              const inStock = varForSize?.inStock ?? false

              return (
                <button
                  key={size}
                  disabled={!available}
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    'relative rounded-xl border px-4 py-2 text-sm font-medium transition-all',
                    selectedSize === size
                      ? 'border-[#E93D91] bg-[#FFF0F7] text-[#E93D91]'
                      : available
                        ? 'border-[#EBE6DF] text-foreground hover:border-[#E93D91]'
                        : 'border-[#EBE6DF] text-foreground/30 cursor-not-allowed',
                    available && !inStock && selectedColor && 'opacity-50'
                  )}
                >
                  {size}
                  {/* Barre diagonale si rupture de stock */}
                  {available && !inStock && selectedColor && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="absolute h-px w-full rotate-45 bg-foreground/20" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bouton ajouter au panier */}
      <Button
        size="lg"
        onClick={handleAddToCart}
        disabled={!activeVariation || !activeVariation.inStock || added}
        className="w-full"
      >
        {added ? '✓ ' + t.product.addedToCart : t.product.addToCart}
      </Button>
    </div>
  )
}
