'use client'
import React, { useEffect, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Variation {
  id?: string
  colorAr?: string
  size?: string
  regularPrice?: number
  salePrice?: number
  stock?: number
  inStock?: boolean
}

interface Product {
  id: string
  nameAr: string
  nameFr?: string
  status: string
  images?: Array<{ image?: { url?: string; thumbnailURL?: string } }>
  variations?: Variation[]
}

// ── StockModal — popup pour un produit ───────────────────────────────────────
function StockModal({ product, onClose, onSaved }: {
  product: Product
  onClose: () => void
  onSaved: () => void
}) {
  const [variations, setVariations] = useState<Variation[]>(product.variations ?? [])
  const [globalQty, setGlobalQty] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  // Grouper les variations par couleur
  const colorGroups = variations.reduce<Record<string, number[]>>((acc, v, i) => {
    const key = v.colorAr || 'Sans couleur'
    if (!acc[key]) acc[key] = []
    acc[key].push(i)
    return acc
  }, {})

  function setVariationStock(index: number, qty: number) {
    setVariations(prev => prev.map((v, i) =>
      i === index ? { ...v, stock: qty, inStock: qty > 0 } : v
    ))
  }

  function applyGlobalQty() {
    const qty = parseInt(globalQty, 10)
    if (isNaN(qty) || qty < 0) return
    setVariations(prev => prev.map(v => ({ ...v, stock: qty, inStock: qty > 0 })))
  }

  function applyColorQty(color: string, qty: number) {
    setVariations(prev => prev.map((v, i) =>
      (v.colorAr || 'Sans couleur') === color && colorGroups[color].includes(i)
        ? { ...v, stock: qty, inStock: qty > 0 }
        : v
    ))
  }

  async function save() {
    setSaving(true); setResult(null)
    const r = await fetch(`/api/boutique-admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variations }),
    })
    if (r.ok) {
      setResult('✅ Stock mis à jour')
      onSaved()
    } else {
      setResult('❌ Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  const totalInStock = variations.filter(v => v.inStock).length
  const totalVariations = variations.length

  return (
    // Overlay
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        animation: 'fadeIn 0.15s ease',
      }}>

        {/* En-tête */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid #F1F1F1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>📦 Stock — {product.nameAr}</div>
            <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 2 }}>
              {totalInStock}/{totalVariations} variation{totalVariations > 1 ? 's' : ''} en stock
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9A9A9A', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>

          {/* Appliquer à TOUTES les variations */}
          <div style={{
            background: 'linear-gradient(135deg, #FEF3F8, #FFF7FB)',
            border: '1.5px solid #FBCFE8', borderRadius: 12, padding: 14, marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E93D91', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Appliquer à toutes les variations
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number" min={0} value={globalQty} onChange={e => setGlobalQty(e.target.value)}
                placeholder="Quantité"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #FBCFE8', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <button
                onClick={applyGlobalQty}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #E93D91, #C4197A)',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                Appliquer tout
              </button>
            </div>
          </div>

          {/* Par couleur */}
          {Object.entries(colorGroups).map(([color, indices]) => {
            const colorStockInput = React.createRef<HTMLInputElement>()
            const colorInStock = indices.filter(i => variations[i]?.inStock).length

            return (
              <div key={color} style={{ marginBottom: 16 }}>
                {/* En-tête couleur */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  marginBottom: 8, paddingBottom: 8,
                  borderBottom: '1px solid #F1F1F1',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{color}</span>
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 600,
                      color: colorInStock === indices.length ? '#059669' : colorInStock === 0 ? '#DC2626' : '#D97706',
                    }}>
                      {colorInStock}/{indices.length} en stock
                    </span>
                  </div>
                  {/* Quick-set pour toute la couleur */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      ref={colorStockInput}
                      type="number" min={0}
                      placeholder="Qté"
                      style={{ width: 64, padding: '5px 8px', borderRadius: 7, border: '1.5px solid #E3E5E7', fontSize: 11, outline: 'none', textAlign: 'center' }}
                    />
                    <button
                      onClick={() => {
                        const v = parseInt(colorStockInput.current?.value ?? '', 10)
                        if (!isNaN(v) && v >= 0) applyColorQty(color, v)
                      }}
                      style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #E93D91', background: '#FEF3F8', color: '#E93D91', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Appliquer
                    </button>
                  </div>
                </div>

                {/* Variations de cette couleur */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {indices.map(i => {
                    const v = variations[i]
                    const isInStock = v.inStock
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 9,
                        border: `1.5px solid ${isInStock ? '#D1FAE5' : '#FEE2E2'}`,
                        background: isInStock ? '#F0FDF4' : '#FFF5F5',
                      }}>
                        {/* Taille */}
                        <div style={{ width: 64, fontSize: 12, fontWeight: 600, color: '#1A1A1A' }}>
                          {v.size && v.size !== 'UNIQUE' ? v.size : 'UNIQUE'}
                        </div>
                        {/* Badge stock */}
                        <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: isInStock ? '#059669' : '#DC2626' }}>
                          {isInStock ? `✅ ${v.stock ?? 0} en stock` : '❌ Rupture'}
                        </div>
                        {/* Input quantité */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => setVariationStock(i, Math.max(0, (v.stock ?? 0) - 1))}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #E3E5E7', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6D7175', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            −
                          </button>
                          <input
                            type="number" min={0}
                            value={v.stock ?? 0}
                            onChange={e => setVariationStock(i, Math.max(0, parseInt(e.target.value, 10) || 0))}
                            style={{ width: 52, padding: '4px 6px', borderRadius: 7, border: '1.5px solid #E3E5E7', fontSize: 12, textAlign: 'center', outline: 'none' }}
                          />
                          <button
                            onClick={() => setVariationStock(i, (v.stock ?? 0) + 1)}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1.5px solid #E3E5E7', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6D7175', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {variations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9A9A9A', fontSize: 13 }}>
              Ce produit n&apos;a pas de variations.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid #F1F1F1', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {result ? (
            <span style={{ fontSize: 13, fontWeight: 600, color: result.startsWith('✅') ? '#059669' : '#DC2626' }}>{result}</span>
          ) : <span />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E3E5E7', background: '#fff', color: '#6D7175', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={save} disabled={saving} style={{
              padding: '9px 20px', borderRadius: 9, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: saving ? 'rgba(233,61,145,0.4)' : 'linear-gradient(135deg, #E93D91, #C4197A)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              boxShadow: saving ? 'none' : '0 4px 12px rgba(233,61,145,0.3)',
            }}>
              {saving ? '⏳ Sauvegarde…' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  const PER_PAGE = 30

  const fetchProducts = useCallback(async (p = 1, q = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PER_PAGE),
        page: String(p),
        sort: 'nameAr',
        depth: '1',
      })
      if (q.trim()) {
        params.set('where', JSON.stringify({ nameAr: { contains: q.trim() } }))
      }
      const r = await fetch(`/api/boutique-admin/products?${params}`)
      if (r.ok) {
        const data = await r.json()
        setProducts(data.docs ?? [])
        setTotalPages(data.totalPages ?? 1)
        setTotalDocs(data.totalDocs ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProducts(1, '') }, [fetchProducts])

  function handleSearch(q: string) {
    setSearch(q)
    setPage(1)
    fetchProducts(1, q)
  }

  function handlePage(p: number) {
    setPage(p)
    fetchProducts(p, search)
  }

  function getStockSummary(variations?: Variation[]) {
    if (!variations?.length) return { inStock: 0, total: 0, totalQty: 0 }
    const inStock = variations.filter(v => v.inStock).length
    const totalQty = variations.reduce((sum, v) => sum + (v.stock ?? 0), 0)
    return { inStock, total: variations.length, totalQty }
  }

  function getStockColor(inStock: number, total: number) {
    if (total === 0) return '#D0D0D0'
    if (inStock === 0) return '#EF4444'
    if (inStock < total) return '#F59E0B'
    return '#10B981'
  }

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: '#F7F8FA' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>
          📦 Gestion du stock
        </h1>
        <p style={{ fontSize: 13, color: '#9A9A9A', marginTop: 4 }}>
          Cliquez sur un produit pour modifier les quantités en stock par variation.
        </p>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher un produit…"
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10, border: '1.5px solid #E3E5E7', fontSize: 13, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#9A9A9A', flexShrink: 0 }}>
          {totalDocs} produit{totalDocs > 1 ? 's' : ''}
        </div>
      </div>

      {/* Grille de produits */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E3E5E7', borderTopColor: '#E93D91', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9A9A9A' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 500 }}>Aucun produit trouvé</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {products.map(p => {
            const img = p.images?.[0]?.image
            const { inStock, total, totalQty } = getStockSummary(p.variations)
            const color = getStockColor(inStock, total)
            const pct = total > 0 ? Math.round((inStock / total) * 100) : 0

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                style={{
                  background: '#fff', borderRadius: 14, border: '1.5px solid #E3E5E7',
                  padding: 14, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E93D91'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(233,61,145,0.12)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = '#E3E5E7'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  {/* Miniature */}
                  <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', background: '#F1F5F9', border: '1px solid #E3E5E7', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img?.url
                      ? <img src={img.thumbnailURL ?? img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 22 }}>👗</span>
                    }
                  </div>
                  {/* Nom */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nameAr}</div>
                    <div style={{ fontSize: 10, color: '#9A9A9A', marginTop: 3 }}>
                      {total} variation{total > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Barre de stock */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color }}>{inStock}/{total} en stock</span>
                    <span style={{ fontSize: 10, color: '#9A9A9A' }}>Qté tot: {totalQty}</span>
                  </div>
                  <div style={{ height: 4, background: '#F1F1F1', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 10, transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                {/* Bouton */}
                <button
                  onClick={e => { e.stopPropagation(); setSelectedProduct(p) }}
                  style={{
                    width: '100%', padding: '7px', borderRadius: 8, border: '1.5px solid #E93D91',
                    background: '#FEF3F8', color: '#E93D91', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}>
                  <span>✏️</span> Modifier le stock
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          <button onClick={() => handlePage(Math.max(1, page - 1))} disabled={page === 1} style={PAGE_BTN}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
            return (
              <button key={p} onClick={() => handlePage(p)} style={{ ...PAGE_BTN, background: p === page ? '#1A1A1A' : '#fff', color: p === page ? '#fff' : '#6D7175', fontWeight: p === page ? 700 : 400 }}>{p}</button>
            )
          })}
          <button onClick={() => handlePage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={PAGE_BTN}>›</button>
        </div>
      )}

      {/* Modal de stock */}
      {selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onSaved={() => {
            fetchProducts(page, search)
            setTimeout(() => setSelectedProduct(null), 1200)
          }}
        />
      )}
    </div>
  )
}

const PAGE_BTN: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid #E3E5E7',
  background: '#fff', color: '#6D7175', fontSize: 13, cursor: 'pointer',
  minWidth: 36, textAlign: 'center',
}
