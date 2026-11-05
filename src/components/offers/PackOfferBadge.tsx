'use client'

import { usePackOfferConfig, } from './PackOfferProvider'
import { isProductInPackOffer } from '@/lib/pack-offer'

// Pastille « قطعتان بـ 10.000 دج » affichée sur les produits concernés
// (carte catalogue et page produit). N'apparaît que si l'offre est active
// ET que ce produit en fait partie.
export function PackOfferBadge({
  productId,
  size = 'sm',
}: {
  productId: string | number
  size?: 'sm' | 'md'
}) {
  const offer = usePackOfferConfig()

  if (!isProductInPackOffer(productId, offer) || !offer?.titleAr) return null

  return (
    <div
      className={
        size === 'md'
          ? 'inline-flex items-center gap-2 rounded-xl border border-[#CEA060]/50 bg-gradient-to-l from-[#FEF9F0] to-white px-3 py-2'
          : 'inline-flex items-center gap-1.5 rounded-lg border border-[#CEA060]/40 bg-[#FEF9F0] px-2 py-1'
      }
    >
      <span aria-hidden className={size === 'md' ? 'text-base' : 'text-xs'}>🎁</span>
      <span
        className={
          size === 'md'
            ? 'text-sm font-bold text-[#9F6F3B]'
            : 'text-[11px] font-bold text-[#9F6F3B] leading-tight'
        }
      >
        {offer.titleAr}
      </span>
    </div>
  )
}
