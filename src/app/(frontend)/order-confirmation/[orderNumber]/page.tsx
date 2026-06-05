import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrderByNumber } from '@/lib/payload-client'
import { formatPrice, t } from '@/lib/translations'
import { Button } from '@/components/ui/Button'
import { TrackPurchase } from '@/components/analytics/TrackPurchase'
import type { Order } from '@/payload-types'

interface PageProps {
  params: Promise<{ orderNumber: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params
  return { title: `طلب ${orderNumber}` }
}

// Page de confirmation de commande — affichée après checkout réussi
export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber } = await params
  const order = await getOrderByNumber(orderNumber).catch(() => null)

  if (!order) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Pixel Purchase — anti-doublon intégré dans TrackPurchase */}
      <TrackPurchase order={order} />

      {/* En-tête succès */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t.orderConfirmation.title}
        </h1>
        <p className="text-foreground/60">{t.orderConfirmation.subtitle}</p>
      </div>

      {/* Numéro de commande bien visible */}
      <div className="mb-6 rounded-2xl border-2 border-[#CEA060]/40 bg-[#FEF9F0] p-5 text-center">
        <p className="text-sm text-foreground/60 mb-1">{t.orderConfirmation.orderNumber}</p>
        <p className="text-3xl font-bold text-[#9F6F3B] tracking-wider">{order.orderNumber}</p>
      </div>

      {/* Message COD algérien */}
      <div className="mb-6 rounded-2xl bg-[#F7F5F2] p-4 text-sm text-foreground/70 leading-relaxed text-center">
        {t.orderConfirmation.message}
      </div>

      {/* Détails livraison */}
      <div className="mb-6 rounded-2xl border border-[#EBE6DF] p-5">
        <h2 className="mb-3 font-semibold text-foreground/80">{t.orderConfirmation.deliveryAddress}</h2>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-foreground/60 font-ltr" dir="ltr">{order.phone}</p>
          <p className="text-foreground/60">{order.wilaya} — {order.commune}</p>
          <p className="text-foreground/60">{order.address}</p>
          {order.note && <p className="mt-1 text-xs text-foreground/40 italic">"{order.note}"</p>}
        </div>
      </div>

      {/* Résumé articles */}
      <div className="mb-6 rounded-2xl border border-[#EBE6DF] p-5">
        <h2 className="mb-3 font-semibold text-foreground/80">{t.orderConfirmation.summary}</h2>
        <div className="flex flex-col divide-y divide-[#EBE6DF]">
          {(order.items ?? []).map((item, idx) => (
            <div key={idx} className="flex justify-between gap-3 py-2.5 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{item.productName}</p>
                <p className="text-xs text-foreground/50">
                  {item.colorAr && item.colorAr}
                  {item.colorAr && item.size ? ' · ' : ''}
                  {item.size && item.size !== 'UNIQUE' ? item.size : ''}
                  {' ×'} {item.quantity}
                </p>
              </div>
              <p className="font-bold flex-shrink-0">
                {formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-[#EBE6DF] pt-3 font-bold">
          <span>{t.orderConfirmation.total}</span>
          <span className="text-[#E93D91]">{formatPrice(order.total ?? 0)}</span>
        </div>
      </div>

      {/* CTA retour boutique */}
      <div className="text-center">
        <Link href="/products">
          <Button variant="outline" size="lg">
            {t.orderConfirmation.continueShopping}
          </Button>
        </Link>
      </div>
    </div>
  )
}
