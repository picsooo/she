'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { WILAYAS } from '@/lib/algeria-geo'

interface Order {
  id: string; orderNumber: string; customerName: string; phone: string
  wilaya: string; commune?: string; address?: string
  total: number; status: string; createdAt: string
  items?: Array<{ productName?: string; quantity?: number; price?: number; colorAr?: string; size?: string; unitPrice?: number }>
  note?: string
}

const STATUSES = [
  { value: '',          label: 'Toutes',         color: '#6D7175', bg: '#F1F1F1',   dot: '#9A9A9A' },
  { value: 'new',       label: 'Nouvelles',       color: '#B45309', bg: '#FEF3C7',   dot: '#B45309' },
  { value: 'confirmed', label: 'Confirmées',      color: '#1D4ED8', bg: '#DBEAFE',   dot: '#1D4ED8' },
  { value: 'shipping',  label: 'En livraison',    color: '#7C3AED', bg: '#EDE9FE',   dot: '#7C3AED' },
  { value: 'delivered', label: 'Livrées',         color: '#065F46', bg: '#D1FAE5',   dot: '#065F46' },
  { value: 'cancelled', label: 'Annulées',        color: '#991B1B', bg: '#FEE2E2',   dot: '#991B1B' },
]

const DATE_PRESETS = [
  { label: 'Tout',          value: '' },
  { label: "Aujourd'hui",   value: 'today' },
  { label: '7 jours',       value: '7d' },
  { label: '30 jours',      value: '30d' },
  { label: 'Ce mois',       value: 'month' },
]

const NEXT_STATUS: Record<string, string> = {
  new: 'confirmed', confirmed: 'shipping', shipping: 'delivered',
}

const fmt     = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function getDateFrom(preset: string): string | null {
  const now = new Date()
  if (preset === 'today') { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString() }
  if (preset === '7d')    { return new Date(now.getTime() - 7  * 86400000).toISOString() }
  if (preset === '30d')   { return new Date(now.getTime() - 30 * 86400000).toISOString() }
  if (preset === 'month') { return new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  return null
}

const WILAYA_OPTIONS = WILAYAS.map(w => ({ value: w.nameAr, label: `${w.code} · ${w.nameAr} (${w.nameFr})` }))

export default function OrdersPage() {
  const [orders,       setOrders]       = useState<Order[]>([])
  const [total,        setTotal]        = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [wilayaFilter, setWilayaFilter] = useState('')
  const [datePreset,   setDatePreset]   = useState('')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [updating,     setUpdating]     = useState<string | null>(null)
  const [counts,       setCounts]       = useState<Record<string, number>>({})
  const perPage = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const where: Record<string, unknown> = {}
      if (statusFilter) where.status = { equals: statusFilter }
      if (wilayaFilter) where.wilaya = { like: wilayaFilter }
      const dateFrom = getDateFrom(datePreset)
      if (dateFrom) where.createdAt = { greater_than: dateFrom }
      if (search) where.or = [
        { orderNumber: { like: search } },
        { customerName: { like: search } },
        { phone: { like: search } },
        { wilaya: { like: search } },
      ]
      const params = new URLSearchParams({ limit: String(perPage), page: String(page), sort: '-createdAt', depth: '1', where: JSON.stringify(where) })
      const data = await fetch('/api/boutique-admin/orders?' + params).then(r => r.json())
      setOrders(data.docs ?? [])
      setTotal(data.totalDocs ?? 0)
    } finally { setLoading(false) }
  }, [statusFilter, wilayaFilter, datePreset, search, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all(
      ['new','confirmed','shipping','delivered','cancelled'].map(s =>
        fetch(`/api/boutique-admin/orders?limit=0&depth=0&where=${encodeURIComponent(JSON.stringify({ status: { equals: s } }))}`).then(r => r.json()).then(d => [s, d.totalDocs ?? 0])
      )
    ).then(results => setCounts(Object.fromEntries(results)))
  }, [orders])

  async function changeStatus(id: string, status: string) {
    setUpdating(id)
    await fetch(`/api/boutique-admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    await load()
    setUpdating(null)
  }

  const resetFilters = () => { setStatusFilter(''); setWilayaFilter(''); setDatePreset(''); setSearch(''); setPage(1) }
  const hasActiveFilters = !!(statusFilter || wilayaFilter || datePreset || search)
  const totalPages = Math.ceil(total / perPage)

  return (
    <div style={{ maxWidth: 1200, animation: 'fadeIn 0.25s ease' }}>

      {/* Titre */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Commandes</h1>
          <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>{total} commande{total > 1 ? 's' : ''} au total</p>
        </div>
      </div>

      {/* Tabs statut */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => {
          const active = statusFilter === s.value
          const count  = s.value ? (counts[s.value] ?? 0) : total
          return (
            <button key={s.value} onClick={() => { setStatusFilter(s.value); setPage(1) }} style={{
              padding: '7px 14px', borderRadius: 8,
              border: active ? `1.5px solid ${s.dot}40` : '1px solid #E3E5E7',
              background: active ? s.bg : '#fff',
              color: active ? s.color : '#6D7175',
              fontSize: 12, fontWeight: active ? 700 : 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.15s', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}>
              {active && s.value && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />}
              {s.label}
              {count > 0 && (
                <span style={{ background: active ? `${s.dot}22` : '#F1F1F1', color: active ? s.color : '#9A9A9A', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 7px' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Barre de filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9A9A9A', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="N° commande, client, téléphone…"
            className="admin-input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        <select value={wilayaFilter} onChange={e => { setWilayaFilter(e.target.value); setPage(1) }} className="admin-select"
          style={{ minWidth: 180, borderColor: wilayaFilter ? '#7C3AED' : undefined, color: wilayaFilter ? '#7C3AED' : undefined }}>
          <option value="">🗺️ Toutes les wilayas</option>
          {WILAYA_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4, background: '#F5F5F5', borderRadius: 8, padding: 3 }}>
          {DATE_PRESETS.map(p => (
            <button key={p.value} onClick={() => { setDatePreset(p.value); setPage(1) }} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: datePreset === p.value ? 600 : 400,
              background: datePreset === p.value ? '#fff' : 'transparent',
              color: datePreset === p.value ? '#1A1A1A' : '#6D7175',
              border: 'none', cursor: 'pointer',
              boxShadow: datePreset === p.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>{p.label}</button>
          ))}
        </div>

        {hasActiveFilters && (
          <button onClick={resetFilters} style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: '1px solid #FCA5A5', background: '#FEE2E2', color: '#991B1B', cursor: 'pointer',
          }}>✕ Effacer</button>
        )}
      </div>

      {/* Badges filtres actifs */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', fontSize: 12 }}>
          {wilayaFilter && <span className="admin-badge" style={{ background: '#EDE9FE', color: '#7C3AED' }}>📍 {wilayaFilter}</span>}
          {datePreset    && <span className="admin-badge" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>🗓️ {DATE_PRESETS.find(p => p.value === datePreset)?.label}</span>}
        </div>
      )}

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E3E5E7', background: '#FAFAFA' }}>
              {['N° commande', 'Client', 'Wilaya', 'Total', 'Statut', 'Date', 'Actions'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '64px', textAlign: 'center', color: '#9A9A9A' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <div style={{ marginBottom: 10, fontWeight: 500 }}>Aucune commande</div>
                {hasActiveFilters && <button onClick={resetFilters} className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Effacer les filtres</button>}
              </td></tr>
            ) : orders.map(o => {
              const s          = STATUSES.find(st => st.value === o.status) ?? STATUSES[1]
              const isExpanded = expandedId === o.id
              const nextSt     = NEXT_STATUS[o.status]
              const nextLabel  = STATUSES.find(st => st.value === nextSt)?.label

              return (
                <React.Fragment key={o.id}>
                  <tr
                    className="admin-row-hover"
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid #F1F1F1', background: isExpanded ? '#FAFBFF' : undefined }}
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    <td style={{ ...TD, fontWeight: 700, color: '#E93D91', fontFamily: 'monospace', fontSize: 12 }}>{o.orderNumber}</td>
                    <td style={TD}>
                      <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{o.customerName}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{o.phone}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize: 12, color: '#6D7175', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10 }}>📍</span> {o.wilaya}
                      </span>
                      {o.commune && <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2 }}>{o.commune}</div>}
                    </td>
                    <td style={{ ...TD, fontWeight: 700, color: '#007A5C', whiteSpace: 'nowrap' }}>{fmt(o.total)}</td>
                    <td style={TD}>
                      <span className="admin-badge" style={{ background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        {s.label}
                      </span>
                    </td>
                    <td style={{ ...TD, color: '#9A9A9A', fontSize: 12 }}>{fmtDate(o.createdAt)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {nextSt && nextLabel && (
                          <button onClick={() => changeStatus(o.id, nextSt)} disabled={updating === o.id} style={{
                            padding: '5px 12px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: updating === o.id ? 0.6 : 1,
                          }}>→ {nextLabel}</button>
                        )}
                        {o.status !== 'cancelled' && o.status !== 'delivered' && (
                          <button onClick={() => changeStatus(o.id, 'cancelled')} style={{ padding: '5px 10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                        )}
                        <Link href={`/boutique-admin/orders/${o.id}`} onClick={e => e.stopPropagation()} style={{ padding: '5px 12px', background: '#F1F5F9', border: '1px solid #E3E5E7', color: '#4A3DBC', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                          Voir
                        </Link>
                        <button style={{ padding: '5px 8px', background: '#F5F5F5', border: '1px solid #E3E5E7', color: '#6D7175', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Ligne étendue */}
                  {isExpanded && (
                    <tr style={{ background: '#FAFBFF', borderBottom: '1px solid #E8EEFF' }}>
                      <td colSpan={7} style={{ padding: '0 20px 20px' }}>
                        <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 10, padding: 20, marginTop: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                              <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Adresse de livraison</div>
                              <div style={{ fontSize: 13, color: '#3D3D3D', lineHeight: 1.6 }}>
                                {o.commune && <span>{o.commune}, </span>}{o.wilaya}
                                {o.address && <div style={{ marginTop: 2, color: '#6D7175' }}>{o.address}</div>}
                              </div>
                            </div>
                            {o.note && (
                              <div>
                                <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Note client</div>
                                <div style={{ fontSize: 13, color: '#6D7175', fontStyle: 'italic' }}>{o.note}</div>
                              </div>
                            )}
                          </div>

                          {o.items && o.items.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Articles commandés</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {o.items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                    <div>
                                      <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{item.productName ?? '—'}</span>
                                      {(item.colorAr || item.size) && (
                                        <span style={{ color: '#9A9A9A', marginLeft: 10, fontSize: 12 }}>
                                          {[item.colorAr, item.size].filter(Boolean).join(' · ')}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <span style={{ color: '#9A9A9A', fontSize: 12 }}>× {item.quantity ?? 1}</span>
                                      {(item.unitPrice ?? item.price) && <span style={{ fontWeight: 700, color: '#007A5C' }}>{fmt(item.unitPrice ?? item.price ?? 0)}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Changement de statut */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Changer le statut :</span>
                            {STATUSES.filter(st => st.value && st.value !== o.status).map(st => (
                              <button key={st.value} onClick={() => changeStatus(o.id, st.value)} disabled={updating === o.id} style={{ padding: '5px 14px', background: st.bg, color: st.color, border: `1px solid ${st.dot}30`, borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: updating === o.id ? 0.6 : 1, transition: 'all 0.2s' }}>{st.label}</button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={PAGE_BTN}>‹</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ ...PAGE_BTN, background: p === page ? '#1A1A1A' : '#fff', color: p === page ? '#fff' : '#6D7175', border: p === page ? '1px solid #1A1A1A' : '1px solid #E3E5E7', fontWeight: p === page ? 700 : 400 }}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={PAGE_BTN}>›</button>
        </div>
      )}
    </div>
  )
}

const TH: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }
const TD: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' }
const PAGE_BTN: React.CSSProperties = { minWidth: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid #E3E5E7', background: '#fff', color: '#6D7175', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }
