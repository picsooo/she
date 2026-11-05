'use client'

import React, { useEffect, useState, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Variation {
  regularPrice?: number
  salePrice?: number
}

interface AdminProduct {
  id: string | number
  nameAr?: string
  nameFr?: string
  variations?: Variation[]
  images?: Array<{ image?: { url?: string; thumbnailURL?: string } }>
}

interface OfferState {
  enabled: boolean
  titleAr: string
  subtitleAr: string
  packQuantity: number
  packPrice: number
  repeatable: boolean
}

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'

// Prix effectif d'un produit = plus petit prix parmi ses variations (promo prise en compte)
function minPriceOf(product: AdminProduct): number {
  const prices = (product.variations ?? [])
    .map(v => (v.salePrice && v.salePrice > 0 && v.salePrice < (v.regularPrice ?? 0) ? v.salePrice : v.regularPrice ?? 0))
    .filter(p => p > 0)
  return prices.length ? Math.min(...prices) : 0
}

function thumbOf(product: AdminProduct): string | null {
  const img = product.images?.[0]?.image
  return img?.thumbnailURL ?? img?.url ?? null
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OffersPage() {
  const [offer, setOffer] = useState<OfferState>({
    enabled: false,
    titleAr: 'قطعتان بـ 10.000 دج',
    subtitleAr: '',
    packQuantity: 2,
    packPrice: 10000,
    repeatable: true,
  })
  const [selected, setSelected] = useState<AdminProduct[]>([])
  const [search,   setSearch]   = useState('')
  const [results,  setResults]  = useState<AdminProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Chargement initial ─────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/boutique-admin/offers')
        const data = await res.json()
        const g = data.offer ?? {}
        setOffer({
          enabled:      g.enabled === true,
          titleAr:      g.titleAr ?? 'قطعتان بـ 10.000 دج',
          subtitleAr:   g.subtitleAr ?? '',
          packQuantity: g.packQuantity ?? 2,
          packPrice:    g.packPrice ?? 10000,
          repeatable:   g.repeatable !== false,
        })
        // depth 1 → les produits arrivent en objets complets
        const prods = (g.products ?? []).filter((p: unknown) => typeof p === 'object' && p !== null)
        setSelected(prods as AdminProduct[])
      } catch {
        showToast('Chargement impossible', false)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ── Recherche produits (debounce 300ms) ────────────────────────────────
  const runSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const where = JSON.stringify({
        or: [
          { nameAr: { like: term.trim() } },
          { nameFr: { like: term.trim() } },
        ],
      })
      const res = await fetch(`/api/boutique-admin/products?limit=12&depth=1&where=${encodeURIComponent(where)}`)
      const data = await res.json()
      setResults(data.docs ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search, runSearch])

  const isSelected = (id: string | number) => selected.some(p => String(p.id) === String(id))

  const addProduct = (p: AdminProduct) => {
    if (isSelected(p.id)) return
    setSelected(prev => [...prev, p])
  }

  const removeProduct = (id: string | number) => {
    setSelected(prev => prev.filter(p => String(p.id) !== String(id)))
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────────
  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/boutique-admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...offer, products: selected.map(p => p.id) }),
      })
      if (res.ok) showToast('Offre enregistrée ✅', true)
      else showToast('Échec de l\'enregistrement', false)
    } catch {
      showToast('Échec de l\'enregistrement', false)
    } finally {
      setSaving(false)
    }
  }

  // ── Aperçu du calcul ───────────────────────────────────────────────────
  // On prend les N articles les moins chers de la sélection : c'est le pire cas
  // pour la marge, donc le chiffre que le client doit voir avant d'activer.
  const unitPrices = selected.map(minPriceOf).filter(p => p > 0).sort((a, b) => a - b)
  const sampleUnits = unitPrices.slice(0, offer.packQuantity)
  const sampleTotal = sampleUnits.reduce((s, p) => s + p, 0)
  const hasFullSample = sampleUnits.length === offer.packQuantity
  const saving_ = hasFullSample ? sampleTotal - offer.packPrice : 0

  if (loading) {
    return <div style={{ padding: 32, color: '#6D7175' }}>Chargement…</div>
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>
      {/* En-tête */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>🎁 Offre pack</h1>
        <p style={{ fontSize: 13, color: '#6D7175', marginTop: 6 }}>
          « 2 articles achetés = prix fixe ». La remise est appliquée automatiquement dans le panier
          et recalculée côté serveur à la commande.
        </p>
      </div>

      {/* Interrupteur principal */}
      <Card>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={offer.enabled}
            onChange={e => setOffer({ ...offer, enabled: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: '#E93D91', cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
              {offer.enabled ? 'Offre active sur le site' : 'Offre désactivée'}
            </div>
            <div style={{ fontSize: 12, color: '#6D7175', marginTop: 2 }}>
              Décocher arrête l&apos;offre immédiatement, sans perdre la sélection de produits.
            </div>
          </div>
        </label>
      </Card>

      {/* Règle de l'offre */}
      <Card title="Règle de l'offre">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field
            label="Nombre d'articles"
            type="number"
            value={String(offer.packQuantity)}
            onChange={v => setOffer({ ...offer, packQuantity: Math.max(2, parseInt(v, 10) || 2) })}
            hint="Minimum 2"
          />
          <Field
            label="Prix du pack (DA)"
            type="number"
            value={String(offer.packPrice)}
            onChange={v => setOffer({ ...offer, packPrice: Math.max(0, parseInt(v, 10) || 0) })}
            hint="Ex: 10000"
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 14 }}>
          <input
            type="checkbox"
            checked={offer.repeatable}
            onChange={e => setOffer({ ...offer, repeatable: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#E93D91', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#1A1A1A' }}>
            L&apos;offre se répète —{' '}
            <span style={{ color: '#6D7175' }}>
              {offer.repeatable
                ? `${offer.packQuantity * 2} articles = ${fmt(offer.packPrice * 2)}`
                : 'une seule fois par commande'}
            </span>
          </span>
        </label>

        {/* Aperçu chiffré */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: hasFullSample && saving_ > 0 ? '#F0FDF4' : '#F9F9F9',
          border: `1px solid ${hasFullSample && saving_ > 0 ? '#A7F3D0' : '#E3E5E7'}`,
        }}>
          {!hasFullSample ? (
            <span style={{ fontSize: 12, color: '#6D7175' }}>
              Sélectionne au moins {offer.packQuantity} produits pour voir l&apos;aperçu du calcul.
            </span>
          ) : saving_ > 0 ? (
            <span style={{ fontSize: 13, color: '#065F46' }}>
              Les {offer.packQuantity} articles les moins chers de la sélection :{' '}
              <strong>{sampleUnits.map(fmt).join(' + ')} = {fmt(sampleTotal)}</strong> →{' '}
              <strong>{fmt(offer.packPrice)}</strong> · la cliente économise <strong>{fmt(saving_)}</strong>
            </span>
          ) : (
            <span style={{ fontSize: 13, color: '#B45309' }}>
              ⚠️ Le prix du pack ({fmt(offer.packPrice)}) est supérieur ou égal au prix réel de{' '}
              {offer.packQuantity} articles ({fmt(sampleTotal)}) : aucune remise ne sera appliquée
              sur ces articles.
            </span>
          )}
        </div>
      </Card>

      {/* Textes affichés */}
      <Card title="Texte affiché sur le site (arabe)">
        <Field
          label="Titre"
          value={offer.titleAr}
          onChange={v => setOffer({ ...offer, titleAr: v })}
          hint="Affiché sur les produits concernés et dans le panier"
          rtl
        />
        <div style={{ height: 12 }} />
        <Field
          label="Sous-titre (optionnel)"
          value={offer.subtitleAr}
          onChange={v => setOffer({ ...offer, subtitleAr: v })}
          hint="Ex: اختاري أي قطعتين من التشكيلة"
          rtl
        />
      </Card>

      {/* Sélection des produits */}
      <Card title={`Produits concernés (${selected.length})`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit par nom… (ex: Ensemble Romy)"
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1.5px solid #E3E5E7', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />

        {/* Résultats de recherche */}
        {search.trim().length >= 2 && (
          <div style={{ marginTop: 10, border: '1px solid #E3E5E7', borderRadius: 10, overflow: 'hidden' }}>
            {searching ? (
              <div style={{ padding: 14, fontSize: 12, color: '#6D7175' }}>Recherche…</div>
            ) : results.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: '#6D7175' }}>Aucun produit trouvé</div>
            ) : (
              results.map(p => {
                const already = isSelected(p.id)
                return (
                  <div key={String(p.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderBottom: '1px solid #F1F1F1', background: already ? '#FAFAFA' : '#fff',
                  }}>
                    <Thumb url={thumbOf(p)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.nameAr || p.nameFr}
                      </div>
                      <div style={{ fontSize: 11, color: '#6D7175' }}>
                        {minPriceOf(p) > 0 ? fmt(minPriceOf(p)) : 'Prix non défini'}
                      </div>
                    </div>
                    <button
                      onClick={() => addProduct(p)}
                      disabled={already}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: 'none', cursor: already ? 'default' : 'pointer',
                        background: already ? '#F1F1F1' : '#E93D91',
                        color: already ? '#9A9A9A' : '#fff',
                      }}
                    >
                      {already ? 'Ajouté' : '+ Ajouter'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Produits sélectionnés */}
        <div style={{ marginTop: 16 }}>
          {selected.length === 0 ? (
            <div style={{
              padding: '18px 14px', borderRadius: 10, border: '1px dashed #E3E5E7',
              fontSize: 12, color: '#6D7175', textAlign: 'center',
            }}>
              Aucun produit dans l&apos;offre. Cherche-les ci-dessus et ajoute-les.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.map(p => (
                <div key={String(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  border: '1.5px solid #FCE7F3', background: '#FEF3F8', borderRadius: 10,
                }}>
                  <Thumb url={thumbOf(p)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nameAr || p.nameFr}
                    </div>
                    <div style={{ fontSize: 11, color: '#9F3A73' }}>
                      {minPriceOf(p) > 0 ? fmt(minPriceOf(p)) : 'Prix non défini'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeProduct(p.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 16, color: '#9A9A9A', lineHeight: 1, padding: 4,
                    }}
                    title="Retirer de l'offre"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Barre de sauvegarde */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: saving ? '#F9A8D4' : '#E93D91', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '⏳ Enregistrement…' : '💾 Enregistrer l\'offre'}
        </button>
        {toast && (
          <span style={{
            padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            background: toast.ok ? '#ECFDF5' : '#FEF2F2',
            color: toast.ok ? '#065F46' : '#991B1B',
          }}>
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Petits composants de présentation ────────────────────────────────────────
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E3E5E7', borderRadius: 14,
      padding: 18, marginBottom: 16,
    }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', marginBottom: 14 }}>{title}</div>
      )}
      {children}
    </div>
  )
}

function Field({
  label, value, onChange, hint, type = 'text', rtl = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
  type?: string
  rtl?: boolean
}) {
  return (
    <div>
      <label style={{
        fontSize: 11, fontWeight: 600, color: '#6D7175',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        dir={rtl ? 'rtl' : undefined}
        style={{
          width: '100%', marginTop: 5, padding: '9px 12px', borderRadius: 9,
          border: '1.5px solid #E3E5E7', fontSize: 13, outline: 'none', boxSizing: 'border-box',
        }}
      />
      {hint && <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function Thumb({ url }: { url: string | null }) {
  return (
    <div style={{
      width: 36, height: 44, borderRadius: 7, flexShrink: 0,
      background: '#F7F5F2', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 9, color: '#CEA060', fontWeight: 700 }}>SHE</span>
      )}
    </div>
  )
}
