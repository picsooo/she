'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatPrice, t } from '@/lib/translations'
import { TrackInitiateCheckout } from '@/components/analytics/TrackInitiateCheckout'
import { getEffectivePrice, isValidAlgerianPhone } from '@/lib/utils'
import { WILAYAS, COMMUNES, getCommunesByWilaya } from '@/lib/algeria-geo'
import { createOrder } from '@/app/actions/createOrder'
import Image from 'next/image'

type DeliveryMode = 'home' | 'desk'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const subtotal = getTotalPrice()

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    wilayaCode: '',
    wilayaName: '',
    commune: '',
    address: '',
    note: '',
    deliveryMode: 'home' as DeliveryMode,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [communes, setCommunes] = useState<{ value: string; label: string }[]>([])

  // Frais de livraison — null tant que la commune n'est pas sélectionnée (pas d'affichage par défaut)
  const [fees, setFees] = useState<{ home: number; desk: number } | null>(null)
  // Valeurs de repli chargées depuis les settings — stockées dans un ref
  // pour ne PAS déclencher le re-run de l'effet de frais Yalidine
  const defaultFeesRef = useRef({ home: 400, desk: 300 })

  useEffect(() => {
    // Charger les frais par défaut depuis les settings (repli silencieux)
    fetch('/api/globals/delivery-settings?depth=0')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          defaultFeesRef.current = {
            home: data.defaultHomeDeliveryFee ?? 400,
            desk: data.defaultDeskDeliveryFee ?? 300,
          }
        }
      })
      .catch(() => {/* utiliser les valeurs par défaut */})
  }, [])

  // true pendant le chargement des frais Yalidine
  const [feesLoading, setFeesLoading] = useState(false)

  // Bureaux Yalidine pour la wilaya sélectionnée
  const [centers, setCenters] = useState<Array<{ center_id: number; name: string; address: string; commune_name: string; phone: string }>>([])
  const [centersLoading, setCentersLoading] = useState(false)

  useEffect(() => {
    if (form.wilayaCode) {
      const list = getCommunesByWilaya(form.wilayaCode)
      setCommunes(list.map((c) => ({ value: c.nameAr, label: c.nameAr })))
      setForm((prev) => ({ ...prev, commune: '' }))
      // Réinitialiser les frais quand la wilaya change — on attend la commune
      setFees(null)
      // Charger les bureaux Yalidine pour cette wilaya
      setCentersLoading(true)
      fetch(`/api/yalidine/centers?wilayaCode=${encodeURIComponent(form.wilayaCode)}`)
        .then(r => r.ok ? r.json() : { centers: [] })
        .then(data => setCenters(data.centers ?? []))
        .catch(() => setCenters([]))
        .finally(() => setCentersLoading(false))
    } else {
      setCommunes([])
      setCenters([])
    }
  }, [form.wilayaCode])

  // Charger les vrais frais Yalidine dès que wilaya + commune sont sélectionnées
  useEffect(() => {
    if (!form.wilayaCode || !form.commune) return
    let cancelled = false
    setFeesLoading(true)
    // Lire le ref au moment du fetch (pas dans les deps → pas de re-run parasite)
    const fallback = defaultFeesRef.current
    fetch(`/api/yalidine/fees?wilayaCode=${encodeURIComponent(form.wilayaCode)}&communeNameAr=${encodeURIComponent(form.commune)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return
        if (data?.source === 'yalidine' && (data.home !== null || data.desk !== null)) {
          // Frais Yalidine réels disponibles pour cette wilaya
          setFees({
            home: data.home ?? fallback.home,
            desk: data.desk ?? fallback.desk,
          })
        } else if (data?.source === 'disabled') {
          // Yalidine désactivé → utiliser les frais par défaut des settings
          setFees(fallback)
        } else {
          // Erreur/timeout/commune_not_found Yalidine → ne PAS afficher le fallback 400/300
          // Le serveur recalculera les vrais frais dans createOrder via l'API Yalidine
          setFees(null)
        }
      })
      .catch(() => { if (!cancelled) setFees(null) })
      .finally(() => { if (!cancelled) setFeesLoading(false) })
    return () => { cancelled = true }
    // defaultFeesRef intentionnellement absent des deps : c'est un ref, pas un state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wilayaCode, form.commune])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateClient = () => {
    const newErrors: Record<string, string> = {}
    if (!form.customerName || form.customerName.length < 3) newErrors.customerName = t.validation.nameMin
    if (!form.phone || !isValidAlgerianPhone(form.phone)) newErrors.phone = t.validation.phoneInvalid
    if (!form.wilayaCode) newErrors.wilayaCode = t.validation.required
    if (!form.commune) newErrors.commune = t.validation.required
    if (!form.address || form.address.length < 5) newErrors.address = t.validation.addressMin
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clientErrors = validateClient()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setLoading(true)
    const trafficSource = sessionStorage.getItem('_traffic_source') ?? undefined
    const result = await createOrder({
      customer: {
        customerName: form.customerName,
        phone: form.phone.replace(/\s/g, ''),
        wilayaCode: form.wilayaCode,
        wilayaName: form.wilayaName,
        commune: form.commune,
        address: form.address,
        note: form.note || undefined,
        deliveryMode: form.deliveryMode,
        shippingFee: fees ? fees[form.deliveryMode] : undefined,
        trafficSource,
      },
      items: items.map((item) => ({
        productId: item.productId,
        variationIndex: item.variationIndex,
        quantity: item.quantity,
        // Articles à prix 0 = cadeaux offerts (ex: chapeau avec burkini)
        isFreeGift: item.regularPrice === 0,
      })),
    })

    if (result.success) {
      clearCart()
      router.push(`/order-confirmation/${result.orderNumber}`)
    } else {
      const newErrors: Record<string, string> = {}
      if (result.fieldErrors) Object.assign(newErrors, result.fieldErrors)
      newErrors._form = result.error
      setErrors(newErrors)
      setLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-xl text-foreground/60 mb-6">{t.cart.empty}</p>
        <a href="/products"><Button>{t.cart.emptyCta}</Button></a>
      </div>
    )
  }

  const wilayaOptions = WILAYAS.map((w) => ({ value: w.code, label: w.nameAr }))
  // shippingFee = null si wilaya/commune pas encore choisis → pas d'affichage
  const shippingFee = fees ? fees[form.deliveryMode] : null
  const total = shippingFee !== null ? subtotal + shippingFee : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <TrackInitiateCheckout />

      <h1 className="mb-2 text-2xl font-bold">{t.checkout.title}</h1>
      <p className="mb-8 text-sm text-foreground/50">الدفع عند الاستلام — التوصيل لجميع الولايات</p>

      {errors._form && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {errors._form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">

          {/* ── Formulaire ── */}
          <div className="md:col-span-3 flex flex-col gap-4">

            <Input
              label={t.checkout.fullName}
              required
              value={form.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              error={errors.customerName}
              placeholder="مثال: فاطمة الزهراء بوعلام"
              autoComplete="name"
            />

            <Input
              label={t.checkout.phone}
              required
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={errors.phone}
              placeholder={t.checkout.phonePlaceholder}
              hint={t.checkout.phoneHint}
              autoComplete="tel"
              inputMode="numeric"
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t.checkout.wilaya}
                required
                value={form.wilayaCode}
                onChange={(e) => {
                  const code = e.target.value
                  const wilaya = WILAYAS.find((w) => w.code === code)
                  handleChange('wilayaCode', code)
                  handleChange('wilayaName', wilaya?.nameAr ?? '')
                }}
                error={errors.wilayaCode}
                placeholder={t.checkout.selectWilaya}
                options={wilayaOptions}
              />

              <Select
                label={t.checkout.commune}
                required
                value={form.commune}
                onChange={(e) => handleChange('commune', e.target.value)}
                error={errors.commune}
                placeholder={form.wilayaCode ? t.checkout.selectCommune : 'اختاري الولاية أولاً'}
                options={communes}
                disabled={!form.wilayaCode || communes.length === 0}
              />
            </div>

            {/* ── Mode de livraison (bien apparent après commune) ── */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">
                🚚 طريقة التوصيل <span className="text-[#E93D91]">*</span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Livraison à domicile */}
                <button
                  type="button"
                  onClick={() => handleChange('deliveryMode', 'home')}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all ${
                    form.deliveryMode === 'home'
                      ? 'border-[#E93D91] bg-[#FFF0F7]'
                      : 'border-[#EBE6DF] bg-white hover:border-[#E93D91]/40'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">🏠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">توصيل إلى المنزل</p>
                    <p className="text-xs text-foreground/60 mt-0.5">Livraison à domicile</p>
                    {fees ? (
                      <p className="mt-1.5 text-base font-extrabold text-[#E93D91]">{formatPrice(fees.home)}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-foreground/40">يُحدَّد بعد اختيار الولاية</p>
                    )}
                  </div>
                  {form.deliveryMode === 'home' && (
                    <span className="h-5 w-5 rounded-full bg-[#E93D91] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  )}
                </button>

                {/* Livraison en bureau Yalidine */}
                <button
                  type="button"
                  onClick={() => handleChange('deliveryMode', 'desk')}
                  className={`flex items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all ${
                    form.deliveryMode === 'desk'
                      ? 'border-[#E93D91] bg-[#FFF0F7]'
                      : 'border-[#EBE6DF] bg-white hover:border-[#E93D91]/40'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">🏢</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">توصيل إلى مكتب ياليدين</p>
                    <p className="text-xs text-foreground/60 mt-0.5">Bureau Yalidine</p>
                    {fees ? (
                      <p className="mt-1.5 text-base font-extrabold text-[#E93D91]">{formatPrice(fees.desk)}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-foreground/40">يُحدَّد بعد اختيار الولاية</p>
                    )}
                  </div>
                  {form.deliveryMode === 'desk' && (
                    <span className="h-5 w-5 rounded-full bg-[#E93D91] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              </div>

              {/* Bureaux Yalidine — visible uniquement si mode desk et wilaya sélectionnée */}
              {form.deliveryMode === 'desk' && form.wilayaCode && (
                <div className="rounded-xl border border-[#EBE6DF] bg-[#F7F5F2] p-3 text-sm">
                  <p className="font-semibold mb-2 text-foreground">🏢 مكاتب ياليدين في ولايتك — <span className="text-xs font-normal text-foreground/50">انقري على المكتب لتعبئة العنوان تلقائياً</span></p>
                  {centersLoading ? (
                    <p className="text-foreground/50 text-xs">جار التحميل…</p>
                  ) : centers.length === 0 ? (
                    <p className="text-foreground/50 text-xs">لا توجد مكاتب متاحة في هذه الولاية</p>
                  ) : (() => {
                    // Filtrer les bureaux par commune sélectionnée (nom FR de la commune)
                    const communeFr = form.commune
                      ? (COMMUNES.find(c => c.wilayaCode === form.wilayaCode && c.nameAr === form.commune)?.nameFr ?? '')
                      : ''
                    const normalize = (s: string) =>
                      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ')
                    const centersInCommune = communeFr
                      ? centers.filter(c =>
                          c.commune_name.toLowerCase() === communeFr.toLowerCase() ||
                          normalize(c.commune_name) === normalize(communeFr)
                        )
                      : centers
                    const displayCenters = centersInCommune.length > 0 ? centersInCommune : centers
                    const showFallbackNote = centersInCommune.length === 0 && communeFr && centers.length > 0
                    return (
                      <>
                        {showFallbackNote && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
                            ⚠️ لا يوجد مكتب في بلديتك — إليك أقرب المكاتب في الولاية
                          </p>
                        )}
                    <ul className="flex flex-col gap-2">
                      {displayCenters.map(c => {
                        const centerAddress = `${c.name}${c.address ? ' — ' + c.address : ''}${c.commune_name ? ' — ' + c.commune_name : ''}`
                        const isSelected = form.address === centerAddress
                        return (
                          <li
                            key={c.center_id}
                            onClick={() => handleChange('address', centerAddress)}
                            className="flex flex-col gap-0.5 cursor-pointer rounded-lg px-3 py-2 transition-all"
                            style={{
                              background: isSelected ? '#FFF0F7' : '#fff',
                              border: isSelected ? '1.5px solid #E93D91' : '1px solid #EBE6DF',
                            }}
                          >
                            <span className="font-semibold text-foreground flex items-center gap-2">
                              {isSelected && <span className="text-[#E93D91]">✓</span>}
                              {c.name}
                            </span>
                            {c.address && <span className="text-foreground/60 text-xs">{c.address}{c.commune_name ? ` — ${c.commune_name}` : ''}</span>}
                            {c.phone && <span className="text-foreground/50 text-xs">📞 {c.phone}</span>}
                          </li>
                        )
                      })}
                    </ul>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            <Input
              label={t.checkout.address}
              required
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              error={errors.address}
              placeholder={
                form.deliveryMode === 'desk'
                  ? 'اسم مكتب ياليدين القريب منكِ...'
                  : t.checkout.addressPlaceholder
              }
              autoComplete="street-address"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm text-foreground/60">{t.checkout.note}</label>
              <textarea
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder={t.checkout.notePlaceholder}
                rows={2}
                className="w-full rounded-xl border border-[#EBE6DF] bg-white px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E93D91] focus:outline-none focus:ring-2 focus:ring-[#E93D91]/20 transition-colors resize-none"
              />
            </div>

            <div className="md:hidden mt-2">
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                {loading ? t.checkout.processing : t.checkout.placeOrder}
              </Button>
            </div>
          </div>

          {/* ── Récapitulatif ── */}
          <div className="md:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-[#EBE6DF] p-5">
              <h2 className="mb-4 font-semibold">{t.checkout.orderSummary}</h2>

              <div className="flex flex-col divide-y divide-[#EBE6DF]">
                {items.map((item) => {
                  const price = getEffectivePrice(item.regularPrice, item.salePrice)
                  return (
                    <div key={`${item.productId}-${item.variationIndex}`} className="flex gap-3 py-3">
                      <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F7F5F2]">
                        {item.productImage ? (
                          <Image src={item.productImage} alt={item.productNameAr} fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-foreground/20 text-xs">SHE</div>
                        )}
                        <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E93D91] text-[9px] text-white font-bold">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug">{item.productNameAr}</p>
                        <p className="text-xs text-foreground/50">{item.colorAr}{item.size && item.size !== 'UNIQUE' ? ` · ${item.size}` : ''}</p>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0">{formatPrice(price * item.quantity)}</p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-col gap-2 text-sm border-t border-[#EBE6DF] pt-4">
                <div className="flex justify-between">
                  <span className="text-foreground/60">{t.cart.subtotal}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-foreground/60">{t.checkout.shippingFee}</span>
                  <span className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                    {feesLoading ? (
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-foreground/20 border-t-[#E93D91] animate-spin" />
                    ) : shippingFee !== null ? (
                      <>
                        {formatPrice(shippingFee)}
                        <span className="ms-1 text-xs text-foreground/40">
                          ({form.deliveryMode === 'desk' ? 'مكتب' : 'منزل'})
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-foreground/40">اختاري الولاية والبلدية</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-[#EBE6DF] pt-2 mt-1">
                  <span>{t.cart.total}</span>
                  <span className="text-[#E93D91]">
                    {total !== null ? formatPrice(total) : (
                      <span className="text-sm text-foreground/40">سيُحدَّد بعد الولاية</span>
                    )}
                  </span>
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-5 w-full hidden md:flex" loading={loading}>
                {loading ? t.checkout.processing : t.checkout.placeOrder}
              </Button>

              <p className="mt-3 text-center text-xs text-foreground/40">🔒 دفع آمن عند الاستلام</p>
            </div>
          </div>

        </div>
      </form>
    </div>
  )
}
