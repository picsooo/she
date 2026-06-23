'use client'
import React, { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Confirmatrice {
  id: number
  firstName?: string
  lastName?: string
  email: string
  active?: boolean
}

interface Order {
  id: string
  orderNumber?: string
  customerName?: string
  phone?: string
  wilaya?: string
  total?: number
  status?: string
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
  // filtre : all | new | pending | unassigned
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'pending' | 'unassigned'>('all')
  // id de confirmatrice → en cours de toggle actif/inactif
  const [toggling,        setToggling]        = useState<Record<number, boolean>>({})
  // Changement mot de passe confirmatrice
  const [pwdOpen,   setPwdOpen]   = useState<Record<number, boolean>>({})
  const [pwdValues, setPwdValues] = useState<Record<number, { pwd: string; confirm: string }>>({})
  const [pwdSaving, setPwdSaving] = useState<Record<number, boolean>>({})
  const [pwdResult, setPwdResult] = useState<Record<number, 'ok' | 'err' | null>>({})

  // Chargement des données
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch('/api/boutique-admin/orders?limit=100&depth=1&sort=-createdAt&where=' +
          encodeURIComponent(JSON.stringify({ status: { in: ['new', 'pending'] } }))),
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

  // Changer le mot de passe d'une confirmatrice
  async function changePassword(conf: Confirmatrice) {
    const vals = pwdValues[conf.id] ?? { pwd: '', confirm: '' }
    if (!vals.pwd || vals.pwd.length < 8) return
    if (vals.pwd !== vals.confirm) return
    setPwdSaving(prev => ({ ...prev, [conf.id]: true }))
    setPwdResult(prev => ({ ...prev, [conf.id]: null }))
    try {
      const res = await fetch(`/api/boutique-admin/users/${conf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: vals.pwd }),
      })
      if (res.ok) {
        setPwdResult(prev => ({ ...prev, [conf.id]: 'ok' }))
        setPwdValues(prev => ({ ...prev, [conf.id]: { pwd: '', confirm: '' } }))
        setTimeout(() => {
          setPwdOpen(prev => ({ ...prev, [conf.id]: false }))
          setPwdResult(prev => ({ ...prev, [conf.id]: null }))
        }, 2000)
      } else {
        setPwdResult(prev => ({ ...prev, [conf.id]: 'err' }))
      }
    } catch {
      setPwdResult(prev => ({ ...prev, [conf.id]: 'err' }))
    }
    setPwdSaving(prev => ({ ...prev, [conf.id]: false }))
  }

  // Toggle actif/inactif d'une confirmatrice
  async function toggleActive(conf: Confirmatrice) {
    setToggling(prev => ({ ...prev, [conf.id]: true }))
    try {
      const res = await fetch(`/api/boutique-admin/users/${conf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !conf.active }),
      })
      if (res.ok) {
        setConfirmatrices(prev =>
          prev.map(c => c.id === conf.id ? { ...c, active: !conf.active } : c)
        )
      }
    } catch { /* ignore */ }
    setToggling(prev => ({ ...prev, [conf.id]: false }))
  }

  // Distribution automatique round-robin sur les commandes non assignées (actives seulement)
  async function autoDistribute() {
    const activeConfs = confirmatrices.filter(c => c.active !== false)
    const unassigned = orders.filter(o => !o.assignedTo)
    if (unassigned.length === 0 || activeConfs.length === 0) return
    setAutoLoading(true)
    setAutoResult(null)
    let ok = 0; let err = 0
    for (let i = 0; i < unassigned.length; i++) {
      const conf = activeConfs[i % activeConfs.length]
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

  const unassignedCount = orders.filter(o => !o.assignedTo).length
  const newCount        = orders.filter(o => o.status === 'new').length
  const pendingCount    = orders.filter(o => o.status === 'pending').length

  const displayed = (() => {
    if (statusFilter === 'new')        return orders.filter(o => o.status === 'new')
    if (statusFilter === 'pending')    return orders.filter(o => o.status === 'pending')
    if (statusFilter === 'unassigned') return orders.filter(o => !o.assignedTo)
    return orders
  })()

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Assignation des commandes</h1>
        <p style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
          Répartissez les commandes nouvelles et en attente entre vos confirmatrices manuellement ou automatiquement
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A', fontSize: 14 }}>Chargement…</div>
      ) : (
        <>
          {/* Barre d'actions */}
          <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>

            {/* Filtres cliquables (compteurs + statuts) */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Nouvelles */}
              <button onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                borderColor: statusFilter === 'new' ? '#F59E0B' : '#FDE68A',
                background:  statusFilter === 'new' ? '#F59E0B' : '#FEF3C7',
                color:       statusFilter === 'new' ? '#fff'    : '#B45309',
                boxShadow:   statusFilter === 'new' ? '0 2px 6px rgba(245,158,11,0.35)' : 'none',
              }}>
                {newCount} nouvelle{newCount > 1 ? 's' : ''}
              </button>

              {/* En attente */}
              <button onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', border: '1px solid',
                borderColor: statusFilter === 'pending' ? '#4338CA' : '#C7D2FE',
                background:  statusFilter === 'pending' ? '#4338CA' : '#EEF2FF',
                color:       statusFilter === 'pending' ? '#fff'    : '#4338CA',
                boxShadow:   statusFilter === 'pending' ? '0 2px 6px rgba(67,56,202,0.3)' : 'none',
              }}>
                {pendingCount} en attente
              </button>

              {/* Toutes */}
              <button onClick={() => setStatusFilter('all')} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                borderColor: statusFilter === 'all' ? '#E93D91' : '#E3E5E7',
                background:  statusFilter === 'all' ? '#FEF3F8' : '#fff',
                color:       statusFilter === 'all' ? '#E93D91' : '#3D3D3D',
              }}>
                Toutes
              </button>

              {/* Non assignées */}
              <button onClick={() => setStatusFilter(statusFilter === 'unassigned' ? 'all' : 'unassigned')} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                borderColor: statusFilter === 'unassigned' ? '#991B1B' : '#E3E5E7',
                background:  statusFilter === 'unassigned' ? '#FEE2E2' : '#fff',
                color:       statusFilter === 'unassigned' ? '#991B1B' : '#3D3D3D',
              }}>
                Non assignées {unassignedCount > 0 && `(${unassignedCount})`}
              </button>
            </div>

            {/* Bouton distribution auto */}
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                onClick={autoDistribute}
                disabled={autoLoading || unassignedCount === 0 || confirmatrices.filter(c => c.active !== false).length === 0}
                style={{ padding: '9px 18px', borderRadius: 9, background: unassignedCount === 0 ? '#F1F1F1' : 'linear-gradient(135deg, #E93D91, #C4197A)', border: 'none', color: unassignedCount === 0 ? '#9A9A9A' : '#fff', fontWeight: 700, fontSize: 13, cursor: unassignedCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {autoLoading ? '⏳ Distribution…' : `⚡ Distribuer automatiquement (${unassignedCount})`}
              </button>
              {autoResult && <div style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{autoResult}</div>}
            </div>
          </div>

          {/* Confirmatrices — avec toggle actif/inactif */}
          {confirmatrices.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {confirmatrices.map(c => {
                const count   = orders.filter(o => o.assignedTo?.id === c.id).length
                const isActive = c.active !== false
                const isBusy   = toggling[c.id]
                return (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', minWidth: 220 }}>
                  <div style={{ background: '#fff', border: `1px solid ${isActive ? '#E3E5E7' : '#FECACA'}`, borderRadius: pwdOpen[c.id] ? '10px 10px 0 0' : 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: isActive ? 1 : 0.65 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: isActive ? 'linear-gradient(135deg, #E93D91, #CEA060)' : '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                      {confName(c)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{confName(c)}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A' }}>{count} commande{count > 1 ? 's' : ''} assignée{count > 1 ? 's' : ''}</div>
                    </div>
                    {/* Toggle actif/inactif */}
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={isBusy}
                      title={isActive ? 'Désactiver (exclure de la distribution)' : 'Activer'}
                      style={{
                        marginLeft: 4,
                        width: 44, height: 24, borderRadius: 12,
                        border: 'none', cursor: isBusy ? 'wait' : 'pointer',
                        background: isActive ? '#10B981' : '#D1D5DB',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 3,
                        left: isActive ? 22 : 3,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>

                    {/* Bouton changer mot de passe */}
                    <button
                      onClick={() => {
                        setPwdOpen(prev => ({ ...prev, [c.id]: !prev[c.id] }))
                        setPwdResult(prev => ({ ...prev, [c.id]: null }))
                        setPwdValues(prev => ({ ...prev, [c.id]: { pwd: '', confirm: '' } }))
                      }}
                      title="Changer le mot de passe"
                      style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 8, border: '1px solid #E3E5E7', background: pwdOpen[c.id] ? '#FEF3F8' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}
                    >🔑</button>
                  </div>{/* fin card row */}

                  {/* Formulaire inline changement mot de passe */}
                  {pwdOpen[c.id] && (
                    <div style={{ padding: '12px 14px', background: '#FEF3F8', border: '1px solid #FBCFE8', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9D174D', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Nouveau mot de passe — {confName(c)}
                      </div>
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe (min. 8 caractères)"
                        value={pwdValues[c.id]?.pwd ?? ''}
                        onChange={e => setPwdValues(prev => ({ ...prev, [c.id]: { ...prev[c.id] ?? { pwd: '', confirm: '' }, pwd: e.target.value } }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #E3E5E7', borderRadius: 6, fontSize: 13, marginBottom: 6, boxSizing: 'border-box' }}
                      />
                      <input
                        type="password"
                        placeholder="Confirmer le mot de passe"
                        value={pwdValues[c.id]?.confirm ?? ''}
                        onChange={e => setPwdValues(prev => ({ ...prev, [c.id]: { ...prev[c.id] ?? { pwd: '', confirm: '' }, confirm: e.target.value } }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid #E3E5E7', borderRadius: 6, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                      />
                      {/* Validation feedback */}
                      {(() => {
                        const v = pwdValues[c.id]
                        if (!v?.pwd) return null
                        if (v.pwd.length < 8) return <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 6 }}>⚠️ Minimum 8 caractères</div>
                        if (v.confirm && v.pwd !== v.confirm) return <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 6 }}>⚠️ Les mots de passe ne correspondent pas</div>
                        if (v.confirm && v.pwd === v.confirm) return <div style={{ fontSize: 11, color: '#059669', marginBottom: 6 }}>✓ Les mots de passe correspondent</div>
                        return null
                      })()}
                      {pwdResult[c.id] === 'ok' && <div style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginBottom: 6 }}>✅ Mot de passe changé avec succès</div>}
                      {pwdResult[c.id] === 'err' && <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, marginBottom: 6 }}>❌ Erreur — réessayez</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => changePassword(c)}
                          disabled={
                            pwdSaving[c.id] ||
                            !pwdValues[c.id]?.pwd ||
                            (pwdValues[c.id]?.pwd?.length ?? 0) < 8 ||
                            pwdValues[c.id]?.pwd !== pwdValues[c.id]?.confirm
                          }
                          style={{ flex: 1, padding: '7px 12px', borderRadius: 7, background: '#E93D91', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: pwdSaving[c.id] ? 0.6 : 1 }}
                        >
                          {pwdSaving[c.id] ? '…' : 'Enregistrer'}
                        </button>
                        <button
                          onClick={() => setPwdOpen(prev => ({ ...prev, [c.id]: false }))}
                          style={{ padding: '7px 12px', borderRadius: 7, background: '#fff', border: '1px solid #E3E5E7', color: '#3D3D3D', fontSize: 12, cursor: 'pointer' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Liste commandes */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #E3E5E7', color: '#9A9A9A' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <div style={{ fontWeight: 600 }}>{statusFilter === 'unassigned' ? 'Toutes les commandes sont assignées' : 'Aucune commande pour ce filtre'}</div>
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
                          {o.status === 'pending' && (
                            <div style={{ marginTop: 4, display: 'inline-block', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#4338CA' }}>
                              EN ATTENTE
                            </div>
                          )}
                          {o.status === 'new' && (
                            <div style={{ marginTop: 4, display: 'inline-block', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, color: '#B45309' }}>
                              NOUVELLE
                            </div>
                          )}
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
