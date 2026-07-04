'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { WILAYAS } from '@/lib/algeria-geo'
import { useConfUser } from '../ConfirmatriceUserContext'

interface Order {
  id: string; orderNumber: string; customerName: string; phone: string
  wilaya: string; commune?: string; address?: string
  total: number; status: string; createdAt: string
  items?: Array<{ productName?: string; quantity?: number; price?: number; colorAr?: string; size?: string; unitPrice?: number }>
  note?: string
  lastStatusUpdatedBy?: string
  lastStatusUpdatedAt?: string
  yalidineTrackingId?: string
}

const STATUSES = [
  { value: '',          label: 'Toutes',         color: '#6D7175', bg: '#F1F1F1',   dot: '#9A9A9A' },
  { value: 'new',       label: 'Nouvelles',       color: '#B45309', bg: '#FEF3C7',   dot: '#B45309' },
  { value: 'pending',   label: 'En attente',      color: '#92400E', bg: '#FEF9C3',   dot: '#EAB308' },
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
  new: 'confirmed', pending: 'confirmed', confirmed: 'shipping', shipping: 'delivered',
}

const fmt     = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Numéros de téléphone des confirmatrices — chaque confirmatrice envoie depuis son propre numéro
const CONF_PHONES: Record<string, string> = {
  'conf01@boutique-she.com': '0775452415',
  'conf02@boutique-she.com': '0554989209',
  'conf03@boutique-she.com': '',
}

// Génère le lien WhatsApp avec un message de confirmation pré-rempli
function buildWhatsAppUrl(order: Order, confEmail?: string): string {
  // Normalise le numéro de téléphone du client (05/06/07 → +213)
  let phone = (order.phone ?? '').replace(/\s+/g, '').replace(/-/g, '')
  if (phone.startsWith('0')) phone = '213' + phone.slice(1)
  else if (!phone.startsWith('213') && !phone.startsWith('+213')) phone = '213' + phone

  // Numéro de la confirmatrice
  const confPhone = confEmail ? (CONF_PHONES[confEmail] ?? '') : ''

  // Articles de la commande
  const itemsList = (order.items ?? [])
    .map(item => {
      const name = item.productName ?? '—'
      const details = [item.colorAr, item.size].filter(Boolean).join(' / ')
      return `* ${name} (${details || '—'}) × ${item.quantity ?? 1}`
    })
    .join('\n')

  const message = `السلام عليكم ${order.customerName}

نتواصل معاك من She's Fit & Beauty بخصوص طلبك رقم ${order.orderNumber}

 تفاصيل الطلب:
${itemsList}

 المبلغ الإجمالي: ${fmt(order.total)}
 الولاية: ${order.wilaya}${order.commune ? ` - ${order.commune}` : ''}
*التوصيل الى مكتب ياليدين / الى المنزل

يرجى ‏الاتصال بنا على الرقم التالي لتأكيد الطلب :${confPhone ? `\n${confPhone}` : ''}`

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function timeAgo(s: string): string {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000)
  if (diff < 60)          return 'à l\'instant'
  if (diff < 3600)        return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400)       return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 7 * 86400)   return `il y a ${Math.floor(diff / 86400)} j`
  return ''
}
const fmtDateTime = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function getDateFrom(preset: string): string | null {
  const now = new Date()
  if (preset === 'today') { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString() }
  if (preset === '7d')    { return new Date(now.getTime() - 7  * 86400000).toISOString() }
  if (preset === '30d')   { return new Date(now.getTime() - 30 * 86400000).toISOString() }
  if (preset === 'month') { return new Date(now.getFullYear(), now.getMonth(), 1).toISOString() }
  return null
}

const WILAYA_OPTIONS = WILAYAS.map(w => ({ value: w.nameAr, label: `${w.code} · ${w.nameAr} (${w.nameFr})` }))

// ── Calcul prime local (identique à la page admin) ───────────────────────────
function calcPrime(user: ReturnType<typeof useConfUser>, delivered: number): { prime: number; salaireDebloque: boolean; detail: string } {
  if (!user) return { prime: 0, salaireDebloque: false, detail: '' }
  const primeCmd = user.primeParCommande ?? 0

  if (user.confirmatriceType === 'salarie') {
    const salaire  = user.salaireMensuel ?? 0
    const seuil    = user.seuilCommandes ?? 0
    const debloque = seuil > 0 && delivered >= seuil
    if (!debloque) {
      return { prime: 0, salaireDebloque: false, detail: `${delivered}/${seuil} livrées — seuil non atteint` }
    }
    return { prime: salaire + delivered * primeCmd, salaireDebloque: true, detail: `${fmt(salaire)} + ${delivered} × ${fmt(primeCmd)}` }
  }
  // Non-salariée
  return { prime: delivered * primeCmd, salaireDebloque: false, detail: `${delivered} × ${fmt(primeCmd)}` }
}

export default function ConfirmatriceOrdersPage() {
  const currentUser = useConfUser()

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
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const [bulkStatus,   setBulkStatus]   = useState('')
  const [bulkLoading,  setBulkLoading]  = useState(false)
  // Compteur mois en cours pour le widget prime
  const [deliveredThisMonth, setDeliveredThisMonth] = useState(0)
  const perPage = 20

  // Construit le filtre de base incluant toujours le filtre assignedTo pour cette confirmatrice
  const buildBaseWhere = useCallback((extra: Record<string, unknown> = {}) => {
    const where: Record<string, unknown> = { ...extra }
    // Chaque confirmatrice ne voit que ses commandes assignées
    if (currentUser?.id) where.assignedTo = { equals: currentUser.id }
    return where
  }, [currentUser?.id])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const where = buildBaseWhere()
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
  }, [statusFilter, wilayaFilter, datePreset, search, page, buildBaseWhere])

  useEffect(() => { load() }, [load])

  // Compteurs de statuts — filtrés aussi par assignedTo
  useEffect(() => {
    if (!currentUser?.id) return
    Promise.all(
      ['new','pending','confirmed','shipping','delivered','cancelled'].map(s => {
        const where = buildBaseWhere({ status: { equals: s } })
        return fetch(`/api/boutique-admin/orders?limit=0&depth=0&where=${encodeURIComponent(JSON.stringify(where))}`).then(r => r.json()).then(d => [s, d.totalDocs ?? 0])
      })
    ).then(results => setCounts(Object.fromEntries(results)))
  }, [orders, currentUser?.id, buildBaseWhere])

  // Charge le nombre de commandes livrées ce mois pour le widget prime
  useEffect(() => {
    if (!currentUser?.id) return
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const where = buildBaseWhere({ status: { equals: 'delivered' }, createdAt: { greater_than: startOfMonth } })
    fetch(`/api/boutique-admin/orders?limit=0&depth=0&where=${encodeURIComponent(JSON.stringify(where))}`)
      .then(r => r.json())
      .then(d => setDeliveredThisMonth(d.totalDocs ?? 0))
      .catch(() => { /* ignore */ })
  }, [currentUser?.id, buildBaseWhere, orders])

  // Met à jour le statut et enregistre qui l'a changé
  async function changeStatus(id: string, status: string) {
    setUpdating(id)
    const updatedBy = currentUser?.firstName || currentUser?.email || 'Confirmatrice'
    await fetch(`/api/boutique-admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        lastStatusUpdatedBy: updatedBy,
        lastStatusUpdatedAt: new Date().toISOString(),
      }),
    })
    await load()
    setUpdating(null)
  }

  // Changement de statut en masse
  async function applyBulkStatus() {
    if (!bulkStatus || selected.size === 0) return
    setBulkLoading(true)
    const updatedBy = currentUser?.firstName || currentUser?.email || 'Confirmatrice'
    await Promise.all(
      Array.from(selected).map(id =>
        fetch(`/api/boutique-admin/orders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus, lastStatusUpdatedBy: updatedBy, lastStatusUpdatedAt: new Date().toISOString() }),
        })
      )
    )
    setSelected(new Set())
    setBulkStatus('')
    setBulkLoading(false)
    await load()
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const toggleSelectAll = () => {
    if (selected.size === orders.length && orders.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(orders.map(o => o.id)))
    }
  }

  const resetFilters = () => { setStatusFilter(''); setWilayaFilter(''); setDatePreset(''); setSearch(''); setPage(1) }
  const hasActiveFilters = !!(statusFilter || wilayaFilter || datePreset || search)
  const totalPages = Math.ceil(total / perPage)
  const allSelected = orders.length > 0 && selected.size === orders.length

  return (
    <div style={{ maxWidth: 1200, animation: 'fadeIn 0.25s ease' }}>

      {/* Titre */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Mes commandes</h1>
          <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>{total} commande{total > 1 ? 's' : ''} assignée{total > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Widget prime désactivé */}

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

      {/* Barre d'actions en masse (visible si au moins une sélection) */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4A3DBC' }}>{selected.size} sélectionnée{selected.size > 1 ? 's' : ''}</span>
          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="admin-select" style={{ minWidth: 160, fontSize: 12 }}>
            <option value="">Changer le statut…</option>
            {STATUSES.filter(s => s.value).map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || bulkLoading}
            style={{ padding: '7px 16px', background: bulkStatus ? '#4A3DBC' : '#9CA3AF', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: bulkStatus ? 'pointer' : 'not-allowed', opacity: bulkLoading ? 0.7 : 1, transition: 'all 0.15s' }}
          >
            {bulkLoading ? 'En cours…' : 'Appliquer'}
          </button>
          <button onClick={() => setSelected(new Set())} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid #C7D2FE', color: '#6D7175', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
            Désélectionner
          </button>
        </div>
      )}

      {/* Table */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E3E5E7', background: '#FAFAFA' }}>
              {/* Checkbox tout sélectionner */}
              <th style={{ ...TH, width: 40, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', width: 14, height: 14 }}
                />
              </th>
              {['N° commande', 'Client', 'Wilaya', 'Total', 'Statut', 'Mis à jour par', 'Date', 'Actions'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '64px', textAlign: 'center', color: '#9A9A9A' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <div style={{ marginBottom: 10, fontWeight: 500 }}>Aucune commande</div>
                {hasActiveFilters && <button onClick={resetFilters} className="admin-btn admin-btn-secondary" style={{ fontSize: 12 }}>Effacer les filtres</button>}
              </td></tr>
            ) : orders.map(o => {
              const s          = STATUSES.find(st => st.value === o.status) ?? STATUSES[1]
              const isExpanded = expandedId === o.id
              const nextSt     = NEXT_STATUS[o.status]
              const nextLabel  = STATUSES.find(st => st.value === nextSt)?.label
              const isSelected = selected.has(o.id)

              return (
                <React.Fragment key={o.id}>
                  <tr
                    className="admin-row-hover"
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid #F1F1F1', background: isSelected ? '#F5F3FF' : isExpanded ? '#FAFBFF' : undefined }}
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    {/* Checkbox sélection */}
                    <td style={{ ...TD, textAlign: 'center', width: 40 }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(o.id)}
                        style={{ cursor: 'pointer', width: 14, height: 14 }}
                      />
                    </td>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <span className="admin-badge" style={{ background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                          {s.label}
                        </span>
                        {o.yalidineTrackingId && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                            color: '#065F46', background: '#D1FAE5', border: '1px solid #86EFAC',
                            borderRadius: 5, padding: '2px 6px', letterSpacing: '0.04em',
                          }}>
                            📦 {o.yalidineTrackingId}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Colonne "Mis à jour par" */}
                    <td style={TD}>
                      {o.lastStatusUpdatedBy ? (
                        <span
                          title={o.lastStatusUpdatedAt ? fmtDateTime(o.lastStatusUpdatedAt) : undefined}
                          style={{ fontSize: 12, color: '#6D7175', cursor: 'default' }}
                        >
                          {o.lastStatusUpdatedBy}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#C0C0C0' }}>—</span>
                      )}
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: 12, color: '#6D7175' }}>{fmtDate(o.createdAt)}</div>
                      {timeAgo(o.createdAt) && (
                        <div style={{ fontSize: 11, color: '#B0B0B0', marginTop: 2 }}>{timeAgo(o.createdAt)}</div>
                      )}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {/* Bouton WhatsApp — envoyer message de confirmation au client */}
                        <a
                          href={buildWhatsAppUrl(o, currentUser?.email)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Envoyer message WhatsApp de confirmation"
                          style={{
                            padding: '5px 10px', background: '#25D366', border: '1px solid #1DA851',
                            borderRadius: 7, fontSize: 11, fontWeight: 700, color: '#fff',
                            cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WA
                        </a>
                        {nextSt && nextLabel && (() => {
                          const ns = STATUSES.find(st => st.value === nextSt)
                          return (
                            <button onClick={() => changeStatus(o.id, nextSt)} disabled={updating === o.id} style={{
                              padding: '5px 12px', background: ns?.bg ?? '#F1F1F1', color: ns?.color ?? '#1A1A1A',
                              border: `1px solid ${ns?.dot ?? '#9A9A9A'}40`, borderRadius: 7, fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', opacity: updating === o.id ? 0.6 : 1, transition: 'all 0.15s',
                            }}>→ {nextLabel}</button>
                          )
                        })()}
                        {o.status !== 'cancelled' && o.status !== 'delivered' && (
                          <button onClick={() => changeStatus(o.id, 'cancelled')} style={{ padding: '5px 10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                        )}
                        <Link href={`/confirmatrice/orders/${o.id}`} onClick={e => e.stopPropagation()} style={{ padding: '5px 12px', background: '#F1F5F9', border: '1px solid #E3E5E7', color: '#4A3DBC', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
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
                      <td colSpan={9} style={{ padding: '0 20px 20px' }}>
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
