'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/translations'
import { getEffectivePrice } from '@/lib/utils'
import { toRelativeMediaUrl } from '@/lib/utils'
import type { Product, Media } from '@/payload-types'

interface CatalogPromoPanelProps {
  featuredProducts: Product[]
}

// Panneau latéral droit du catalogue — promos, tendances, preuve sociale
export function CatalogPromoPanel({ featuredProducts }: CatalogPromoPanelProps) {
  const [visible, setVisible] = useState(false)
  const [orderCount, setOrderCount] = useState(47)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  // Simule des commandes en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setOrderCount((prev) => prev + Math.floor(Math.random() * 2))
    }, 20000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside
      className={`hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 transition-all duration-700 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      {/* ── Bannière promo ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#E93D91] to-[#C02070] p-4 text-white animate-fade-in-left">
        <div className="animate-float inline-block text-3xl mb-2">✨</div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">عروض حصرية</p>
        <p className="mt-1 text-base font-bold leading-snug">تخفيضات تصل إلى 50%</p>
        <p className="mt-0.5 text-xs opacity-70">على آخر المجموعات</p>
        <Link
          href="/products?sort=variations.regularPrice"
          className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors"
        >
          اكتشفي الآن ←
        </Link>
        {/* Décoration cercle */}
        <div className="absolute -end-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -end-2 -bottom-4 h-16 w-16 rounded-full bg-white/10" />
      </div>

      {/* ── Compteur commandes live ── */}
      <div className="flex items-center gap-2 rounded-xl border border-[#EBE6DF] bg-[#F7F5F2] px-3 py-2.5">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-foreground">
            <span className="text-[#E93D91]">{orderCount}</span> طلب اليوم
          </p>
          <p className="text-[10px] text-foreground/50">في جميع الولايات</p>
        </div>
      </div>

      {/* ── Produits en vedette ── */}
      {featuredProducts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">الأكثر طلباً</p>
          {featuredProducts.slice(0, 3).map((product, i) => (
            <FeaturedCard key={product.id} product={product} delay={i * 120} />
          ))}
        </div>
      )}

      {/* ── Badge qualité ── */}
      <div className="rounded-2xl border border-[#CEA060]/30 bg-gradient-to-br from-[#FEF9F0] to-white p-3 text-center">
        <div className="text-2xl mb-1 animate-float">👑</div>
        <p className="text-xs font-bold text-[#9F6F3B]">جودة مضمونة 100%</p>
        <p className="mt-0.5 text-[10px] text-foreground/50">يمكن تغيير البضاعة أو المقاس خلال 48 ساعة</p>
      </div>

      {/* ── Livraison ── */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#EBE6DF] p-3 text-xs text-foreground/60">
        <div className="flex items-center gap-2">
          <span className="text-base">🚚</span>
          <span>توصيل لجميع الولايات</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">💳</span>
          <span>الدفع عند الاستلام</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">📦</span>
          <span>تغليف أنيق مميز</span>
        </div>
      </div>
    </aside>
  )
}

function FeaturedCard({ product, delay }: { product: Product; delay: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400 + delay)
    return () => clearTimeout(t)
  }, [delay])

  const firstImage = product.images?.[0]?.image as Media | null
  const imageUrl = toRelativeMediaUrl(
    firstImage && typeof firstImage === 'object'
      ? (firstImage as Media & { url?: string }).url
      : null
  )

  const minPrice = Math.min(
    ...(product.variations ?? [])
      .map((v) => getEffectivePrice(v.regularPrice ?? 0, v.salePrice))
      .filter((p) => p > 0)
  ) || 0

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group flex gap-2 rounded-xl border border-[#EBE6DF] p-2 transition-all duration-500 hover:border-[#E93D91]/40 hover:shadow-md ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F7F5F2]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.nameAr ?? ''}
            fill
            sizes="48px"
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-[#CEA060] text-xs font-bold">SHE</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold line-clamp-2 leading-snug group-hover:text-[#E93D91] transition-colors">
          {product.nameAr}
        </p>
        <p className="mt-1 text-xs font-bold text-[#E93D91]">
          {minPrice > 0 ? formatPrice(minPrice) : ''}
        </p>
      </div>
    </Link>
  )
}

// ── Sidebar gauche — catégories animées ─────────────────────────────────────

interface CatalogCategorySidebarProps {
  categories: Array<{ id: string; nameAr: string }>
  activeCategory?: string
  sort: string
}

const CAT_ICONS: Record<string, string> = {
  'بوركيني': '🏊',
  'فستان': '👗',
  'رداء': '👘',
  'معطف': '🧥',
  'جاكيت': '🧣',
  'طقم': '✨',
  'سراويل': '👖',
  'تنورة': '👘',
  'قميص': '👚',
  'حجاب': '🧕',
  'حذاء': '👠',
  'حقيبة': '👜',
  'إكسسوار': '💎',
  'default': '🛍️',
}

function getCatIcon(name: string): string {
  for (const [key, emoji] of Object.entries(CAT_ICONS)) {
    if (name.includes(key)) return emoji
  }
  return CAT_ICONS.default
}

export function CatalogCategorySidebar({ categories, activeCategory, sort }: CatalogCategorySidebarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <aside
      className={`hidden md:flex flex-col gap-3 md:w-44 lg:w-52 flex-shrink-0 transition-all duration-700 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      {/* Titre */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🗂️</span>
        <h3 className="text-sm font-bold text-foreground/70">التصنيفات</h3>
      </div>

      {/* Toutes les catégories */}
      <Link
        href={`/products${sort !== '-createdAt' ? `?sort=${sort}` : ''}`}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          !activeCategory
            ? 'bg-gradient-to-l from-[#E93D91] to-[#C02070] text-white shadow-md shadow-[#E93D91]/30'
            : 'border border-[#EBE6DF] text-foreground/70 hover:border-[#E93D91]/40 hover:bg-[#FFF0F7] hover:text-[#E93D91]'
        }`}
      >
        <span className="text-base">🛍️</span>
        <span>الكل</span>
      </Link>

      {categories.map((cat, i) => (
        <AnimatedCategoryLink
          key={cat.id}
          cat={cat}
          icon={getCatIcon(cat.nameAr)}
          isActive={activeCategory === cat.id}
          href={`/products?category=${cat.id}${sort !== '-createdAt' ? `&sort=${sort}` : ''}`}
          delay={i * 60}
        />
      ))}
    </aside>
  )
}

function AnimatedCategoryLink({
  cat, icon, isActive, href, delay,
}: {
  cat: { id: string; nameAr: string }
  icon: string
  isActive: boolean
  href: string
  delay: number
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 150 + delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
        show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
      } ${
        isActive
          ? 'bg-gradient-to-l from-[#E93D91] to-[#C02070] text-white shadow-md shadow-[#E93D91]/30'
          : 'border border-[#EBE6DF] text-foreground/70 hover:border-[#E93D91]/40 hover:bg-[#FFF0F7] hover:text-[#E93D91] hover:shadow-sm'
      }`}
    >
      <span className={`text-base transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-125'}`}>
        {icon}
      </span>
      <span className="line-clamp-1">{cat.nameAr}</span>
    </Link>
  )
}