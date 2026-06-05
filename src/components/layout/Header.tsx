import Link from 'next/link'
import Image from 'next/image'
import { getRootCategories } from '@/lib/payload-client'
import { t } from '@/lib/translations'
import { HeaderClient } from './HeaderClient'
import type { Category } from '@/payload-types'

// Icônes par catégorie (mappées sur nameAr)
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

// Header Server Component — charge les catégories depuis Payload
export async function Header() {
  const categoriesResult = await getRootCategories().catch(() => ({ docs: [] }))
  const categories = categoriesResult.docs as Category[]

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#EBE6DF]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/branding/logo.png"
            alt="She's Fit & Beauty"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            priority
          />
        </Link>

        {/* Navigation catégories — desktop */}
        <nav className="hidden md:flex items-center gap-0 flex-1 overflow-hidden">
          <Link
            href="/"
            className="flex-shrink-0 px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            {t.nav.home}
          </Link>

          {/* Séparateur */}
          <span className="h-4 w-px bg-[#EBE6DF] mx-0.5 flex-shrink-0" />

          {/* Catégories avec icônes — jusqu'à 6 */}
          {categories.slice(0, 6).map((cat, idx) => (
            <span key={cat.id} className="flex items-center flex-shrink-0">
              {idx > 0 && <span className="h-4 w-px bg-[#EBE6DF] mx-0.5" />}
              <Link
                href={`/products?category=${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground/60 hover:text-[#E93D91] transition-colors whitespace-nowrap"
              >
                <span className="text-base leading-none">{CAT_ICONS[cat.nameAr ?? ''] ?? '🛍️'}</span>
                <span>{cat.nameAr}</span>
              </Link>
            </span>
          ))}
        </nav>

        {/* Actions : panier + menu mobile */}
        <HeaderClient categories={categories} />
      </div>

      {/* Barre catégories mobile (défile horizontalement) */}
      {categories.length > 0 && (
        <div className="md:hidden border-t border-[#EBE6DF] overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-0 px-2 py-2 w-max">
            <Link
              href="/products"
              className="flex-shrink-0 flex items-center gap-1 rounded-full bg-[#F7F5F2] px-3 py-1.5 text-xs font-medium text-foreground/70 me-1"
            >
              🛍️ الكل
            </Link>
            {categories.map((cat, idx) => (
              <span key={cat.id} className="flex items-center flex-shrink-0">
                {idx > 0 && <span className="h-3.5 w-px bg-[#EBE6DF] mx-0.5" />}
                <Link
                  href={`/products?category=${cat.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-foreground/60 hover:text-[#E93D91] transition-colors whitespace-nowrap"
                >
                  <span>{CAT_ICONS[cat.nameAr ?? ''] ?? '🛍️'}</span>
                  <span>{cat.nameAr}</span>
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
