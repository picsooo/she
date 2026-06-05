import Link from 'next/link'
import Image from 'next/image'
import { getActiveRootCategories } from '@/lib/payload-client'
import { t } from '@/lib/translations'
import { HeaderClient } from './HeaderClient'
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

export async function Header() {
  const categoriesResult = await getActiveRootCategories().catch(() => ({ docs: [] }))
  const categories = categoriesResult.docs as Category[]

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* ── Bandeau promo fin en haut ───────────────────────────────── */}
      <div className="bg-[#1A1A1A] py-1.5 text-center text-[11px] font-medium text-white/70 tracking-wide hidden md:block">
        <span className="text-[#CEA060]">✦</span>
        {' '}الدفع عند الاستلام في جميع ولايات الجزائر{' '}
        <span className="text-[#CEA060]">✦</span>
        {' '}توصيل سريع{' '}
        <span className="text-[#CEA060]">✦</span>
      </div>

      {/* ── Corps principal du header ───────────────────────────────── */}
      <div className="bg-white border-b border-[#EBE6DF] shadow-sm">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative flex h-[72px] items-center">

            {/* ── Gauche : icône menu + nav desktop ─────────────────── */}
            <div className="flex items-center gap-4 flex-1">
              {/* Liens nav desktop */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/"
                  className="px-3 py-1.5 text-[13px] font-medium text-foreground/60 hover:text-foreground transition-colors rounded-lg hover:bg-[#F7F5F2]">
                  {t.nav.home}
                </Link>
                <Link href="/products"
                  className="px-3 py-1.5 text-[13px] font-medium text-foreground/60 hover:text-foreground transition-colors rounded-lg hover:bg-[#F7F5F2]">
                  {t.nav.catalog}
                </Link>
              </nav>
            </div>

            {/* ── Centre : Logo ──────────────────────────────────────── */}
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
              <Link href="/" className="flex flex-col items-center group">
                <div className="relative">
                  <Image
                    src="/branding/logo.png"
                    alt="She's Fit & Beauty"
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-105"
                    priority
                  />
                </div>
                {/* Nom sous le logo — desktop seulement */}
                <span className="hidden lg:block text-[9px] font-bold tracking-[0.25em] text-[#CEA060] uppercase leading-none mt-0.5">
                  Fit &amp; Beauty
                </span>
              </Link>
            </div>

            {/* ── Droite : recherche + panier + menu mobile ──────────── */}
            <div className="flex items-center justify-end flex-1">
              <HeaderClient categories={categories} />
            </div>
          </div>
        </div>

        {/* ── Barre catégories desktop (sous le header) ───────────── */}
        {categories.length > 0 && (
          <div className="hidden lg:block border-t border-[#EBE6DF]">
            <div className="mx-auto max-w-7xl px-4">
              <nav className="flex items-center justify-center gap-0 overflow-x-auto scrollbar-hide py-0">
                <Link href="/products"
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-foreground/50 hover:text-[#E93D91] transition-colors border-b-2 border-transparent hover:border-[#E93D91]">
                  🛍️ الكل
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-foreground/60 hover:text-[#E93D91] transition-colors whitespace-nowrap border-b-2 border-transparent hover:border-[#E93D91]"
                  >
                    <span className="text-sm leading-none">{CAT_ICONS[cat.nameAr ?? ''] ?? '🛍️'}</span>
                    <span>{cat.nameAr}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
