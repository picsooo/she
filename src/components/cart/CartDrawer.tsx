'use client'

import { useCartStore } from '@/stores/cart'
import { CartItem } from './CartItem'
import { Button } from '@/components/ui/Button'
import { formatPrice, t } from '@/lib/translations'
import Link from 'next/link'
import { useEffect } from 'react'

// Drawer panier — s'ouvre automatiquement à l'ajout d'un article
// Sidebar en RTL (s'ouvre depuis la gauche = fin de page en RTL)
export function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, getTotalItems, getTotalPrice } = useCartStore()

  const total = getTotalPrice()
  const count = getTotalItems()

  // Bloquer le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isDrawerOpen])

  if (!isDrawerOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel — depuis la gauche (fin = gauche en RTL) */}
      <aside
        className="fixed bottom-0 end-0 top-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label={t.cart.title}
      >
        {/* Header drawer */}
        <div className="flex items-center justify-between border-b border-[#EBE6DF] px-5 py-4">
          <h2 className="text-lg font-bold">
            {t.cart.title}
            {count > 0 && (
              <span className="ms-2 rounded-full bg-[#E93D91] px-2 py-0.5 text-xs text-white">
                {count}
              </span>
            )}
          </h2>
          <button
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/60 hover:bg-[#F7F5F2] transition-colors"
            aria-label={t.general.close}
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-12 text-center">
              <div className="text-5xl">🛍️</div>
              <p className="text-foreground/60">{t.cart.empty}</p>
              <Button variant="outline" size="sm" onClick={closeDrawer}>
                {t.cart.emptyCta}
              </Button>
            </div>
          ) : (
            <div>
              {items.map((item) => (
                <CartItem
                  key={`${item.productId}-${item.variationIndex}`}
                  item={item}
                  compact
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer drawer — total + boutons */}
        {items.length > 0 && (
          <div className="border-t border-[#EBE6DF] px-5 py-4 flex flex-col gap-3">
            <div className="flex justify-between text-base font-bold">
              <span>{t.cart.total}</span>
              <span className="text-[#E93D91]">{formatPrice(total)}</span>
            </div>

            <Link href="/checkout" onClick={closeDrawer}>
              <Button size="lg" className="w-full">
                {t.cart.checkout}
              </Button>
            </Link>

            <Link
              href="/cart"
              onClick={closeDrawer}
              className="text-center text-sm text-foreground/60 hover:text-foreground transition-colors underline underline-offset-2"
            >
              {t.cart.viewCart}
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
