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
          ? 'flex items-start gap-2 rounded-xl border border-[#CEA060]/50 bg-gradient-to-l from-[#FEF9F0] to-white px-3 py-2.5'
          : 'flex items-start gap-1.5 rounded-lg border border-[#CEA060]/40 bg-[#FEF9F0] px-2 py-1.5'
      }
    >
      <span aria-hidden className={size === 'md' ? 'text-base leading-none mt-0.5' : 'text-xs leading-none mt-0.5'}>🎁</span>
      <div className="min-w-0">
        <p
          className={
            size === 'md'
              ? 'text-sm font-bold text-[#9F6F3B]'
              : 'text-[11px] font-bold text-[#9F6F3B] leading-tight'
          }
        >
          {offer.titleAr}
        </p>
        {/* Précision indispensable : sans elle, « قطعتان » se lit comme
            « deux fois CET article » et la cliente croit devoir reprendre
            le même modèle. */}
        {offer.subtitleAr && (
          <p
            className={
              size === 'md'
                ? 'mt-0.5 text-[11px] text-[#9F6F3B]/80 leading-snug'
                : 'mt-0.5 text-[10px] text-[#9F6F3B]/75 leading-snug'
            }
          >
            {offer.subtitleAr}
          </p>
        )}
      </div>
    </div>
  )
}
