'use client'

import Image from 'next/image'
import { useCartStore, type CartItem as CartItemType } from '@/stores/cart'
import { formatPrice, t } from '@/lib/translations'
import { getEffectivePrice } from '@/lib/utils'

interface CartItemProps {
  item: CartItemType
  compact?: boolean // mode drawer (compact) vs page panier (full)
}

// Article dans le panier — quantité modifiable, suppression, affichage variation
export function CartItem({ item, compact = false }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()

  const price = getEffectivePrice(item.regularPrice, item.salePrice)
  const total = price * item.quantity

  return (
    <div className="flex gap-3 py-3 border-b border-[#EBE6DF] last:border-0">
      {/* Image */}
      <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-[#F7F5F2]">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productNameAr}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-foreground/20 text-xs">
            ؟
          </div>
        )}
      </div>

      {/* Détails */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{item.productNameAr}</p>

        {/* Variation */}
        <p className="text-xs text-foreground/50">
          {item.colorAr && <span>{item.colorAr}</span>}
          {item.colorAr && item.size && <span> · </span>}
          {item.size && item.size !== 'UNIQUE' && <span>{item.size}</span>}
        </p>

        {/* Prix unitaire */}
        <p className="text-sm font-bold text-[#E93D91]">{formatPrice(price)}</p>

        {/* Contrôles quantité + suppression */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 rounded-full border border-[#EBE6DF] px-2 py-0.5">
            <button
              onClick={() => updateQuantity(item.productId, item.variationIndex, item.quantity - 1)}
              className="h-6 w-6 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              aria-label="تقليل الكمية"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.variationIndex, item.quantity + 1)}
              className="h-6 w-6 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              aria-label="زيادة الكمية"
            >
              +
            </button>
          </div>

          {!compact && (
            <p className="text-sm font-bold text-foreground">{formatPrice(total)}</p>
          )}

          <button
            onClick={() => removeItem(item.productId, item.variationIndex)}
            className="text-xs text-foreground/40 hover:text-red-400 transition-colors"
            aria-label={t.cart.remove}
          >
            {t.cart.remove}
          </button>
        </div>
      </div>
    </div>
  )
}
