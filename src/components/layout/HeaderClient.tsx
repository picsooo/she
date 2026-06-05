'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/stores/cart'
import { t } from '@/lib/translations'
import type { Category } from '@/payload-types'

const CAT_ICONS: Record<string, string> = {
  'بوركيني': '🏊‍♀️',
  'بوركيني شي': '🏊‍♀️',
  'فستان حجاب': '👗',
  'فستان': '👗',
  'معاطف وسترات': '🧥',
  'طقم': '👚',
  'حقائب': '👜',
  'أحذية': '👟',
  'باريو': '🏖️',
  'تنورة': '👘',
  'قميص': '👕',
  'بنطال': '👖',
  'تونيك': '🩱',
  'عباية': '🧕',
  'قفطان': '👘',
  'إكسسوارات': '💎',
}

interface HeaderClientProps {
  categories: Category[]
}

export function HeaderClient({ categories }: HeaderClientProps) {
  const { getTotalItems, openDrawer } = useCartStore()
  const count = getTotalItems()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Bouton panier */}
        <button
          onClick={openDrawer}
          aria-label={t.nav.cart}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-[#F7F5F2] transition-colors"
        >
          <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {count > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#E93D91] text-[10px] font-bold text-white shadow-sm">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {/* Bouton menu hamburger — mobile uniquement */}
        <button
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-[#F7F5F2] transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="القائمة"
        >
          <span className="flex flex-col gap-[5px] w-5">
            <span className={`block h-[1.5px] bg-current transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
            <span className={`block h-[1.5px] bg-current transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-[1.5px] bg-current transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
          </span>
        </button>
      </div>

      {/* ── Drawer menu mobile ──────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Panel latéral */}
          <div className="fixed top-0 end-0 z-50 h-full w-[300px] bg-white shadow-2xl lg:hidden flex flex-col">
            {/* Header du panel */}
            <div className="flex items-center justify-between p-4 border-b border-[#EBE6DF]">
              <Image
                src="/branding/logo.png"
                alt="She's Fit & Beauty"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F7F5F2] text-foreground/50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-[#F7F5F2] transition-colors">
                🏠 {t.nav.home}
              </Link>
              <Link href="/products" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-foreground hover:bg-[#F7F5F2] transition-colors">
                🛍️ {t.nav.catalog}
              </Link>

              {/* Séparateur */}
              {categories.length > 0 && (
                <>
                  <div className="my-2 h-px bg-[#EBE6DF]" />
                  <p className="px-4 text-[11px] font-bold text-foreground/30 uppercase tracking-wider mb-1">
                    التصنيفات
                  </p>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-foreground/70 hover:text-[#E93D91] hover:bg-[#FFF0F7] transition-colors"
                    >
                      <span className="text-base leading-none w-6 text-center">
                        {CAT_ICONS[cat.nameAr ?? ''] ?? '🛍️'}
                      </span>
                      {cat.nameAr}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* Footer du panel */}
            <div className="p-4 border-t border-[#EBE6DF]">
              <p className="text-center text-[10px] text-foreground/30 tracking-widest uppercase">
                She&apos;s Fit &amp; Beauty
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Barre catégories scroll horizontal mobile ───────────────── */}
      {categories.length > 0 && (
        <div className="fixed top-[72px] start-0 end-0 z-30 bg-white border-b border-[#EBE6DF] overflow-x-auto scrollbar-hide lg:hidden">
          <div className="flex items-center gap-0 px-3 py-2 w-max">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-[#F7F5F2] px-3 py-1.5 text-[11px] font-semibold text-foreground/70 me-2">
              🛍️ الكل
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-foreground/60 hover:text-[#E93D91] transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-[#E93D91]"
              >
                <span className="leading-none">{CAT_ICONS[cat.nameAr ?? ''] ?? '🛍️'}</span>
                {cat.nameAr}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
