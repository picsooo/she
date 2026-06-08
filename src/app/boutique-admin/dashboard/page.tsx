'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Order {
  id: string; orderNumber: string; customerName: string
  wilaya: string; total: number; status: string; createdAt: string
  items?: Array<{ productName?: string; quantity?: number; unitPrice?: number; price?: number }>
}
interface ChartDay  { label: string; date: string; revenue: number; orders: number }
interface BestSeller { name: string; qty: number; revenue: number }
interface KPI        { revenue: number; orders: number; avgOrder: number; newOrders: number }

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
const fmtShort = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
  : n >= 1_000 ? (n / 1_000).toFixed(0) + 'k'
  : String(Math.round(n))

type Period = '7d' | '30d' | '90d' | 'month'
const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: '7d',    label: '7 derniers jours',  days: 7  },
  { value: '30d',   label: '30 derniers jours', days: 30 },
  { value: 'month', label: 'Ce mois-ci',        days: 0  },
  { value: '90d',   label: '90 derniers jours', days: 90 },
]

function getDateRange(period: Period): { from: Date; days: number } {
  const now = new Date()
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const days = Math.ceil((now.getTime() - from.getTime()) / 86400000) + 1
    return { from, days }
  }
  const p = PERIODS.find(p => p.value === period)!
  const from = new Date(now.getTime() - (p.days - 1) * 86400000)
  from.setHours(0, 0, 0, 0)
  return { from, days: p.days }
}

function buildChartDays(orders: Order[], from: Date, days: number): ChartDay[] {
  const result: ChartDay[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(from); d.setDate(d.getDate() + i)
    const next = new Date(d); next.setDate(next.getDate() + 1)
    const dayOrders = orders.filter(o => {
      const t = new Date(o.createdAt).getTime()
      return t >= d.getTime() && t < next.getTime()
    })
    const label = days <= 14
      ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    result.push({
      label, date: d.toISOString(),
      revenue: dayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
      orders: dayOrders.length,
    })
  }
  return result
}

// ── SVG Area Chart ─────────────────────────────────────────────────────────────
function AreaChart({ data, valueKey, color, loading }: {
  data: ChartDay[]; valueKey: 'revenue' | 'orders'; color: string; loading: boolean
}) {
  const W = 900, H = 160, PAD = { top: 16, right: 16, bottom: 28, left: 52 }
  const values = data.map(d => d[valueKey] as number)
  const maxVal = Math.max(...values, 1)

  function toX(i: number) { return PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right) }
  function toY(v: number)  { return PAD.top + ((maxVal - v) / maxVal) * (H - PAD.top - PAD.bottom) }

  function makePath(): string {
    if (data.length < 2) return ''
    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d[valueKey] as number) }))
    let path = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2
      path += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
    }
    return path
  }
  function makeAreaPath(): string {
    const line = makePath()
    if (!line) return ''
    return `${line} L ${toX(data.length - 1)} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`
  }

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(t => ({ value: Math.round(maxVal * t), y: toY(maxVal * t) })).reverse()
  const gradId  = `grad-${color.replace('#', '')}`

  if (loading) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${color}30`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {yLabels.map((l, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y} stroke="#E8E8E8" strokeWidth="1" />
            <text x={PAD.left - 8} y={l.y + 4} textAnchor="end" fontSize="10" fill="#A0A0A0">
              {valueKey === 'revenue' ? fmtShort(l.value) : l.value}
            </text>
          </g>
        ))}
        <path d={makeAreaPath()} fill={`url(#${gradId})`} />
        <path d={makePath()} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => {
          if (data.length > 14 && i % 5 !== 0 && i !== data.length - 1) return null
          if (data.length <= 14 && data.length > 7 && i % 2 !== 0) return null
          return <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#A0A0A0">{d.label}</text>
        })}
        {data.length <= 14 && data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d[valueKey] as number)} r={3} fill="#fff" stroke={color} strokeWidth="2" />
        ))}
      </svg>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, loading, color = '#1A1A1A' }: {
  label: string; value: string; sub?: string; icon: string; loading: boolean; color?: string
}) {
  return (
    <div
      className="admin-card"
      style={{ padding: '20px 20px 16px', transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        el.style.transform  = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.boxShadow = 'none'
        el.style.transform  = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#6D7175' }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      {loading ? (
        <div style={{ width: 80, height: 24, background: '#F1F1F1', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
      ) : (
        <>
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#9A9A9A' }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

// ── Status badge styles ────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  new:       { label: 'Nouvelle',      color: '#B45309', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmée',     color: '#1D4ED8', bg: '#DBEAFE' },
  shipping:  { label: 'En livraison',  color: '#7C3AED', bg: '#EDE9FE' },
  delivered: { label: 'Livrée',        color: '#065F46', bg: '#D1FAE5' },
  cancelled: { label: 'Annulée',       color: '#991B1B', bg: '#FEE2E2' },
}

// ── Stats Yalidine ─────────────────────────────────────────────────────────────
// Affiche un résumé des colis Yalidine si l'intégration est activée
function YalidineStats() {
  const [enabled,  setEnabled]  = useState<boolean | null>(null)
  const [counts,   setCounts]   = useState<Record<string, number>>({})
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Vérifier si Yalidine est activé dans les paramètres globaux
        const settingsRes = await fetch('/api/globals/delivery-settings?depth=0')
        const settings = await settingsRes.json()
        const isEnabled = !!(settings?.yalidineEnabled || settings?.yalidineApiToken)
        setEnabled(isEnabled)

        if (!isEnabled) { setLoading(false); return }

        // Charger les commandes avec un tracking Yalidine
        const ordersRes = await fetch('/api/orders?limit=0&depth=0&where[yalidineTrackingId][exists]=true')
        const data = await ordersRes.json()

        // Ventiler par statut
        const docs: Array<{ status: string }> = data.docs ?? []
        const map: Record<string, number> = {}
        for (const o of docs) {
          map[o.status] = (map[o.status] ?? 0) + 1
        }
        setCounts(map)
        setTotal(data.totalDocs ?? docs.length)
      } catch (e) {
        console.error('Erreur chargement stats Yalidine :', e)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Attendre la résolution avant d'afficher quoi que ce soit
  if (loading) return (
    <div style={{ marginTop: 16, padding: '20px 24px', background: '#fff', borderRadius: 12, border: '1px solid #E3E5E7', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 20, height: 20, border: '2px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#9A9A9A' }}>Chargement intégration Yalidine…</span>
    </div>
  )

  // Yalidine désactivé → bouton pour accéder aux paramètres
  if (!enabled) return (
    <div style={{
      marginTop: 16, padding: '20px 24px',
      background: '#FFFBEB', border: '1px solid #FDE68A',
      borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>🚚</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#B45309', marginBottom: 4 }}>Intégration Yalidine non configurée</div>
        <div style={{ fontSize: 12, color: '#6D7175' }}>Connectez votre compte Yalidine pour suivre vos colis directement depuis ce tableau de bord.</div>
      </div>
      <a href="/boutique-admin/settings" style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        background: '#B45309', color: '#fff', textDecoration: 'none',
        flexShrink: 0, whiteSpace: 'nowrap',
      }}>
        Configurer →
      </a>
    </div>
  )

  // Tableau des statuts Yalidine
  const YALIDINE_STATUSES = [
    { key: 'shipping',  label: 'En livraison', color: '#7C3AED', bg: '#EDE9FE' },
    { key: 'delivered', label: 'Livrés',        color: '#065F46', bg: '#D1FAE5' },
    { key: 'cancelled', label: 'Échoués / Annulés', color: '#991B1B', bg: '#FEE2E2' },
  ]

  return (
    <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, border: '1px solid #E3E5E7', overflow: 'hidden' }}>
      {/* En-tête */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🚚</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Suivi Yalidine</div>
            <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{total} colis trackés au total</div>
          </div>
        </div>
        <a href="/boutique-admin/settings" style={{ fontSize: 12, color: '#4A3DBC', fontWeight: 500, textDecoration: 'none' }}>
          Paramètres
        </a>
      </div>

      {/* Compteurs par statut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
        {YALIDINE_STATUSES.map((s, i) => (
          <div key={s.key} style={{
            padding: '16px 20px',
            borderRight: i < YALIDINE_STATUSES.length - 1 ? '1px solid #F1F1F1' : 'none',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 22, fontWeight: 700,
                color: (counts[s.key] ?? 0) > 0 ? s.color : '#C0C0C0',
              }}>
                {counts[s.key] ?? 0}
              </span>
              {(counts[s.key] ?? 0) > 0 && total > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: s.bg, color: s.color,
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {Math.round(((counts[s.key] ?? 0) / total) * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div style={{ padding: '24px 20px', textAlign: 'center', color: '#9A9A9A', fontSize: 13, borderTop: '1px solid #F1F1F1' }}>
          Aucune commande avec numéro de tracking Yalidine pour l&apos;instant.
        </div>
      )}
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period,        setPeriod]        = useState<Period>('7d')
  const [showMenu,      setShowMenu]      = useState(false)
  const [chartMode,     setChartMode]     = useState<'revenue' | 'orders'>('revenue')
  const [kpi,           setKpi]           = useState<KPI | null>(null)
  const [chartData,     setChartData]     = useState<ChartDay[]>([])
  const [bestSellers,   setBestSellers]   = useState<BestSeller[]>([])
  const [recentOrders,  setRecentOrders]  = useState<Order[]>([])
  const [loading,       setLoading]       = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, days } = getDateRange(period)
      const limit = Math.min(days * 10, 500)

      const [ordersRes, newOrdersRes] = await Promise.all([
        fetch(`/api/orders?limit=${limit}&sort=-createdAt&depth=1&where[status][not_equals]=cancelled&where[createdAt][greater_than]=${from.toISOString()}`).then(r => r.json()),
        fetch('/api/orders?limit=0&depth=0&where[status][equals]=new').then(r => r.json()),
      ])

      const orders: Order[] = ordersRes.docs ?? []
      const revenue  = orders.reduce((s, o) => s + (o.total ?? 0), 0)
      const avgOrder = orders.length > 0 ? revenue / orders.length : 0

      setKpi({ revenue, orders: orders.length, avgOrder, newOrders: newOrdersRes.totalDocs ?? 0 })
      setChartData(buildChartDays(orders, from, days))

      // Meilleures ventes
      const map: Record<string, BestSeller> = {}
      for (const o of orders) {
        for (const item of o.items ?? []) {
          const name = item.productName ?? '—'
          if (!map[name]) map[name] = { name, qty: 0, revenue: 0 }
          map[name].qty     += item.quantity ?? 1
          map[name].revenue += (item.unitPrice ?? item.price ?? 0) * (item.quantity ?? 1)
        }
      }
      setBestSellers(Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5))
      setRecentOrders(orders.slice(0, 8))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? ''

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.3s ease' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: '#6D7175', margin: '4px 0 0' }}>She&apos;s Fit &amp; Beauty</p>
        </div>

        {/* Sélecteur de période */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="admin-btn admin-btn-secondary"
            style={{ display: 'flex', gap: 8, padding: '8px 14px' }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 2v4M13 2v4M3 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            {periodLabel}
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 100,
              background: '#fff', border: '1px solid #E3E5E7', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 180, overflow: 'hidden',
            }}>
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => { setPeriod(p.value); setShowMenu(false) }} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', fontSize: 13,
                  background: period === p.value ? '#F2F0FF' : 'transparent',
                  color: period === p.value ? '#4A3DBC' : '#1A1A1A',
                  fontWeight: period === p.value ? 600 : 400,
                  border: 'none', cursor: 'pointer', borderBottom: '1px solid #F5F5F5',
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard label="Chiffre d'affaires" value={kpi ? fmt(kpi.revenue) : '—'} icon="💰" color="#007A5C" loading={loading} />
        <KPICard label="Commandes"           value={kpi ? String(kpi.orders) : '—'} sub={kpi ? `${kpi.newOrders} en attente` : undefined} icon="📦" loading={loading} />
        <KPICard label="Panier moyen"         value={kpi ? fmt(kpi.avgOrder) : '—'} icon="🛒" loading={loading} />
        <KPICard label="Nouvelles commandes"  value={kpi ? String(kpi.newOrders) : '—'} sub="à confirmer" icon="🔔" color="#E93D91" loading={loading} />
      </div>

      {/* Graphique */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
              {chartMode === 'revenue' ? "Chiffre d'affaires" : 'Nombre de commandes'}
            </div>
            <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 2 }}>{periodLabel}</div>
          </div>

          <div style={{ display: 'flex', gap: 0, background: '#F5F5F5', borderRadius: 8, padding: 3 }}>
            {[{ value: 'revenue', label: 'CA' }, { value: 'orders', label: 'Commandes' }].map(m => (
              <button key={m.value} onClick={() => setChartMode(m.value as 'revenue' | 'orders')} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                background: chartMode === m.value ? '#fff' : 'transparent',
                color: chartMode === m.value ? '#1A1A1A' : '#6D7175',
                border: 'none', cursor: 'pointer',
                boxShadow: chartMode === m.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        {kpi && !loading && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#007A5C' }}>
              {chartMode === 'revenue' ? fmt(kpi.revenue) : kpi.orders}
            </span>
            {chartMode === 'revenue' && <span style={{ fontSize: 14, color: '#9A9A9A', marginLeft: 8 }}>DZD</span>}
          </div>
        )}

        <AreaChart data={chartData} valueKey={chartMode} color={chartMode === 'revenue' ? '#007A5C' : '#4A3DBC'} loading={loading} />
      </div>

      {/* Grille bas : meilleures ventes + commandes récentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

        {/* Meilleures ventes */}
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Meilleures ventes</div>
            <Link href="/boutique-admin/products" style={{ fontSize: 12, color: '#4A3DBC', fontWeight: 500 }}>Voir tout</Link>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            </div>
          ) : bestSellers.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
              Pas encore de données
            </div>
          ) : (
            bestSellers.map((item, i) => (
              <div key={item.name} className="admin-row-hover" style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: i < bestSellers.length - 1 ? '1px solid #F7F7F7' : 'none',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: i === 0 ? '#FEF3C7' : '#F9FAFB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 2 }}>{item.qty} vendus</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#007A5C' }}>{fmt(item.revenue)}</div>
              </div>
            ))
          )}
        </div>

        {/* Commandes récentes */}
        <div className="admin-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>Commandes récentes</div>
            <Link href="/boutique-admin/orders" style={{ fontSize: 12, color: '#4A3DBC', fontWeight: 500 }}>Voir tout</Link>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, border: '2px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
              Aucune commande sur cette période
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: '1px solid #F1F1F1' }}>
                {['Commande', 'Wilaya', 'Total', 'Statut'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>
              {recentOrders.map((o, i) => {
                const s = STATUS[o.status] ?? STATUS.new
                return (
                  <div key={o.id} className="admin-row-hover" style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
                    padding: '12px 20px', alignItems: 'center',
                    borderBottom: i < recentOrders.length - 1 ? '1px solid #F7F7F7' : 'none',
                  }}
                    onClick={() => window.location.href = `/boutique-admin/orders/${o.id}`}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{o.orderNumber}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{o.customerName}</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#6D7175' }}>📍 {o.wilaya}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#007A5C' }}>{fmt(o.total)}</div>
                    <div>
                      <span className="admin-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Section Yalidine — indépendante du reste, se charge seule */}
      <YalidineStats />
    </div>
  )
}
