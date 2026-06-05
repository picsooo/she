'use client'

import Link from 'next/link'
import { useCartStore } from '@/stores/cart'
import { CartItem } from '@/components/cart/CartItem'
import { Button } from '@/components/ui/Button'
import { formatPrice, t } from '@/lib/translations'

// Page panier complète (/cart) — list + total + bouton checkout
export default function CartPage() {
  const { items, getTotalPrice, getTotalItems } = useCartStore()
  const total = getTotalPrice()
  const count = getTotalItems()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="section-title mb-8 text-2xl font-bold">
        {t.cart.title}
        {count > 0 && (
          <span className="ms-3 text-base text-foreground/50 font-normal">
            ({t.catalog.productsCount(count)})
          </span>
        )}
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <span className="text-6xl">🛍️</span>
          <p className="text-xl text-foreground/60">{t.cart.empty}</p>
          <Link href="/products">
            <Button>{t.cart.emptyCta}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Liste articles */}
          <div className="md:col-span-2">
            {items.map((item) => (
              <CartItem
                key={`${item.productId}-${item.variationIndex}`}
                item={item}
              />
            ))}

            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {t.cart.continueShopping}
            </Link>
          </div>

          {/* Récapitulatif */}
          <div className="rounded-2xl border border-[#EBE6DF] p-5 h-fit">
            <h2 className="mb-4 text-base font-semibold">{t.checkout.orderSummary}</h2>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">{t.cart.subtotal}</span>
                <span className="font-medium">{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">{t.checkout.shippingFee}</span>
                <span className="text-foreground/60">يُحدد عند الطلب</span>
              </div>
              <div className="my-2 h-px bg-[#EBE6DF]" />
              <div className="flex justify-between text-base font-bold">
                <span>{t.cart.total}</span>
                <span className="text-[#E93D91]">{formatPrice(total)}</span>
              </div>
            </div>

            <Link href="/checkout" className="mt-5 block">
              <Button size="lg" className="w-full">
                {t.cart.checkout}
              </Button>
            </Link>

            {/* Paiement à la livraison */}
            <p className="mt-3 text-center text-xs text-foreground/50">
              {t.checkout.cod} — {t.checkout.codDescription}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
