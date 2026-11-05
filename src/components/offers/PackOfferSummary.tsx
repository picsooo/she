'use client'

import { formatPrice, t } from '@/lib/translations'
import type { CartTotals } from '@/hooks/useCartTotals'

// Ligne « خصم العرض » + incitation à compléter le pack.
// Composant unique réutilisé par le drawer, la page panier et le checkout :
// les trois écrans affichent donc exactement la même chose.
export function PackOfferSummary({ totals, compact = false }: { totals: CartTotals; compact?: boolean }) {
  const { offer, discount, packs, unitsToNextPack, eligibleUnits } = totals

  // Rien à dire si l'offre est éteinte ou si le panier ne contient aucun article concerné
  if (!offer?.enabled || eligibleUnits === 0) return null

  return (
    <>
      {discount > 0 && (
        <div className="flex justify-between text-sm font-semibold text-[#E93D91]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden>🎁</span>
            {t.cart.packDiscount}
          </span>
          <span>− {formatPrice(discount)}</span>
        </div>
      )}

      {/* Confirmation que l'offre est prise en compte — uniquement si elle fait
          vraiment baisser le prix, jamais sur une config qui ne remise rien */}
      {packs > 0 && discount > 0 && !compact && (
        <p className="text-xs text-[#E93D91]/80">{t.cart.packApplied(packs)}</p>
      )}

      {/* Incitation : il manque N article(s) pour déclencher le pack */}
      {unitsToNextPack > 0 && (
        <div className="rounded-xl border border-[#CEA060]/40 bg-[#FEF9F0] px-3 py-2">
          <p className="text-xs font-semibold text-[#9F6F3B]">
            {t.cart.packAddMore(unitsToNextPack)}
          </p>
          {offer.titleAr && (
            <p className="mt-0.5 text-[11px] text-[#9F6F3B]/80">{offer.titleAr}</p>
          )}
        </div>
      )}
    </>
  )
}
