'use client'
import React, { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Confirmatrice {
  id: number
  firstName?: string
  lastName?: string
  email: string
}

interface Order {
  id: string
  orderNumber?: string
  customerName?: string
  phone?: string
  wilaya?: string
  total?: number
  createdAt: string
  assignedTo?: { id: number; firstName?: string; lastName?: string; email?: string } | null
}

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function confName(c: Confirmatrice) {
  return (`${c.firstName ?? ''} ${c.lastName ?? ''}`).trim() || c.email
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AssignationPage() {
  const [orders,          setOrders]          = useState<Order[]>([])
  const [confirmatrices,  setConfirmatrices]  = useState<Confirmatrice[]>([])
  const [loading,         setLoading]         = useState(true)
  // id de commande → id confirmatrice sélectionnée dans le select
  const [selections,      setSelections]      = useState<Record<string, string>>({})
  // id de commande → en cours de sauvegarde
  const [saving,          setSaving]          = useState<Record<string, boolean>>({})
  // id de commande → résultat (ok/err)
  const [results,         setResults]         = useState<Record<string, 'ok' | 'err'>>({})
  const [autoLoading,     setAutoLoading]     = useState(false)
  const [autoResult,      setAutoResult]      = useState<string | null>(null)
  // filtre : toutes les nouvelles, ou seulement non-assignées
  const [showUnassigned,  setShowUnassigned]  = useState(false)

  // Chargement des données
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch('/api/boutique-admin/orders?limit=100&depth=1&sort=-createdAt&where=' +
          encodeURIComponent(JSON.stringify({ status: { equals: 'new' } }))),
        fetch('/api/boutique-admin/users?limit=20&where[role][equals]=confirmatrice'),
      ])
      const ordersData = await ordersRes.json()
      const usersData  = await usersRes.json()
      setOrders(ordersData.docs ?? [])
      setConfirmatrices(usersData.docs ?? [])
      // Pré-remplir les selects avec l'assignation actuelle
      const sel: Record<string, string> = {}
      for (const o of (ordersData.docs ?? []) as Order[]) {
        if (o.assignedTo?.id) sel[o.id] = String(o.assignedTo.id)
      }
      setSelections(sel)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Assigner manuellement une commande
  async function assign(orderId: string, confId: string) {
    setSaving(prev => ({ ...prev, [orderId]: true }))
    setResults(prev => { const n = { ...prev }; delete n[orderId]; return n })
    try {
      const res = await fetch(`/api/boutique-admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: confId ? parseInt(confId) : null }),
      })
      if (res.ok) {
        setResults(prev => ({ ...prev, [orderId]: 'ok' }))
        // Mettre à jour l'ordre local
        setOrders(prev => prev.map(o =>
          o.id === orderId
            ? { ...o, assignedTo: confirmatrices.find(c => String(c.id) === confId) ? { id: parseInt(confId), ...confirmatrices.find(c => String(c.id) === confId) } : null }
            : o
        ))
      } else {
        setResults(prev => ({ ...prev, [orderId]: 'err' }))
      }
    } catch {
      setResults(prev => ({ ...prev, [orderId]: 'err' }))
    }
    setSaving(prev => ({ ...prev, [orderId]: false }))
  }

  // Distribution automatique round-robin sur les commandes non assignées
  async function autoDistribute() {
    const unassigned = orders.filter(o => !o.assignedTo)
    if (unassigned.length === 0 || confirmatrices.length === 0) return
    setAutoLoading(true)
    setAutoResult(null)
    let ok = 0; let err = 0
    for (let i = 0; i < unassigned.length; i++) {
      const conf = confirmatrices[i % confirmatrices.length]
      const res = await fetch(`/api/boutique-admin/orders/${unassigned[i].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: conf.id }),
      })
      if (res.ok) ok++; else err++
    }
    setAutoResult(`✅ ${ok} commande${ok > 1 ? 's' : ''} assignée${ok > 1 ? 's' : ''}${err > 0 ? ` — ⚠️ ${err} erreur(s)` : ''}`)
    await load()
    setAutoLoading(false)
  }

  const displayed = showUnassigned ? orders.filter(o => !o.assignedTo) : orders
  const unassignedCount = orders.filter(o => !o.assignedTo).length

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Assignation des commandes</h1>
        <p style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
          Répartissez les nouvelles commandes entre vos confirmatrices manuellement ou automatiquement
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A', fontSize: 14 }}>Chargement…</div>
      ) : (
        <>
          {/* Barre d'actions */}
          <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>

            {/* Compteurs */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#B45309' }}>
                {orders.length} nouvelle{orders.length > 1 ? 's' : ''}
              </div>
              {unassignedCount > 0 && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                  {unassignedCount} non assignée{unassignedCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowUnassigned(false)}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                  borderColor: !showUnassigned ? '#E93D91' : '#E3E5E7', background: !showUnassigned ? '#FEF3F8' : '#fff', color: !showUnassigned ? '#E93D91' : '#3D3D3D' }}>
                Toutes
              </button>
              <button onClick={() => setShowUnassigned(true)}
                style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                  borderColor: showUnassigned ? '#E93D91' : '#E3E5E7', background: showUnassigned ? '#FEF3F8' : '#fff', color: showUnassigned ? '#E93D91' : '#3D3D3D' }}>
                Non assignées
              </button>
            </div>

            {/* Bouton distribution auto */}
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                onClick={autoDistribute}
                disabled={autoLoading || unassignedCount === 0 || confirmatrices.length === 0}
                style={{ padding: '9px 18px', borderRadius: 9, background: unassignedCount === 0 ? '#F1F1F1' : 'linear-gradient(135deg, #E93D91, #C4197A)', border: 'none', color: unassignedCount === 0 ? '#9A9A9A' : '#fff', fontWeight: 700, fontSize: 13, cursor: unassignedCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {autoLoading ? '⏳ Distribution…' : `⚡ Distribuer automatiquement (${unassignedCount})`}
              </button>
              {autoResult && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{autoResult}</div>}
            </div>
          </div>

          {/* Confirmatrices disponibles */}
          {confirmatrices.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {confirmatrices.map(c => {
                const count = orders.filter(o => o.assignedTo?.id === c.id).length
                return (
                  <div key={c.id} style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      {confName(c)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{confName(c)}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A' }}>{count} commande{count > 1 ? 's' : ''} assignée{count > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Liste commandes */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #E3E5E7', color: '#9A9A9A' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 600 }}>{showUnassigned ? 'Toutes les commandes sont assignées' : 'Aucune nouvelle commande'}</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAFA' }}>
                    {['Commande', 'Client', 'Wilaya', 'Total', 'Date', 'Confirmatrice assignée', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #F1F1F1' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((o, i) => {
                    const isSaving = saving[o.id]
                    const result   = results[o.id]
                    const selVal   = selections[o.id] ?? ''

                    return (
                      <tr key={o.id} style={{ borderBottom: i < displayed.length - 1 ? '1px solid #F1F1F1' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#E93D91', fontFamily: 'monospace' }}>{o.orderNumber ?? o.id.slice(-6)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>{o.customerName ?? '—'}</div>
                          <div style={{ fontSize: 11, color: '#9A9A9A' }}>{o.phone}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#3D3D3D' }}>{o.wilaya ?? '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1A1A1A', whiteSpace: 'nowrap' }}>{o.total ? fmt(o.total) : '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#9A9A9A', whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={selVal}
                            onChange={e => setSelections(prev => ({ ...prev, [o.id]: e.target.value }))}
                            disabled={isSaving}
                            style={{ border: '1px solid #E3E5E7', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: selVal ? '#1A1A1A' : '#9A9A9A', background: '#fff', cursor: 'pointer', minWidth: 160 }}>
                            <option value="">— Non assignée —</option>
                            {confirmatrices.map(c => (
                              <option key={c.id} value={String(c.id)}>{confName(c)}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => assign(o.id, selVal)}
                            disabled={isSaving || selVal === (o.assignedTo?.id ? String(o.assignedTo.id) : '')}
                            style={{ padding: '6px 14px', borderRadius: 8, background: '#E93D91', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: isSaving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                            {isSaving ? '…' : result === 'ok' ? '✓ Sauvé' : result === 'err' ? '✗ Erreur' : 'Assigner'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
