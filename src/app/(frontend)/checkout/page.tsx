'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cart'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatPrice, t } from '@/lib/translations'
import { TrackInitiateCheckout } from '@/components/analytics/TrackInitiateCheckout'
import { getEffectivePrice, isValidAlgerianPhone } from '@/lib/utils'
import { WILAYAS, getCommunesByWilaya } from '@/lib/algeria-geo'
import { createOrder } from '@/app/actions/createOrder'
import Image from 'next/image'

// Page de checkout — une seule page, formulaire simple COD algérien
export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCartStore()

  const total = getTotalPrice()

  // Formulaire
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    wilayaCode: '',
    wilayaName: '',
    commune: '',
    address: '',
    note: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [communes, setCommunes] = useState<{ value: string; label: string }[]>([])

  // Mettre à jour la liste des communes quand la wilaya change
  useEffect(() => {
    if (form.wilayaCode) {
      const list = getCommunesByWilaya(form.wilayaCode)
      setCommunes(list.map((c) => ({ value: c.nameAr, label: c.nameAr })))
      setForm((prev) => ({ ...prev, commune: '' }))
    } else {
      setCommunes([])
    }
  }, [form.wilayaCode])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  // Validation côté client (pré-check avant envoi au serveur)
  const validateClient = () => {
    const newErrors: Record<string, string> = {}
    if (!form.customerName || form.customerName.length < 3) {
      newErrors.customerName = t.validation.nameMin
    }
    if (!form.phone || !isValidAlgerianPhone(form.phone)) {
      newErrors.phone = t.validation.phoneInvalid
    }
    if (!form.wilayaCode) newErrors.wilayaCode = t.validation.required
    if (!form.commune) newErrors.commune = t.validation.required
    if (!form.address || form.address.length < 10) newErrors.address = t.validation.addressMin
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const clientErrors = validateClient()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setLoading(true)

    const orderData = {
      customer: {
        customerName: form.customerName,
        phone: form.phone.replace(/\s/g, ''),
        wilayaCode: form.wilayaCode,
        wilayaName: form.wilayaName,
        commune: form.commune,
        address: form.address,
        note: form.note || undefined,
      },
      items: items.map((item) => ({
        productId: item.productId,
        variationIndex: item.variationIndex,
        quantity: item.quantity,
      })),
    }

    const result = await createOrder(orderData)

    if (result.success) {
      clearCart()
      router.push(`/order-confirmation/${result.orderNumber}`)
    } else {
      if (result.fieldErrors) {
        setErrors(result.fieldErrors)
      }
      setErrors((prev) => ({ ...prev, _form: result.error }))
      setLoading(false)
    }
  }

  // Rediriger si panier vide
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-xl text-foreground/60 mb-6">{t.cart.empty}</p>
        <a href="/products">
          <Button>{t.cart.emptyCta}</Button>
        </a>
      </div>
    )
  }

  const wilayaOptions = WILAYAS.map((w) => ({
    value: w.code,
    label: w.nameAr,
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Pixel InitiateCheckout — au montage de la page */}
      <TrackInitiateCheckout />
      <h1 className="section-title mb-8 text-2xl font-bold">{t.checkout.title}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          {/* ── Formulaire (3/5) ──────────────────────────────────── */}
          <div className="md:col-span-3 flex flex-col gap-6">
            {/* Informations personnelles */}
            <fieldset className="rounded-2xl border border-[#EBE6DF] p-5 flex flex-col gap-4">
              <legend className="px-2 text-sm font-semibold text-foreground/70">
                {t.checkout.personalInfo}
              </legend>

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
            </fieldset>

            {/* Adresse de livraison */}
            <fieldset className="rounded-2xl border border-[#EBE6DF] p-5 flex flex-col gap-4">
              <legend className="px-2 text-sm font-semibold text-foreground/70">
                عنوان التوصيل
              </legend>

              {/* Wilaya */}
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

              {/* Commune — se remplit après sélection wilaya */}
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

              <Input
                label={t.checkout.address}
                required
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                error={errors.address}
                placeholder={t.checkout.addressPlaceholder}
                autoComplete="street-address"
              />

              {/* Note optionnelle */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  {t.checkout.note}
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                  placeholder={t.checkout.notePlaceholder}
                  rows={2}
                  className="w-full rounded-xl border border-[#EBE6DF] bg-white px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-[#E93D91] focus:outline-none focus:ring-2 focus:ring-[#E93D91]/20 transition-colors resize-none"
                />
              </div>
            </fieldset>

            {/* Paiement */}
            <div className="rounded-2xl border-2 border-[#CEA060]/30 bg-[#FEF9F0] p-5">
              <h3 className="mb-2 font-semibold text-[#9F6F3B]">{t.checkout.paymentMethod}</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#E93D91] bg-[#E93D91]">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.checkout.cod}</p>
                  <p className="text-xs text-foreground/60">{t.checkout.codDescription}</p>
                </div>
              </div>
            </div>

            {/* Erreur globale */}
            {errors._form && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {errors._form}
              </p>
            )}
          </div>

          {/* ── Récapitulatif commande (2/5) ──────────────────────── */}
          <div className="md:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-[#EBE6DF] p-5">
              <h2 className="mb-4 font-semibold">{t.checkout.orderSummary}</h2>

              {/* Articles */}
              <div className="flex flex-col divide-y divide-[#EBE6DF]">
                {items.map((item) => {
                  const price = getEffectivePrice(item.regularPrice, item.salePrice)
                  return (
                    <div
                      key={`${item.productId}-${item.variationIndex}`}
                      className="flex gap-3 py-3"
                    >
                      {/* Miniature */}
                      <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-[#F7F5F2]">
                        {item.productImage ? (
                          <Image src={item.productImage} alt={item.productNameAr} fill sizes="48px" className="object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-foreground/20 text-xs">؟</div>
                        )}
                        {/* Badge quantité */}
                        <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E93D91] text-[9px] text-white font-bold">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug">{item.productNameAr}</p>
                        <p className="text-xs text-foreground/50">{item.colorAr}{item.size && item.size !== 'UNIQUE' ? ` · ${item.size}` : ''}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground flex-shrink-0">{formatPrice(price * item.quantity)}</p>
                    </div>
                  )
                })}
              </div>

              {/* Totaux */}
              <div className="mt-4 flex flex-col gap-2 text-sm border-t border-[#EBE6DF] pt-4">
                <div className="flex justify-between">
                  <span className="text-foreground/60">{t.cart.subtotal}</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">{t.checkout.shippingFee}</span>
                  <span className="text-foreground/60">يُحدد لاحقاً</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-[#EBE6DF] pt-2 mt-1">
                  <span>{t.cart.total}</span>
                  <span className="text-[#E93D91]">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Bouton confirmer */}
              <Button
                type="submit"
                size="lg"
                className="mt-5 w-full"
                loading={loading}
              >
                {loading ? t.checkout.processing : t.checkout.placeOrder}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
