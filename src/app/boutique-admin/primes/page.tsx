'use client'
import React, { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Order {
  id: string
  status: string
  total?: number
  createdAt: string
  assignedTo?: {
    id: number
    firstName?: string
    lastName?: string
    email?: string
  } | null
}

type Period = 'month' | 'last_month' | '7d' | '30d' | 'all' | 'custom'

interface PeriodOption { value: Period; label: string }
const PERIODS: PeriodOption[] = [
  { value: 'month',      label: 'Ce mois-ci'    },
  { value: 'last_month', label: 'Mois dernier'  },
  { value: '30d',        label: '30 derniers j' },
  { value: '7d',         label: '7 derniers j'  },
  { value: 'all',        label: 'Tout'          },
  { value: 'custom',     label: 'Personnalisé'  },
]

// Statuts qui comptent comme "confirmée" pour la prime
const CONFIRMED_STATUSES = ['confirmed', 'shipping', 'delivered']

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'

function getDateRange(period: Period, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  if (period === 'all')        return { from: null, to: null }
  if (period === '7d')         return { from: new Date(now.getTime() - 7 * 86400000), to: null }
  if (period === '30d')        return { from: new Date(now.getTime() - 30 * 86400000), to: null }
  if (period === 'month')      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null }
  if (period === 'last_month') {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0, 23, 59, 59) }
  }
  if (period === 'custom') {
    return {
      from: customFrom ? new Date(customFrom) : null,
      to:   customTo   ? new Date(customTo + 'T23:59:59') : null,
    }
  }
  return { from: null, to: null }
}

// ── Calcul des stats par confirmatrice ────────────────────────────────────────
interface ConfStats {
  id: number
  name: string
  email: string
  confirmed: number    // confirmées + en livraison + livrées
  delivered: number    // livrées uniquement
  cancelled: number
  total_new: number    // nouvelles assignées (tout statut)
  ca: number           // CA des commandes confirmées+
  prime: number        // prime calculée
}

function computeStats(orders: Order[], primePerOrder: number): ConfStats[] {
  const map = new Map<number, ConfStats>()

  for (const o of orders) {
    if (!o.assignedTo) continue
    const { id, firstName, lastName, email } = o.assignedTo
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || email ?? `Conf ${id}`,
        email: email ?? '',
        confirmed: 0, delivered: 0, cancelled: 0, total_new: 0, ca: 0, prime: 0,
      })
    }
    const s = map.get(id)!
    s.total_new++
    if (CONFIRMED_STATUSES.includes(o.status)) {
      s.confirmed++
      s.ca += o.total ?? 0
    }
    if (o.status === 'delivered') s.delivered++
    if (o.status === 'cancelled') s.cancelled++
  }

  // Calcul de la prime
  for (const s of map.values()) {
    s.prime = s.confirmed * primePerOrder
  }

  return [...map.values()].sort((a, b) => b.confirmed - a.confirmed)
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function PrimesPage() {
  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [period,       setPeriod]       = useState<Period>('month')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [primePerOrder, setPrimePerOrder] = useState(100) // DA par commande confirmée

  // Charge TOUTES les commandes (on filtre côté client pour éviter une route API custom)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      let all: Order[] = []
      let page = 1
      while (true) {
        const res = await fetch(`/api/boutique-admin/orders?limit=100&page=${page}&depth=1`)
        if (!res.ok) break
        const data = await res.json()
        all = all.concat(data.docs ?? [])
        if (page >= (data.totalPages ?? 1)) break
        page++
      }
      setOrders(all)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Filtrage par période
  const { from, to } = getDateRange(period, customFrom, customTo)
  const filtered = orders.filter(o => {
    const d = new Date(o.createdAt)
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })

  const stats  = computeStats(filtered, primePerOrder)
  const totals = {
    confirmed: stats.reduce((s, c) => s + c.confirmed, 0),
    delivered: stats.reduce((s, c) => s + c.delivered, 0),
    cancelled: stats.reduce((s, c) => s + c.cancelled, 0),
    ca:        stats.reduce((s, c) => s + c.ca,        0),
    prime:     stats.reduce((s, c) => s + c.prime,     0),
    total_new: stats.reduce((s, c) => s + c.total_new, 0),
  }

  // Label de la période sélectionnée
  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? ''

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Primes confirmatrices</h1>
        <p style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
          Nombre de commandes confirmées par confirmatrice — base de calcul des primes
        </p>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

        {/* Période */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Période</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1px solid',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: period === p.value ? '#E93D91' : '#E3E5E7',
                  background:  period === p.value ? '#FEF3F8' : '#fff',
                  color:       period === p.value ? '#E93D91' : '#3D3D3D',
                }}
              >{p.label}</button>
            ))}
          </div>
        </div>

        {/* Dates custom */}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4 }}>Du</div>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ border: '1px solid #E3E5E7', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4 }}>Au</div>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ border: '1px solid #E3E5E7', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
            </div>
          </div>
        )}

        {/* Prime par commande */}
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prime / commande confirmée</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" min={0} step={50} value={primePerOrder}
              onChange={e => setPrimePerOrder(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: 90, border: '1px solid #E93D91', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#E93D91', textAlign: 'center' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8A8A8A' }}>DA</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A', fontSize: 14 }}>Chargement…</div>
      ) : stats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div>Aucune commande assignée sur cette période</div>
        </div>
      ) : (
        <>
          {/* Tableau par confirmatrice */}
          <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>Détail par confirmatrice</div>
              <div style={{ fontSize: 12, color: '#8A8A8A' }}>{filtered.length} commandes · {periodLabel}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFAFA' }}>
                  {['Confirmatrice','Assignées','Confirmées ✅','Livrées 📦','Annulées ❌','CA total','Prime estimée'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F1F1F1' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < stats.length - 1 ? '1px solid #F1F1F1' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {s.name[0]?.toUpperCase() ?? 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#9A9A9A' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#3D3D3D' }}>{s.total_new}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, fontSize: 14, borderRadius: 8, padding: '4px 10px' }}>
                        {s.confirmed}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#065F46' }}>{s.delivered}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#EF4444' }}>{s.cancelled}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#1A1A1A', whiteSpace: 'nowrap' }}>{fmt(s.ca)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: '#F0FDF4', color: '#15803D', fontWeight: 800, fontSize: 14, borderRadius: 8, padding: '6px 12px', border: '1px solid #BBF7D0', whiteSpace: 'nowrap' }}>
                        {fmt(s.prime)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Commandes assignées', value: totals.total_new,  color: '#3D3D3D', bg: '#F9FAFB' },
              { label: 'Confirmées',          value: totals.confirmed,  color: '#1D4ED8', bg: '#EFF6FF' },
              { label: 'Livrées',             value: totals.delivered,  color: '#065F46', bg: '#D1FAE5' },
              { label: 'Annulées',            value: totals.cancelled,  color: '#991B1B', bg: '#FEE2E2' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '14px 16px', border: '1px solid #E3E5E7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Récap primes */}
          <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>Total primes à verser — {periodLabel}</div>
              <div style={{ fontSize: 11, color: '#4ADE80' }}>{totals.confirmed} commandes confirmées × {primePerOrder} DA</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#15803D' }}>{fmt(totals.prime)}</div>
          </div>

          {/* Note */}
          <p style={{ fontSize: 11, color: '#B0B0B0', marginTop: 12, textAlign: 'center' }}>
            Les commandes comptabilisées incluent les statuts : Confirmée, En livraison, Livrée.
            Les commandes Nouvelles et Annulées ne génèrent pas de prime.
          </p>
        </>
      )}
    </div>
  )
}
