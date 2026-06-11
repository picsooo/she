'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

interface Variation {
  id?: string; colorAr?: string; size?: string
  regularPrice?: number; salePrice?: number
  stock?: number; inStock?: boolean
}

interface Product {
  id: string; nameAr: string; nameFr?: string; status: string
  category?: Array<{ id: string; nameAr?: string; name?: string }>
  images?: Array<{ image?: { url?: string; thumbnailURL?: string } }>
  variations?: Variation[]
  updatedAt: string; sku?: string
}

interface Category { id: string; nameAr: string; name?: string }

const STATUS_OPTIONS = [
  { value: '',          label: 'Tous les statuts' },
  { value: 'published', label: 'Publiés'          },
  { value: 'draft',     label: 'Brouillons'        },
  { value: 'archived',  label: 'Archivés'          },
]

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: 'Publié',    color: '#065F46', bg: '#D1FAE5' },
  draft:     { label: 'Brouillon', color: '#B45309', bg: '#FEF3C7' },
  archived:  { label: 'Archivé',   color: '#6D7175', bg: '#F1F1F1' },
}

const SORT_OPTIONS = [
  { value: '-updatedAt', label: 'Récemment modifié' },
  { value: '-createdAt', label: 'Plus récents'       },
  { value: 'nameAr',     label: 'Nom A→Z'           },
  { value: '-nameAr',    label: 'Nom Z→A'           },
]

function getPriceRange(variations?: Variation[]): string {
  if (!variations?.length) return '—'
  const prices = variations.map(v => v.salePrice ?? v.regularPrice ?? 0).filter(Boolean)
  if (!prices.length) return '—'
  const min = Math.min(...prices), max = Math.max(...prices)
  const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(n)
  return min === max ? fmt(min) + ' DA' : fmt(min) + ' – ' + fmt(max) + ' DA'
}

function getStockStatus(variations?: Variation[]): { label: string; color: string; count: number; total: number } {
  if (!variations?.length) return { label: '—', color: '#D0D0D0', count: 0, total: 0 }
  const inStock = variations.filter(v => v.inStock).length
  if (inStock === 0)               return { label: 'Rupture',              color: '#EF4444', count: 0,       total: variations.length }
  if (inStock < variations.length) return { label: `${inStock}/${variations.length}`, color: '#F59E0B', count: inStock, total: variations.length }
  return                                  { label: 'En stock',             color: '#10B981', count: inStock, total: variations.length }
}

// ── Paneau de modification groupée ───────────────────────────────────────────
interface BulkPanelProps {
  selectedIds: Set<string>
  onClear: () => void
  onRefresh: () => void
}

function BulkPanel({ selectedIds, onClear, onRefresh }: BulkPanelProps) {
  const [tab,          setTab]         = useState<'status' | 'price' | 'stock' | 'delete'>('status')
  const [loading,      setLoading]     = useState(false)
  const [result,       setResult]      = useState<string | null>(null)

  // statut groupé
  const [bulkStatus, setBulkStatus] = useState('published')

  // prix groupé
  const [priceTarget, setPriceTarget] = useState<'regular' | 'promo'>('regular')
  const [priceMode,   setPriceMode]   = useState<'set' | 'pct_inc' | 'pct_dec' | 'clear_promo'>('set')
  const [priceValue,  setPriceValue]  = useState('')

  // stock groupé
  const [stockMode,  setStockMode]  = useState<'set' | 'add' | 'sub'>('set')
  const [stockValue, setStockValue] = useState('')

  const n = selectedIds.size

  async function applyStatus() {
    setLoading(true); setResult(null)
    let ok = 0
    for (const id of selectedIds) {
      const r = await fetch(`/api/boutique-admin/products/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: bulkStatus }),
      })
      if (r.ok) ok++
    }
    setResult(`✅ ${ok}/${n} produits mis à jour`)
    setLoading(false); onRefresh()
  }

  async function applyPrice() {
    const val = parseFloat(priceValue)
    if (priceMode !== 'clear_promo' && (isNaN(val) || val <= 0)) {
      setResult('❌ Valeur invalide'); return
    }
    setLoading(true); setResult(null)
    let ok = 0
    for (const id of selectedIds) {
      // charger le produit complet pour avoir les variations
      const prod = await fetch(`/api/boutique-admin/products/${id}?depth=0`).then(r => r.json())
      const variations: Variation[] = prod.variations ?? []
      const updated = variations.map(v => {
        const base = { ...v }
        if (priceMode === 'clear_promo') {
          base.salePrice = undefined
        } else if (priceTarget === 'regular') {
          if (priceMode === 'set')     base.regularPrice = val
          if (priceMode === 'pct_inc') base.regularPrice = Math.round((v.regularPrice ?? 0) * (1 + val / 100))
          if (priceMode === 'pct_dec') base.regularPrice = Math.round((v.regularPrice ?? 0) * (1 - val / 100))
        } else {
          if (priceMode === 'set')     base.salePrice = val
          if (priceMode === 'pct_inc') base.salePrice = Math.round(((v.salePrice ?? v.regularPrice ?? 0)) * (1 + val / 100))
          if (priceMode === 'pct_dec') base.salePrice = Math.round(((v.salePrice ?? v.regularPrice ?? 0)) * (1 - val / 100))
        }
        return base
      })
      const r = await fetch(`/api/boutique-admin/products/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variations: updated }),
      })
      if (r.ok) ok++
    }
    setResult(`✅ ${ok}/${n} produits mis à jour`)
    setLoading(false); onRefresh()
  }

  async function applyStock() {
    const val = parseInt(stockValue, 10)
    if (isNaN(val) || val < 0) { setResult('❌ Valeur invalide'); return }
    setLoading(true); setResult(null)
    let ok = 0
    for (const id of selectedIds) {
      const prod = await fetch(`/api/boutique-admin/products/${id}?depth=0`).then(r => r.json())
      const variations: Variation[] = prod.variations ?? []
      const updated = variations.map(v => {
        const base = { ...v }
        if (stockMode === 'set') base.stock = val
        if (stockMode === 'add') base.stock = (v.stock ?? 0) + val
        if (stockMode === 'sub') base.stock = Math.max(0, (v.stock ?? 0) - val)
        base.inStock = (base.stock ?? 0) > 0
        return base
      })
      const r = await fetch(`/api/boutique-admin/products/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variations: updated }),
      })
      if (r.ok) ok++
    }
    setResult(`✅ ${ok}/${n} produits mis à jour`)
    setLoading(false); onRefresh()
  }

  async function applyDelete() {
    if (!confirm(`Supprimer définitivement ${n} produit(s) ?`)) return
    setLoading(true); setResult(null)
    let ok = 0
    for (const id of selectedIds) {
      const r = await fetch(`/api/boutique-admin/products/${id}`, { method: 'DELETE' })
      if (r.ok) ok++
    }
    setResult(`✅ ${ok} produit(s) supprimé(s)`)
    setLoading(false); onClear(); onRefresh()
  }

  const TABS: { key: typeof tab; label: string; icon: string }[] = [
    { key: 'status', label: 'Statut',    icon: '🏷️' },
    { key: 'price',  label: 'Prix',      icon: '💰' },
    { key: 'stock',  label: 'Stock',     icon: '📦' },
    { key: 'delete', label: 'Supprimer', icon: '🗑️' },
  ]

  return (
    <div style={{
      width: 260, minWidth: 260, flexShrink: 0,
      background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      alignSelf: 'flex-start', position: 'sticky', top: 16,
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Modification groupée</div>
          <div style={{ fontSize: 11, color: '#E93D91', fontWeight: 600, marginTop: 2 }}>{n} produit{n > 1 ? 's' : ''} sélectionné{n > 1 ? 's' : ''}</div>
        </div>
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9A9A9A', lineHeight: 1 }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #F1F1F1' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResult(null) }}
            style={{
              flex: 1, padding: '8px 2px', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#FEF3F8' : 'transparent',
              color: tab === t.key ? '#E93D91' : '#9A9A9A',
              borderBottom: tab === t.key ? '2px solid #E93D91' : '2px solid transparent',
              transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div style={{ padding: 16 }}>

        {/* ── Statut ── */}
        {tab === 'status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nouveau statut</label>
            {[
              { value: 'published', label: '✅ Publié'    },
              { value: 'draft',     label: '📝 Brouillon' },
              { value: 'archived',  label: '📦 Archivé'   },
            ].map(s => (
              <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${bulkStatus === s.value ? '#E93D91' : '#E3E5E7'}`, background: bulkStatus === s.value ? '#FEF3F8' : '#fff', fontSize: 12, fontWeight: 500, transition: 'all 0.15s' }}>
                <input type="radio" name="bulk-status" value={s.value} checked={bulkStatus === s.value} onChange={() => setBulkStatus(s.value)} style={{ accentColor: '#E93D91' }} />
                {s.label}
              </label>
            ))}
            <button onClick={applyStatus} disabled={loading} style={APPLY_BTN}>
              {loading ? '⏳ En cours…' : `Appliquer à ${n} produit${n > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* ── Prix ── */}
        {tab === 'price' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Cible */}
            <div>
              <label style={FIELD_LABEL}>Modifier</label>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                {[
                  { value: 'regular', label: 'Prix normal' },
                  { value: 'promo',   label: 'Prix promo'  },
                ].map(t => (
                  <button key={t.value} onClick={() => setPriceTarget(t.value as typeof priceTarget)}
                    style={{ flex: 1, padding: '6px 4px', fontSize: 10, fontWeight: 600, borderRadius: 7, border: `1.5px solid ${priceTarget === t.value ? '#E93D91' : '#E3E5E7'}`, background: priceTarget === t.value ? '#FEF3F8' : '#fff', color: priceTarget === t.value ? '#E93D91' : '#6D7175', cursor: 'pointer' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label style={FIELD_LABEL}>Mode</label>
              <select value={priceMode} onChange={e => setPriceMode(e.target.value as typeof priceMode)}
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E3E5E7', fontSize: 12, outline: 'none' }}>
                <option value="set">Définir à…</option>
                <option value="pct_inc">Augmenter de %</option>
                <option value="pct_dec">Baisser de %</option>
                {priceTarget === 'promo' && <option value="clear_promo">Supprimer la promo</option>}
              </select>
            </div>

            {priceMode !== 'clear_promo' && (
              <div>
                <label style={FIELD_LABEL}>{priceMode === 'set' ? 'Montant (DA)' : 'Pourcentage'}</label>
                <input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)} min={0}
                  placeholder={priceMode === 'set' ? 'ex: 3500' : 'ex: 10'}
                  style={{ width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E3E5E7', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ fontSize: 10, color: '#9A9A9A', background: '#F9F9F9', borderRadius: 7, padding: '6px 8px', lineHeight: 1.5 }}>
              S'applique à <strong>toutes les variations</strong> des produits sélectionnés.
            </div>

            <button onClick={applyPrice} disabled={loading} style={APPLY_BTN}>
              {loading ? '⏳ En cours…' : `Appliquer à ${n} produit${n > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* ── Stock ── */}
        {tab === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={FIELD_LABEL}>Action</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {[
                  { value: 'set', label: 'Définir à…'   },
                  { value: 'add', label: 'Ajouter…'      },
                  { value: 'sub', label: 'Soustraire…'   },
                ].map(m => (
                  <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${stockMode === m.value ? '#E93D91' : '#E3E5E7'}`, background: stockMode === m.value ? '#FEF3F8' : '#fff', fontSize: 12, fontWeight: 500, transition: 'all 0.15s' }}>
                    <input type="radio" name="bulk-stock" value={m.value} checked={stockMode === m.value} onChange={() => setStockMode(m.value as typeof stockMode)} style={{ accentColor: '#E93D91' }} />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={FIELD_LABEL}>Quantité</label>
              <input type="number" value={stockValue} onChange={e => setStockValue(e.target.value)} min={0}
                placeholder="ex: 10"
                style={{ width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #E3E5E7', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: 10, color: '#9A9A9A', background: '#F9F9F9', borderRadius: 7, padding: '6px 8px', lineHeight: 1.5 }}>
              S'applique à <strong>toutes les variations</strong>. "Disponible" mis à jour automatiquement.
            </div>
            <button onClick={applyStock} disabled={loading} style={APPLY_BTN}>
              {loading ? '⏳ En cours…' : `Appliquer à ${n} produit${n > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* ── Supprimer ── */}
        {tab === 'delete' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 12, fontSize: 12, color: '#991B1B', lineHeight: 1.6 }}>
              ⚠️ Vous allez supprimer <strong>{n} produit{n > 1 ? 's' : ''}</strong> définitivement. Cette action est <strong>irréversible</strong>.
            </div>
            <button onClick={applyDelete} disabled={loading}
              style={{ ...APPLY_BTN, background: '#EF4444', borderColor: '#EF4444' }}>
              {loading ? '⏳ Suppression…' : `🗑️ Supprimer ${n} produit${n > 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* Résultat */}
        {result && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: result.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: result.startsWith('✅') ? '#065F46' : '#991B1B', fontSize: 12, fontWeight: 600 }}>
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

const FIELD_LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6D7175', textTransform: 'uppercase', letterSpacing: '0.06em' }
const APPLY_BTN: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: 9, background: '#E93D91', border: '1.5px solid #E93D91', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'opacity 0.15s' }

// ── Modal Stock par produit ───────────────────────────────────────────────────
interface StockModalProps {
  product: Product
  onClose: () => void
  onSaved: () => void
}

function StockModal({ product, onClose, onSaved }: StockModalProps) {
  // Copie locale des variations pour édition
  const [variations, setVariations] = useState<Variation[]>(
    (product.variations ?? []).map(v => ({ ...v }))
  )
  const [globalQty, setGlobalQty]   = useState('')
  const [saving,    setSaving]      = useState(false)
  const [result,    setResult]      = useState<string | null>(null)

  // Grouper les variations par couleur pour l'affichage
  const colors = [...new Set(variations.map(v => v.colorAr ?? '—'))]

  const setVarStock = (idx: number, qty: number) => {
    setVariations(prev => prev.map((v, i) =>
      i === idx ? { ...v, stock: qty, inStock: qty > 0 } : v
    ))
  }

  // Appliquer la même quantité à toutes les variations
  const applyGlobal = () => {
    const qty = parseInt(globalQty, 10)
    if (isNaN(qty) || qty < 0) return
    setVariations(prev => prev.map(v => ({ ...v, stock: qty, inStock: qty > 0 })))
    setGlobalQty('')
  }

  // Appliquer une quantité à toutes les variations d'une couleur
  const applyToColor = (color: string, qty: number) => {
    setVariations(prev => prev.map(v =>
      (v.colorAr ?? '—') === color ? { ...v, stock: qty, inStock: qty > 0 } : v
    ))
  }

  const save = async () => {
    setSaving(true); setResult(null)
    const r = await fetch(`/api/boutique-admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variations }),
    })
    setSaving(false)
    if (r.ok) {
      setResult('✅ Stock mis à jour !')
      onSaved()
      setTimeout(onClose, 900)
    } else {
      setResult('❌ Erreur lors de la sauvegarde')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 18,
        width: '100%', maxWidth: 600, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>📦 Gestion du stock</div>
            <div style={{ fontSize: 12, color: '#6D7175', marginTop: 3, maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.nameAr}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9A9A9A', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Zone "Appliquer à toutes les variations" */}
        <div style={{ padding: '14px 20px', background: '#F8F9FF', borderBottom: '1px solid #E8ECF4', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4A3DBC', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            ⚡ Appliquer à toutes les variations
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" min={0} value={globalQty}
              onChange={e => setGlobalQty(e.target.value)}
              placeholder="Quantité pour tout le produit…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 9, border: '1.5px solid #C7D2FE', fontSize: 13, outline: 'none', background: '#fff' }}
              onKeyDown={e => e.key === 'Enter' && applyGlobal()}
            />
            <button onClick={applyGlobal} style={{ padding: '9px 18px', borderRadius: 9, background: '#4A3DBC', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Appliquer à tout
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: '#6D7175' }}>
            {variations.length} variation{variations.length > 1 ? 's' : ''} · {variations.filter(v => v.inStock).length} en stock actuellement
          </div>
        </div>

        {/* Liste des variations groupées par couleur */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {colors.map(color => {
            const colorVars = variations.map((v, i) => ({ v, i })).filter(({ v }) => (v.colorAr ?? '—') === color)
            const colorTotal = colorVars.reduce((s, { v }) => s + (v.stock ?? 0), 0)

            return (
              <div key={color} style={{ marginBottom: 18 }}>
                {/* En-tête couleur avec action rapide */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E93D91' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{color}</span>
                    <span style={{ fontSize: 11, color: '#9A9A9A' }}>({colorTotal} en stock)</span>
                  </div>
                  {/* Champ "même quantité pour toute la couleur" */}
                  <ColorQuickSet color={color} onApply={qty => applyToColor(color, qty)} />
                </div>

                {/* Variations de cette couleur */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                  {colorVars.map(({ v, i }) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: `1.5px solid ${v.inStock ? '#A7F3D0' : '#FCA5A5'}`,
                      background: v.inStock ? '#F0FDF4' : '#FEF2F2',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', marginBottom: 6 }}>
                        {v.size && v.size !== 'UNIQUE' ? v.size : 'Taille unique'}
                      </div>
                      <input
                        type="number" min={0}
                        value={v.stock ?? 0}
                        onChange={e => setVarStock(i, parseInt(e.target.value, 10) || 0)}
                        style={{
                          width: '100%', padding: '6px 10px', borderRadius: 7,
                          border: `1.5px solid ${v.inStock ? '#6EE7B7' : '#FCA5A5'}`,
                          background: '#fff', fontSize: 14, fontWeight: 700,
                          textAlign: 'center', outline: 'none', boxSizing: 'border-box',
                          color: v.inStock ? '#065F46' : '#991B1B',
                        }}
                      />
                      <div style={{ fontSize: 10, textAlign: 'center', marginTop: 4, color: v.inStock ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                        {v.inStock ? '✓ En stock' : '✗ Rupture'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F1F1', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          {result && (
            <div style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: result.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: result.startsWith('✅') ? '#065F46' : '#991B1B' }}>
              {result}
            </div>
          )}
          {!result && <div style={{ flex: 1 }} />}
          <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 9, background: '#F5F5F5', border: 'none', color: '#6D7175', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 22px', borderRadius: 9, background: saving ? '#F9A8D4' : '#E93D91', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Petit champ inline pour définir la même quantité à toute une couleur
function ColorQuickSet({ color, onApply }: { color: string; onApply: (qty: number) => void }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <input
        type="number" min={0} value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Qté"
        style={{ width: 60, padding: '4px 8px', borderRadius: 7, border: '1.5px solid #E3E5E7', fontSize: 12, outline: 'none', textAlign: 'center' }}
        onKeyDown={e => { if (e.key === 'Enter' && val !== '') { onApply(parseInt(val, 10) || 0); setVal('') } }}
      />
      <button
        onClick={() => { if (val !== '') { onApply(parseInt(val, 10) || 0); setVal('') } }}
        style={{ padding: '4px 10px', borderRadius: 7, background: '#FEF3F8', border: '1px solid #FCE7F3', color: '#E93D91', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
      >
        → {color.length > 8 ? 'couleur' : color}
      </button>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products,        setProducts]       = useState<Product[]>([])
  const [total,           setTotal]          = useState(0)
  const [loading,         setLoading]        = useState(true)
  const [search,          setSearch]         = useState('')
  const [statusFilter,    setStatusFilter]   = useState('')
  const [categoryFilter,  setCategoryFilter] = useState('')
  const [sortBy,          setSortBy]         = useState('-updatedAt')
  const [stockFilter,     setStockFilter]    = useState<'all' | 'instock' | 'outofstock'>('all')
  const [page,            setPage]           = useState(1)
  const [selected,        setSelected]       = useState<Set<string>>(new Set())
  const [deletingId,      setDeletingId]     = useState<string | null>(null)
  const [duplicatingId,   setDuplicatingId]  = useState<string | null>(null)
  const [categories,      setCategories]     = useState<Category[]>([])
  const perPage = 15

  useEffect(() => {
    fetch('/api/boutique-admin/categories?limit=100&sort=nameAr&depth=0')
      .then(r => r.json()).then(d => setCategories(d.docs ?? [])).catch(() => {})
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const where: Record<string, unknown> = {}
      if (statusFilter)   where.status   = { equals: statusFilter }
      if (categoryFilter) where.category = { equals: categoryFilter }
      if (search) where.or = [{ nameAr: { like: search } }, { nameFr: { like: search } }, { sku: { like: search } }]
      const params = new URLSearchParams({ limit: String(perPage), page: String(page), sort: sortBy, depth: '2', where: JSON.stringify(where) })
      const data = await fetch('/api/boutique-admin/products?' + params).then(r => r.json())
      setProducts(data.docs ?? [])
      setTotal(data.totalDocs ?? 0)
    } finally { setLoading(false) }
  }, [search, statusFilter, categoryFilter, sortBy, page])

  useEffect(() => { loadProducts() }, [loadProducts])

  async function deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    setDeletingId(id)
    await fetch(`/api/boutique-admin/products/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    loadProducts()
  }

  async function duplicateProduct(id: string) {
    setDuplicatingId(id)
    try {
      const res = await fetch(`/api/boutique-admin/products/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Échec')
      const data = await res.json()
      loadProducts()
      // Ouvrir directement la fiche de la copie dans un nouvel onglet
      window.open(`/boutique-admin/products/${data.doc.id}`, '_blank')
    } catch {
      alert('Erreur lors de la duplication')
    } finally {
      setDuplicatingId(null)
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/boutique-admin/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    loadProducts()
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const allSelected = products.length > 0 && products.every(p => selected.has(p.id))
  const resetFilters = () => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); setStockFilter('all'); setPage(1) }
  const hasActiveFilters = !!(search || statusFilter || categoryFilter || stockFilter !== 'all')
  const totalPages = Math.ceil(total / perPage)

  const displayProducts = stockFilter === 'all' ? products : products.filter(p => {
    const inStock = (p.variations ?? []).some(v => v.inStock)
    return stockFilter === 'instock' ? inStock : !inStock
  })

  const showBulkPanel = selected.size > 0

  return (
    <div style={{ animation: 'fadeIn 0.25s ease' }}>

      {/* Layout : panel gauche + contenu principal */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Paneau bulk edit ── */}
        {showBulkPanel && (
          <BulkPanel
            selectedIds={selected}
            onClear={() => setSelected(new Set())}
            onRefresh={loadProducts}
          />
        )}

        {/* ── Contenu principal ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Titre + bouton */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Produits</h1>
              <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>{total} produit{total > 1 ? 's' : ''} au total</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selected.size > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#E93D91', background: '#FEF3F8', border: '1px solid #FCE7F3', borderRadius: 8, padding: '6px 12px' }}>
                  {selected.size} sélectionné{selected.size > 1 ? 's' : ''} — panneau à gauche →
                </span>
              )}
              <Link href="/boutique-admin/products/new" className="admin-btn admin-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nouveau produit
              </Link>
            </div>
          </div>

          {/* Toolbar filtres */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9A9A9A', pointerEvents: 'none' }}>🔍</span>
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Rechercher un produit…"
                className="admin-input" style={{ paddingLeft: 36 }}
              />
            </div>

            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1) }} className="admin-select"
              style={{ minWidth: 180, color: categoryFilter ? '#CEA060' : undefined, borderColor: categoryFilter ? '#CEA060' : undefined }}>
              <option value="">🗂️ Toutes catégories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nameAr}{c.name && c.name !== c.nameAr ? ` (${c.name})` : ''}</option>
              ))}
            </select>

            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="admin-select"
              style={{ minWidth: 140 }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Filtre stock */}
            <div style={{ display: 'flex', gap: 4, background: '#F5F5F5', borderRadius: 8, padding: 3 }}>
              {[
                { value: 'all',        label: 'Tout'      },
                { value: 'instock',    label: '✅ Stock'   },
                { value: 'outofstock', label: '❌ Rupture' },
              ].map(s => (
                <button key={s.value} onClick={() => { setStockFilter(s.value as typeof stockFilter); setPage(1) }} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: stockFilter === s.value ? 600 : 400,
                  background: stockFilter === s.value ? '#fff' : 'transparent',
                  color: stockFilter === s.value ? '#1A1A1A' : '#6D7175',
                  border: 'none', cursor: 'pointer',
                  boxShadow: stockFilter === s.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>{s.label}</button>
              ))}
            </div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="admin-select" style={{ minWidth: 170 }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {hasActiveFilters && (
              <button onClick={resetFilters} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #FCA5A5', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer' }}>
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Badges filtres actifs */}
          {hasActiveFilters && (
            <div style={{ marginBottom: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {categoryFilter && categories.find(c => c.id === categoryFilter) && (
                <span className="admin-badge" style={{ background: '#FEF3C7', color: '#B45309' }}>🗂️ {categories.find(c => c.id === categoryFilter)?.nameAr}</span>
              )}
              {statusFilter && <span className="admin-badge" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>{STATUS_OPTIONS.find(s => s.value === statusFilter)?.label}</span>}
            </div>
          )}

          {/* Table */}
          <div className="admin-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E3E5E7', background: '#FAFAFA' }}>
                  <th style={TH}>
                    <input type="checkbox" checked={allSelected}
                      onChange={e => setSelected(e.target.checked ? new Set(products.map(p => p.id)) : new Set())}
                      style={{ accentColor: '#E93D91', cursor: 'pointer' }} />
                  </th>
                  {['Image', 'Produit', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </td></tr>
                ) : displayProducts.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: '64px', textAlign: 'center', color: '#9A9A9A' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                    <div style={{ marginBottom: 10, fontWeight: 500 }}>Aucun produit trouvé</div>
                    {hasActiveFilters && <button onClick={resetFilters} className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Effacer les filtres</button>}
                  </td></tr>
                ) : displayProducts.map(p => {
                  const imgRaw   = p.images?.[0]?.image
                  // Les URLs Payload /api/media/file/ retournent 403 — utiliser /media/ (fichiers statiques public/)
                  const toPublicUrl = (u?: string | null) => u ? u.replace(/^https?:\/\/[^/]+\/api\/media\/file\//, '/media/') : undefined
                  const img      = imgRaw ? { ...imgRaw, url: toPublicUrl(imgRaw.url), thumbnailURL: toPublicUrl(imgRaw.thumbnailURL) } : undefined
                  const st       = STATUS_STYLE[p.status] ?? STATUS_STYLE.draft
                  const stock    = getStockStatus(p.variations)
                  const price    = getPriceRange(p.variations)
                  const cat      = p.category?.[0] as { nameAr?: string; name?: string } | undefined
                  const catLabel = cat?.nameAr ?? cat?.name ?? '—'

                  return (
                    <tr key={p.id} className="admin-row-hover"
                      style={{ borderBottom: '1px solid #F1F1F1', background: selected.has(p.id) ? '#FEF3F8' : undefined, opacity: deletingId === p.id ? 0.4 : 1 }}
                    >
                      <td style={TD}>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ accentColor: '#E93D91', cursor: 'pointer' }} />
                      </td>
                      <td style={TD}>
                        <div style={{ width: 50, height: 50, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9', border: '1px solid #E3E5E7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {img?.url
                            ? <img src={img.thumbnailURL ?? img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 22 }}>👗</span>
                          }
                        </div>
                      </td>
                      <td style={TD}>
                        <div style={{ fontWeight: 600, color: '#1A1A1A', maxWidth: 220, lineHeight: 1.4 }}>{p.nameAr}</div>
                        {p.sku && <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2, fontFamily: 'monospace' }}>SKU: {p.sku}</div>}
                        <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{p.variations?.length ?? 0} variation{(p.variations?.length ?? 0) > 1 ? 's' : ''}</div>
                      </td>
                      <td style={TD}>
                        {catLabel !== '—' ? (
                          <span className="admin-badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>{catLabel}</span>
                        ) : <span style={{ color: '#D0D0D0' }}>—</span>}
                      </td>
                      <td style={{ ...TD, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap', fontSize: 12 }}>{price}</td>
                      <td style={TD}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: stock.color }}>{stock.label}</span>
                          {stock.total > 0 && (
                            <div style={{ width: 48, height: 3, background: '#E3E5E7', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(stock.count / stock.total) * 100}%`, background: stock.color, borderRadius: 10 }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={TD}>
                        <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                          style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${st.color}50`, background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                          <option value="published">✅ Publié</option>
                          <option value="draft">📝 Brouillon</option>
                          <option value="archived">📦 Archivé</option>
                        </select>
                      </td>
                      <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/boutique-admin/products/${p.id}`} style={{ padding: '6px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                            ✏️ Modifier
                          </Link>
                          <button
                            onClick={() => duplicateProduct(p.id)}
                            disabled={duplicatingId === p.id}
                            title="Dupliquer ce produit (crée une copie en brouillon)"
                            style={{ padding: '6px 10px', background: duplicatingId === p.id ? '#F3F4F6' : '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: duplicatingId === p.id ? 'wait' : 'pointer' }}>
                            {duplicatingId === p.id ? '⏳' : '📋'}
                          </button>
                          <button onClick={() => deleteProduct(p.id)} disabled={deletingId === p.id} style={{ padding: '6px 10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={PAGE_BTN}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ ...PAGE_BTN, background: p === page ? '#1A1A1A' : '#fff', color: p === page ? '#fff' : '#6D7175', border: p === page ? '1px solid #1A1A1A' : '1px solid #E3E5E7', fontWeight: p === page ? 700 : 400 }}>{p}</button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={PAGE_BTN}>›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TH: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }
const TD: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle' }
const PAGE_BTN: React.CSSProperties = { minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #E3E5E7', background: '#fff', color: '#6D7175', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }
