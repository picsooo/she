'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/translations'
import { getEffectivePrice } from '@/lib/utils'
import type { Product, Media } from '@/payload-types'
import { toRelativeMediaUrl } from '@/lib/utils'

// ── Sidebar DROITE — suggestions produits ───────────────────────────────────

interface ProductSidebarProps {
  related: Product[]
  currentProductId: string | number
}

export function ProductSidebar({ related, currentProductId }: ProductSidebarProps) {
  const [visible, setVisible] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    // Compteur "sauvegardé" simulé basé sur l'ID
    const seed = Number(currentProductId) || 0
    setSavedCount(((seed * 7) % 89) + 12)
    return () => clearTimeout(t)
  }, [currentProductId])

  if (related.length === 0) return null

  return (
    <aside
      className={`hidden lg:flex flex-col gap-4 w-52 flex-shrink-0 transition-all duration-700 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      {/* ── Stat sauvegardé ── */}
      <div className="flex items-center gap-2 rounded-xl bg-[#FFF0F7] border border-[#E93D91]/20 px-3 py-2.5">
        <span className="text-lg">🤍</span>
        <div>
          <p className="text-xs font-bold text-[#E93D91]">{savedCount} شخص أضافه للمفضلة</p>
          <p className="text-[10px] text-foreground/50">هذا الأسبوع</p>
        </div>
      </div>

      {/* ── Suggestions ── */}
      <div>
        <p className="mb-2 text-xs font-bold text-foreground/50 uppercase tracking-wider">
          قد يعجبكِ أيضاً ✨
        </p>
        <div className="flex flex-col gap-2">
          {related.slice(0, 5).map((product, i) => (
            <ProductSidebarCard key={product.id} product={product} delay={i * 100} />
          ))}
        </div>
      </div>

      {/* ── Lien catalogue ── */}
      <Link
        href="/products"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#EBE6DF] py-3 text-xs font-semibold text-foreground/50 hover:border-[#E93D91] hover:text-[#E93D91] transition-all"
      >
        <span>🛍️</span>
        <span>عرض كل المنتجات</span>
      </Link>

      {/* ── Badge livraison ── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#F7F5F2] to-white border border-[#EBE6DF] p-3 text-center">
        <div className="text-2xl mb-1">🚚</div>
        <p className="text-xs font-bold text-foreground/70">توصيل سريع</p>
        <p className="text-[10px] text-foreground/50 mt-0.5">لجميع ولايات الجزائر</p>
        <div className="mt-2 flex justify-center gap-1 flex-wrap">
          {['الجزائر', 'وهران', 'قسنطينة'].map((w) => (
            <span key={w} className="rounded-full bg-[#EBE6DF] px-2 py-0.5 text-[9px] text-foreground/60">{w}</span>
          ))}
          <span className="rounded-full bg-[#EBE6DF] px-2 py-0.5 text-[9px] text-foreground/60">+55</span>
        </div>
      </div>

      {/* ── Avis clients ── */}
      <div className="rounded-2xl border border-[#EBE6DF] p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-foreground/70">آراء العملاء</p>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map((s) => (
              <span key={s} className="text-[#CEA060] text-xs">★</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {FAKE_REVIEWS.map((r, i) => (
            <div key={i} className="rounded-lg bg-[#F7F5F2] px-2.5 py-2">
              <p className="text-[10px] font-semibold text-foreground/70">{r.name}</p>
              <p className="text-[10px] text-foreground/50 mt-0.5 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

const FAKE_REVIEWS = [
  { name: 'فاطمة - الجزائر', text: 'جودة ممتازة، وصل بسرعة 💕' },
  { name: 'سارة - وهران', text: 'راضية جداً، سأطلب مرة أخرى' },
  { name: 'نور - قسنطينة', text: 'المقاس تمام، شكراً She\'s!' },
]

function ProductSidebarCard({ product, delay }: { product: Product; delay: number }) {
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

  const hasPromo = (product.variations ?? []).some((v) => v.salePrice && v.salePrice > 0)

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group flex gap-2 rounded-xl border border-[#EBE6DF] p-2 transition-all duration-500 hover:border-[#E93D91]/40 hover:shadow-md ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F7F5F2]">
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
        {hasPromo && (
          <span className="absolute top-0 start-0 rounded-br-lg bg-[#E93D91] px-1 py-0.5 text-[8px] font-bold text-white">
            PROMO
          </span>
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

// ── Sidebar GAUCHE — catégories + infos marque ──────────────────────────────

interface CategorySidebarProps {
  categories: Array<{ id: string; nameAr: string }>
  currentCategoryIds?: string[]
}

const CAT_EMOJIS: Record<string, string> = {
  'بوركيني': '🏊', 'فستان': '👗', 'رداء': '👘', 'معطف': '🧥',
  'جاكيت': '🧣', 'طقم': '✨', 'سراويل': '👖', 'تنورة': '👘',
  'قميص': '👚', 'حجاب': '🧕', 'حذاء': '👠', 'حقيبة': '👜',
  'إكسسوار': '💎', 'default': '🛍️',
}

function getCatEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(CAT_EMOJIS)) {
    if (name.includes(key)) return emoji
  }
  return CAT_EMOJIS.default
}

export function CategorySidebar({ categories, currentCategoryIds = [] }: CategorySidebarProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <aside
      className={`hidden lg:flex flex-col gap-4 w-48 flex-shrink-0 transition-all duration-700 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      {/* ── Bannière marque ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#333] p-4 text-white text-center">
        <div className="text-2xl mb-1 animate-float inline-block">👑</div>
        <p className="text-xs font-bold tracking-widest uppercase text-[#CEA060]">She&apos;s</p>
        <p className="text-[10px] text-white/50 mt-0.5">Fit & Beauty</p>
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#CEA060] to-transparent" />
        <p className="mt-2 text-[9px] text-white/40 leading-relaxed">
          أزياء المرأة الجزائرية<br />جودة · أناقة · راحة
        </p>
      </div>

      {/* ── Catégories ── */}
      <div>
        <p className="mb-2 text-xs font-bold text-foreground/50 uppercase tracking-wider">التصنيفات</p>
        <div className="flex flex-col gap-1.5">
          {categories.slice(0, 8).map((cat, i) => (
            <SidebarCategoryLink
              key={cat.id}
              cat={cat}
              emoji={getCatEmoji(cat.nameAr)}
              isActive={currentCategoryIds.includes(cat.id)}
              delay={i * 60}
            />
          ))}
        </div>
      </div>

      {/* ── Contact rapide WhatsApp ── */}
      <div className="rounded-2xl bg-[#FFF0F7] border border-[#E93D91]/20 p-4 text-center">
        <p className="text-sm font-bold text-[#E93D91]">💬 هل لديكِ سؤال؟</p>
        <p className="mt-1 text-xs text-foreground/50">تواصلي معنا مباشرة عبر واتساب</p>
        <a
          href="https://wa.me/213562705896"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-bold text-white hover:bg-green-600 transition-colors"
        >
          <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          تواصلي عبر واتساب
        </a>
      </div>
    </aside>
  )
}

function SidebarCategoryLink({
  cat, emoji, isActive, delay,
}: {
  cat: { id: string; nameAr: string }
  emoji: string
  isActive: boolean
  delay: number
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 250 + delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <Link
      href={`/products?category=${cat.id}`}
      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-300 ${
        show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
      } ${
        isActive
          ? 'bg-[#E93D91] text-white shadow-sm'
          : 'text-foreground/60 hover:bg-[#FFF0F7] hover:text-[#E93D91]'
      }`}
    >
      <span className={`transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-125'}`}>
        {emoji}
      </span>
      <span className="line-clamp-1">{cat.nameAr}</span>
    </Link>
  )
}
