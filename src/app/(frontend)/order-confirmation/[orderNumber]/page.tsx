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

// Numéro WhatsApp de la boutique (configurer ici)
const WHATSAPP_NUMBER = '213550000000' // TODO: remplacer par le numéro de Rania

// Page de confirmation — affichée après checkout réussi
export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderNumber } = await params
  const order = await getOrderByNumber(orderNumber).catch(() => null)

  if (!order) notFound()

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`مرحباً، أريد الاستفسار عن طلبي رقم ${order.orderNumber}`)}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <TrackPurchase order={order} />

      {/* En-tête succès */}
      <div className="mb-8 text-center">
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
      <div className="mb-5 rounded-2xl border-2 border-[#CEA060]/40 bg-[#FEF9F0] p-5 text-center">
        <p className="text-sm text-foreground/60 mb-1">{t.orderConfirmation.orderNumber}</p>
        <p className="text-3xl font-bold text-[#9F6F3B] tracking-wider">{order.orderNumber}</p>
      </div>

      {/* Message principal COD algérien */}
      <div className="mb-5 rounded-2xl bg-[#E93D91]/10 border border-[#E93D91]/20 p-5 text-center">
        <p className="text-lg font-bold text-[#E93D91] mb-1">
          سنتواصل معكِ خلال 24 ساعة القادمة لتأكيد الطلب ✨
        </p>
        <p className="text-sm text-foreground/60">
          يرجى إبقاء هاتفكِ قريباً — سنتصل بكِ لتأكيد طلبكِ وتنسيق التوصيل
        </p>
      </div>

      {/* Mode de livraison */}
      {(order as Order & { deliveryMode?: string }).deliveryMode && (
        <div className="mb-5 rounded-2xl border border-[#EBE6DF] p-4 flex items-center gap-3">
          <span className="text-2xl">
            {(order as Order & { deliveryMode?: string }).deliveryMode === 'desk' ? '🏢' : '🏠'}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {(order as Order & { deliveryMode?: string }).deliveryMode === 'desk'
                ? 'توصيل إلى مكتب ياليدين'
                : 'توصيل إلى المنزل'}
            </p>
            <p className="text-xs text-foreground/50">
              رسوم التوصيل: {formatPrice((order as Order & { shippingFee?: number }).shippingFee ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* Détails livraison */}
      <div className="mb-5 rounded-2xl border border-[#EBE6DF] p-5">
        <h2 className="mb-3 font-semibold text-foreground/80">{t.orderConfirmation.deliveryAddress}</h2>
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-foreground/60" dir="ltr">{order.phone}</p>
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
        <div className="mt-2 flex flex-col gap-1.5 border-t border-[#EBE6DF] pt-3 text-sm">
          <div className="flex justify-between text-foreground/60">
            <span>المجموع الفرعي</span>
            <span>{formatPrice((order as Order & { subtotal?: number }).subtotal ?? order.total ?? 0)}</span>
          </div>
          <div className="flex justify-between text-foreground/60">
            <span>رسوم التوصيل</span>
            <span>{formatPrice((order as Order & { shippingFee?: number }).shippingFee ?? 0)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-[#EBE6DF] pt-2 mt-1">
            <span>{t.orderConfirmation.total}</span>
            <span className="text-[#E93D91]">{formatPrice(order.total ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Message politique d'échange — en rouge, bien visible */}
      <div className="mb-6 rounded-2xl border-2 border-red-400 bg-red-50 p-5 text-center">
        <p className="text-xl font-extrabold text-red-600 leading-relaxed">
          ⚠️ البضاعة تُستبدل ولا تُسترجع
        </p>
        <p className="mt-2 text-sm font-semibold text-red-500">
          في حال وجود أي مشكل، يمكن استبدال المنتج فقط — لا يتم استرجاع المبلغ
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
        {/* Bouton WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-bold text-white hover:bg-green-600 transition-all hover:scale-105 shadow-md"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          تواصلي معنا — واتساب
        </a>

        <Link href="/products">
          <Button variant="outline" size="lg">
            {t.orderConfirmation.continueShopping}
          </Button>
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-foreground/40">
        She&apos;s Fit &amp; Beauty — شكراً لثقتكِ بنا 💕
      </p>
    </div>
  )
}
