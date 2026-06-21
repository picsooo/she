'use client'
import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ReturnOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  wilaya: string
  commune?: string
  total: number
  status: string
  yalidineStatus?: string
  yalidineTrackingId?: string
  stockDecremented?: boolean
  createdAt: string
  updatedAt: string
  items?: Array<{
    productName?: string
    quantity?: number
    unitPrice?: number
    colorAr?: string
    size?: string
  }>
}

// Filtres date — identiques aux autres pages boutique-admin
const DATE_PRESETS = [
  { label: 'Tout',      value: '' },
  { label: 'Ce mois',  value: 'month' },
  { label: '30 jours', value: '30d' },
  { label: '7 jours',  value: '7d' },
]

const fmt     = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * Calcule la date de début selon le preset sélectionné.
 * Retourne null si "Tout" est sélectionné.
 */
function getDateFrom(preset: string): string | null {
  const now = new Date()
  if (preset === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  if (preset === '30d')   return new Date(now.getTime() - 30 * 86400000).toISOString()
  if (preset === '7d')    return new Date(now.getTime() - 7  * 86400000).toISOString()
  return null
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function ReturnsPage() {
  const [returns,    setReturns]    = useState<ReturnOrder[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [datePreset, setDatePreset] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Toujours filtrer sur status = returned
      const where: Record<string, unknown> = {
        status: { equals: 'returned' },
      }

      const dateFrom = getDateFrom(datePreset)
      if (dateFrom) {
        where.createdAt = { greater_than: dateFrom }
      }

      const params = new URLSearchParams({
        limit: '50',
        page: '1',
        sort: '-updatedAt',
        depth: '1',
        where: JSON.stringify(where),
      })

      const data = await fetch('/api/boutique-admin/orders?' + params).then(r => r.json())
      setReturns(data.docs ?? [])
      setTotal(data.totalDocs ?? 0)
    } finally {
      setLoading(false)
    }
  }, [datePreset])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1100, animation: 'fadeIn 0.25s ease' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Retours</h1>
          <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>
            <span style={{ color: '#1A1A1A', fontWeight: 600 }}>{total}</span>
            {' '}retour{total > 1 ? 's' : ''} au total — colis retournés au vendeur
          </p>
        </div>
      </div>

      {/* Filtres date */}
      <div style={{ display: 'flex', gap: 4, background: '#F5F5F5', borderRadius: 8, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {DATE_PRESETS.map(p => (
          <button key={p.value} onClick={() => setDatePreset(p.value)} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: datePreset === p.value ? 600 : 400,
            background: datePreset === p.value ? '#fff' : 'transparent',
            color: datePreset === p.value ? '#1A1A1A' : '#6D7175',
            border: 'none', cursor: 'pointer',
            boxShadow: datePreset === p.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E3E5E7', background: '#FAFAFA' }}>
              {['N° commande', 'Client', 'Wilaya', 'Articles', 'Total', 'Statut Yalidine', 'Stock', 'Date retour', 'Actions'].map(h => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E3E5E7', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </td></tr>
            ) : returns.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '64px', textAlign: 'center', color: '#9A9A9A' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
                <div style={{ fontWeight: 500 }}>Aucun retour{datePreset ? ' sur cette période' : ''}</div>
              </td></tr>
            ) : returns.map(o => {
              const isExpanded = expandedId === o.id
              // Stock restauré = stockDecremented est false (le hook l'a remis à false après restauration)
              const stockRestored = o.stockDecremented === false

              return (
                <React.Fragment key={o.id}>
                  <tr
                    className="admin-row-hover"
                    style={{ borderBottom: isExpanded ? 'none' : '1px solid #F1F1F1', background: isExpanded ? '#FFFBF7' : undefined, cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                  >
                    {/* N° commande */}
                    <td style={{ ...TD, fontWeight: 700, color: '#E93D91', fontFamily: 'monospace', fontSize: 12 }}>
                      {o.orderNumber}
                    </td>

                    {/* Client */}
                    <td style={TD}>
                      <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{o.customerName}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 1 }}>{o.phone}</div>
                    </td>

                    {/* Wilaya */}
                    <td style={TD}>
                      <span style={{ fontSize: 12, color: '#6D7175', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10 }}>📍</span> {o.wilaya}
                      </span>
                      {o.commune && <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2 }}>{o.commune}</div>}
                    </td>

                    {/* Articles — résumé compact */}
                    <td style={TD}>
                      {o.items && o.items.length > 0 ? (
                        <div style={{ fontSize: 11, color: '#4A4A4A' }}>
                          {o.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 2 }}>
                              <span style={{ fontWeight: 600 }}>{item.productName ?? '—'}</span>
                              {(item.colorAr || item.size) && (
                                <span style={{ color: '#9A9A9A', marginLeft: 6 }}>
                                  {[item.colorAr, item.size].filter(Boolean).join(' · ')}
                                </span>
                              )}
                              <span style={{ color: '#B0B0B0', marginLeft: 4 }}>×{item.quantity ?? 1}</span>
                            </div>
                          ))}
                          {o.items.length > 2 && (
                            <div style={{ color: '#9A9A9A', fontSize: 10 }}>+{o.items.length - 2} article{o.items.length - 2 > 1 ? 's' : ''}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* Total */}
                    <td style={{ ...TD, fontWeight: 700, color: '#B45309', whiteSpace: 'nowrap' }}>{fmt(o.total)}</td>

                    {/* Statut Yalidine */}
                    <td style={TD}>
                      {o.yalidineStatus ? (
                        <span style={{
                          display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                          background: '#FFF7ED', color: '#92400E',
                          border: '1px solid #FED7AA', fontSize: 11, fontWeight: 600,
                        }}>
                          {o.yalidineStatus}
                        </span>
                      ) : (
                        <span style={{ color: '#C0C0C0', fontSize: 11 }}>—</span>
                      )}
                      {o.yalidineTrackingId && (
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#9A9A9A', marginTop: 3 }}>
                          {o.yalidineTrackingId}
                        </div>
                      )}
                    </td>

                    {/* Badge stock restauré */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {stockRestored ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: '#D1FAE5', color: '#065F46', border: '1px solid #86EFAC',
                        }}>
                          ✓ Restauré
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE047',
                        }}>
                          En attente
                        </span>
                      )}
                    </td>

                    {/* Date retour */}
                    <td style={TD}>
                      <div style={{ fontSize: 12, color: '#6D7175' }}>{fmtDate(o.updatedAt)}</div>
                      <div style={{ fontSize: 10, color: '#B0B0B0', marginTop: 1 }}>Créée: {fmtDate(o.createdAt)}</div>
                    </td>

                    {/* Actions */}
                    <td style={{ ...TD, whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link
                          href={`/boutique-admin/orders/${o.id}`}
                          style={{ padding: '5px 12px', background: '#F1F5F9', border: '1px solid #E3E5E7', color: '#4A3DBC', borderRadius: 7, fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                        >
                          Voir
                        </Link>
                        <button style={{ padding: '5px 8px', background: '#F5F5F5', border: '1px solid #E3E5E7', color: '#6D7175', borderRadius: 7, fontSize: 11, cursor: 'pointer' }}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Ligne expandée — détail articles */}
                  {isExpanded && (
                    <tr style={{ background: '#FFFBF7', borderBottom: '1px solid #FED7AA' }}>
                      <td colSpan={9} style={{ padding: '0 20px 20px' }}>
                        <div style={{ background: '#fff', border: '1px solid #FED7AA', borderRadius: 10, padding: 20, marginTop: 8 }}>
                          <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                            Articles retournés
                          </div>
                          {o.items && o.items.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {o.items.map((item, idx) => (
                                <div key={idx} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  background: '#FAFAFA', border: '1px solid #E3E5E7', borderRadius: 8, padding: '10px 14px', fontSize: 13,
                                }}>
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
                                    {item.unitPrice && <span style={{ fontWeight: 700, color: '#B45309' }}>{fmt(item.unitPrice)}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: '#9A9A9A', fontSize: 13 }}>Aucun article enregistré</p>
                          )}
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

      {/* Note informative */}
      {returns.length >= 50 && (
        <p style={{ marginTop: 12, fontSize: 12, color: '#9A9A9A', textAlign: 'center' }}>
          Affichage limité aux 50 retours les plus récents. Utilisez un filtre de date pour affiner.
        </p>
      )}
    </div>
  )
}

const TH: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 10, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.08em' }
const TD: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle' }
