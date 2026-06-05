'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/stores/cart'
import { t } from '@/lib/translations'
import type { Category } from '@/payload-types'

interface HeaderClientProps {
  categories: Category[]
}

// Partie interactive du header — panier + menu mobile
// Séparé du Server Component Header pour éviter d'hydrater tout le header
export function HeaderClient({ categories }: HeaderClientProps) {
  const { getTotalItems, openDrawer } = useCartStore()
  const count = getTotalItems()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Bouton panier */}
      <button
        onClick={openDrawer}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-[#F7F5F2] transition-colors"
        aria-label={t.nav.cart}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E93D91] text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Bouton menu mobile */}
      <button
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-[#F7F5F2] transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="القائمة"
      >
        {mobileMenuOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <div className="absolute top-full start-0 end-0 bg-white border-b border-[#EBE6DF] shadow-lg z-50 p-4">
          <nav className="flex flex-col gap-1">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground hover:bg-[#F7F5F2]">
              {t.nav.home}
            </Link>
            <Link href="/products" onClick={() => setMobileMenuOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground hover:bg-[#F7F5F2]">
              {t.nav.catalog}
            </Link>
            {categories.slice(0, 8).map(cat => (
              <Link key={cat.id} href={`/products?category=${cat.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-2 text-sm text-foreground/70 hover:text-[#E93D91] hover:bg-[#FFF0F7]">
                {cat.nameAr}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
