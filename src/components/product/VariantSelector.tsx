'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { t } from '@/lib/translations'
import { PriceDisplay } from './PriceDisplay'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/stores/cart'
import { useFreeGiftStore } from '@/stores/freeGift'
import { trackAddToCart } from '@/lib/tracking'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product } from '@/payload-types'

interface VariantSelectorProps {
  product: Product
  // Indique si ce produit est un burkini — affiche la bannière cadeau et ajoute le chapeau
  isBurkini?: boolean
}

const norm = (v: string | null | undefined) => v ?? ''

// Sélecteur de variations couleur × taille — met à jour le prix/stock en temps réel
export function VariantSelector({ product, isBurkini }: VariantSelectorProps) {
  const addItems = useCartStore((s) => s.addItems)
  const cartItems = useCartStore((s) => s.items)
  // Chapeau cadeau lu depuis le store global (initialisé dans le layout)
  const freeGiftProduct = useFreeGiftStore((s) => s.chapeau)
  // N'ajouter le chapeau que si c'est un burkini ET que le chapeau existe
  const activeGift = isBurkini ? freeGiftProduct : null

  const variations = product.variations ?? []

  // ── Couleurs uniques ────────────────────────────────────────────────
  const colors = useMemo(() => {
    const seen = new Set<string>()
    const result: { colorAr: string; colorFr: string }[] = []
    for (const v of variations) {
      const key = norm(v.colorAr)
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ colorAr: key, colorFr: norm(v.colorFr) })
      }
    }
    return result
  }, [variations])

  // ── Tailles uniques (sans UNIQUE ni vide) ──────────────────────────
  const sizes = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const v of variations) {
      const s = norm(v.size)
      if (s && s !== 'UNIQUE' && !seen.has(s)) {
        seen.add(s)
        result.push(s)
      }
    }
    return result
  }, [variations])

  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return colors[0]?.colorAr ?? ''
  })

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    const firstColor = colors[0]?.colorAr ?? ''
    const sizesForFirstColor = variations
      .filter((v) => norm(v.colorAr) === firstColor && norm(v.size) && norm(v.size) !== 'UNIQUE')
      .map((v) => norm(v.size))
    return sizesForFirstColor[0] ?? (sizes[0] ?? '')
  })

  const [added, setAdded] = useState(false)

  // ── Variation active selon couleur + taille choisies ───────────────
  const activeVariation = useMemo(() => {
    if (variations.length === 0) return null
    if (variations.length === 1) return variations[0]
    return (
      variations.find(
        (v) => norm(v.colorAr) === selectedColor && norm(v.size) === selectedSize
      ) ??
      variations.find((v) => norm(v.colorAr) === selectedColor && v.inStock) ??
      variations.find((v) => norm(v.colorAr) === selectedColor) ??
      null
    )
  }, [variations, selectedColor, selectedSize])

  const activeVariationIndex = useMemo(() => {
    if (!activeVariation) return -1
    return variations.indexOf(activeVariation)
  }, [variations, activeVariation])

  const availableSizesForColor = useMemo(() => {
    return variations
      .filter((v) => norm(v.colorAr) === selectedColor)
      .map((v) => norm(v.size))
      .filter((s) => s && s !== 'UNIQUE')
  }, [variations, selectedColor])

  const handleAddToCart = () => {
    if (!activeVariation || activeVariationIndex < 0) return

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

    // Construire la liste des articles à ajouter (produit + cadeau éventuel)
    // Utilisation de addItems (atomique) pour éviter tout conflit de state Zustand
    const itemsToAdd: Parameters<typeof addItems>[0] = [
      {
        productId: String(product.id),
        productSlug: product.slug ?? '',
        productNameAr: product.nameAr ?? '',
        productImage: imageUrl ?? null,
        variationIndex: activeVariationIndex,
        colorAr: norm(activeVariation.colorAr),
        colorFr: norm(activeVariation.colorFr),
        size: norm(activeVariation.size),
        regularPrice: activeVariation.regularPrice ?? 0,
        salePrice: activeVariation.salePrice,
      },
    ]

    // Ajouter le chapeau UNIQUEMENT s'il n'est pas déjà dans le panier
    // (évite l'incrémentation de quantité lors des ré-ajouts)
    if (activeGift) {
      const chapeauDejaPresent = cartItems.some(
        (item) => item.productId === activeGift.productId
      )
      if (!chapeauDejaPresent) {
        itemsToAdd.push({
          productId: activeGift.productId,
          productSlug: activeGift.productSlug,
          productNameAr: `🎁 ${activeGift.productNameAr} (مجاني)`,
          productImage: activeGift.productImage,
          variationIndex: activeGift.variationIndex,
          colorAr: activeGift.colorAr,
          colorFr: '',
          size: activeGift.size,
          regularPrice: 0,
          salePrice: undefined,
        })
      }
    }

    addItems(itemsToAdd)

    trackAddToCart(product.id, product.nameAr ?? '', effectivePrice, 1)

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const displayPrice = activeVariation
    ? { regular: activeVariation.regularPrice ?? 0, sale: activeVariation.salePrice }
    : null

  const canAdd = !!activeVariation && !!activeVariation.inStock && activeVariationIndex >= 0

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
      {colors.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {t.product.selectColor}
            {selectedColor && <span className="me-2 text-foreground/60"> — {selectedColor}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map(({ colorAr }) => (
              <button
                key={colorAr || '__no_color__'}
                onClick={() => {
                  setSelectedColor(colorAr)
                  const sizesForNewColor = variations
                    .filter((v) => norm(v.colorAr) === colorAr)
                    .map((v) => norm(v.size))
                    .filter((s) => s && s !== 'UNIQUE')
                  if (selectedSize && !sizesForNewColor.includes(selectedSize)) {
                    setSelectedSize(sizesForNewColor[0] ?? '')
                  }
                }}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm transition-all',
                  selectedColor === colorAr
                    ? 'border-[#E93D91] bg-[#E93D91] text-white'
                    : 'border-[#EBE6DF] text-foreground hover:border-[#E93D91]'
                )}
              >
                {colorAr || '—'}
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
                (v) => norm(v.colorAr) === selectedColor && norm(v.size) === size
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
                    available && !inStock && 'opacity-50'
                  )}
                >
                  {size}
                  {available && !inStock && (
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

      {/* Notification cadeau gratuit */}
      {activeGift && (
        <div className="flex items-center gap-2 rounded-xl bg-[#FEF9F0] border border-[#CEA060]/40 px-3 py-2.5">
          <span className="text-lg">🎁</span>
          <div>
            <p className="text-xs font-bold text-[#9F6F3B]">
              شابو مجاني مع طلبكِ!
            </p>
            <p className="text-[10px] text-foreground/50">
              {activeGift.productNameAr} يضاف تلقائياً
            </p>
          </div>
        </div>
      )}

      {/* Bouton ajouter au panier */}
      <Button
        size="lg"
        onClick={handleAddToCart}
        disabled={!canAdd || added}
        className="w-full"
      >
        {added
          ? `✓ ${activeGift ? 'تمت الإضافة + الشابو المجاني!' : t.product.addedToCart}`
          : t.product.addToCart}
      </Button>
    </div>
  )
}
