'use client'
import React, { useEffect, useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ConfirmatriceUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  confirmatriceType?: 'salarie' | 'non_salarie'
  salaireMensuel?: number
  seuilCommandes?: number
  primeParCommande?: number
}

interface Order {
  id: string
  status: string
  total?: number
  createdAt: string
  assignedTo?: { id: string } | null
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

const fmt = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
const fmtNum = (n: number) => new Intl.NumberFormat('fr-DZ').format(n)

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

// ── Calcul de la prime selon le type de confirmatrice ─────────────────────────
interface ConfStats {
  user: ConfirmatriceUser
  delivered: number
  confirmed: number   // confirmées + en livraison + livrées
  pending: number     // en attente (mises de côté par la confirmatrice)
  cancelled: number
  total_new: number
  ca: number
  // Résultat du calcul prime
  prime: number
  salaireDebloque: boolean   // true si seuil atteint (salariées)
  primeDetail: string        // description lisible du calcul
}

function computePrime(user: ConfirmatriceUser, delivered: number): { prime: number; salaireDebloque: boolean; detail: string } {
  const primeCmd = user.primeParCommande ?? 0

  if (user.confirmatriceType === 'salarie') {
    const salaire = user.salaireMensuel ?? 0
    const seuil   = user.seuilCommandes ?? 0
    const debloque = delivered >= seuil && seuil > 0

    if (!debloque) {
      return {
        prime: 0,
        salaireDebloque: false,
        detail: `${delivered}/${seuil} cmd → seuil non atteint`,
      }
    }
    const prime = salaire + delivered * primeCmd
    return {
      prime,
      salaireDebloque: true,
      detail: `${fmt(salaire)} (salaire) + ${delivered} × ${fmt(primeCmd)} (prime)`,
    }
  }

  // Non-salariée : prime pure par commande livrée, pas de seuil
  const prime = delivered * primeCmd
  return {
    prime,
    salaireDebloque: false,
    detail: `${delivered} × ${fmt(primeCmd)}`,
  }
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function PrimesPage() {
  const [confirmatrices, setConfirmatrices] = useState<ConfirmatriceUser[]>([])
  const [orders,         setOrders]         = useState<Order[]>([])
  const [loading,        setLoading]        = useState(true)
  const [period,         setPeriod]         = useState<Period>('month')
  const [customFrom,     setCustomFrom]     = useState('')
  const [customTo,       setCustomTo]       = useState('')
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [editForm,       setEditForm]       = useState<Partial<ConfirmatriceUser>>({})
  const [saving,         setSaving]         = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Charger confirmatrices
      const usersRes = await fetch('/api/boutique-admin/users?where[role][equals]=confirmatrice&limit=50&depth=0')
      const usersData = await usersRes.json()
      setConfirmatrices(usersData.docs ?? [])

      // Charger toutes les commandes avec depth=0 pour perf
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

  // Sauvegarde config prime d'une confirmatrice
  async function saveConfig(userId: string) {
    setSaving(true)
    try {
      await fetch(`/api/boutique-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmatriceType: editForm.confirmatriceType,
          salaireMensuel:    editForm.salaireMensuel ?? null,
          seuilCommandes:    editForm.seuilCommandes ?? null,
          primeParCommande:  editForm.primeParCommande ?? 0,
        }),
      })
      // Mettre à jour en local
      setConfirmatrices(prev => prev.map(u => u.id === userId ? { ...u, ...editForm } : u))
      setEditingId(null)
    } catch { /* ignore */ }
    setSaving(false)
  }

  // Filtrage par période
  const { from, to } = getDateRange(period, customFrom, customTo)
  const filtered = orders.filter(o => {
    const d = new Date(o.createdAt)
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })

  // Calcul des stats par confirmatrice
  const stats: ConfStats[] = confirmatrices.map(user => {
    const myOrders = filtered.filter(o => o.assignedTo?.id === user.id || o.assignedTo?.id === String(user.id))

    let delivered = 0, confirmed = 0, pending = 0, cancelled = 0, ca = 0
    for (const o of myOrders) {
      if (['confirmed', 'shipping', 'delivered'].includes(o.status)) { confirmed++; ca += o.total ?? 0 }
      if (o.status === 'delivered') delivered++
      if (o.status === 'pending')   pending++
      if (o.status === 'cancelled') cancelled++
    }

    const { prime, salaireDebloque, detail } = computePrime(user, delivered)
    return {
      user, delivered, confirmed, pending, cancelled,
      total_new: myOrders.length, ca,
      prime, salaireDebloque, primeDetail: detail,
    }
  })

  const totals = {
    confirmed: stats.reduce((s, c) => s + c.confirmed, 0),
    delivered: stats.reduce((s, c) => s + c.delivered, 0),
    pending:   stats.reduce((s, c) => s + c.pending,   0),
    cancelled: stats.reduce((s, c) => s + c.cancelled, 0),
    ca:        stats.reduce((s, c) => s + c.ca,        0),
    prime:     stats.reduce((s, c) => s + c.prime,     0),
    total_new: stats.reduce((s, c) => s + c.total_new, 0),
  }

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? ''

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Primes confirmatrices</h1>
        <p style={{ fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>
          Calcul des rémunérations par confirmatrice selon leur type (salariée / non-salariée)
        </p>
      </div>

      {/* Filtres période */}
      <div style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Période</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                borderColor: period === p.value ? '#E93D91' : '#E3E5E7',
                background:  period === p.value ? '#FEF3F8' : '#fff',
                color:       period === p.value ? '#E93D91' : '#3D3D3D',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

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
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A', fontSize: 14 }}>Chargement…</div>
      ) : confirmatrices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9A9A9A' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
          <div>Aucune confirmatrice trouvée</div>
        </div>
      ) : (
        <>
          {/* Cartes par confirmatrice */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {stats.map(s => {
              const isEditing = editingId === s.user.id
              const typeSalarie = s.user.confirmatriceType === 'salarie'
              const typeBg    = typeSalarie ? '#EFF6FF' : '#F5F3FF'
              const typeColor = typeSalarie ? '#1D4ED8' : '#7C3AED'
              const typeLabel = typeSalarie ? 'Salariée' : 'Non-salariée'

              return (
                <div key={s.user.id} style={{ background: '#fff', border: '1px solid #E3E5E7', borderRadius: 14, overflow: 'hidden' }}>
                  {/* En-tête carte */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {((s.user.firstName?.[0] ?? s.user.email[0]) ?? 'C').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>
                        {[s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || s.user.email}
                      </div>
                      <div style={{ fontSize: 12, color: '#9A9A9A' }}>{s.user.email}</div>
                    </div>
                    {/* Badge type */}
                    <span style={{ background: typeBg, color: typeColor, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', border: `1px solid ${typeColor}22` }}>
                      {s.user.confirmatriceType ? typeLabel : '⚠️ Non configurée'}
                    </span>
                    {/* Bouton config */}
                    <button
                      onClick={() => {
                        if (isEditing) { setEditingId(null); return }
                        setEditingId(s.user.id)
                        setEditForm({
                          confirmatriceType: s.user.confirmatriceType ?? 'non_salarie',
                          salaireMensuel:    s.user.salaireMensuel,
                          seuilCommandes:    s.user.seuilCommandes,
                          primeParCommande:  s.user.primeParCommande ?? 0,
                        })
                      }}
                      style={{ padding: '6px 14px', background: isEditing ? '#F1F5F9' : '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 8, fontSize: 12, fontWeight: 600, color: isEditing ? '#6D7175' : '#3D3D3D', cursor: 'pointer' }}
                    >
                      {isEditing ? 'Annuler' : '⚙️ Configurer'}
                    </button>
                  </div>

                  {/* Formulaire config (si édition) */}
                  {isEditing && (
                    <div style={{ padding: '16px 20px', background: '#FAFBFF', borderBottom: '1px solid #E8EEFF', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                      {/* Type */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</div>
                        <select
                          value={editForm.confirmatriceType ?? 'non_salarie'}
                          onChange={e => setEditForm(f => ({ ...f, confirmatriceType: e.target.value as 'salarie' | 'non_salarie' }))}
                          style={{ border: '1px solid #E3E5E7', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
                        >
                          <option value="non_salarie">Non-salariée (prime seule)</option>
                          <option value="salarie">Salariée (fixe + prime)</option>
                        </select>
                      </div>

                      {/* Prime par commande */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prime/commande (DA)</div>
                        <input
                          type="number" min={0} step={50}
                          value={editForm.primeParCommande ?? 0}
                          onChange={e => setEditForm(f => ({ ...f, primeParCommande: Math.max(0, parseInt(e.target.value) || 0) }))}
                          style={{ width: 110, border: '1px solid #E93D91', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, color: '#E93D91', textAlign: 'center' }}
                        />
                      </div>

                      {/* Salaire (salariée uniquement) */}
                      {editForm.confirmatriceType === 'salarie' && (
                        <>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Salaire mensuel (DA)</div>
                            <input
                              type="number" min={0} step={500}
                              value={editForm.salaireMensuel ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, salaireMensuel: parseInt(e.target.value) || 0 }))}
                              style={{ width: 130, border: '1px solid #1D4ED8', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, color: '#1D4ED8', textAlign: 'center' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6D7175', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Seuil (nb livraisons)</div>
                            <input
                              type="number" min={0} step={1}
                              value={editForm.seuilCommandes ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, seuilCommandes: parseInt(e.target.value) || 0 }))}
                              style={{ width: 110, border: '1px solid #7C3AED', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontWeight: 600, color: '#7C3AED', textAlign: 'center' }}
                            />
                          </div>
                        </>
                      )}

                      <button
                        onClick={() => saveConfig(s.user.id)}
                        disabled={saving}
                        style={{ padding: '8px 20px', background: saving ? '#9A9A9A' : '#E93D91', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
                      >
                        {saving ? 'Enregistrement…' : '✓ Enregistrer'}
                      </button>
                    </div>
                  )}

                  {/* Stats de la période */}
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Assignées',   value: fmtNum(s.total_new), color: '#3D3D3D',  bg: '#F9FAFB'  },
                      { label: 'Confirmées',  value: fmtNum(s.confirmed), color: '#1D4ED8',  bg: '#EFF6FF'  },
                      { label: 'Livrées',     value: fmtNum(s.delivered), color: '#065F46',  bg: '#D1FAE5'  },
                      { label: 'En attente',  value: fmtNum(s.pending),   color: '#92400E',  bg: '#FEF9C3'  },
                      { label: 'Annulées',    value: fmtNum(s.cancelled), color: '#991B1B',  bg: '#FEE2E2'  },
                    ].map(card => (
                      <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '12px 14px', border: '1px solid #E3E5E7' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                      </div>
                    ))}

                    {/* Bloc prime */}
                    <div style={{ background: s.prime > 0 ? '#F0FDF4' : '#F9FAFB', borderRadius: 10, padding: '12px 14px', border: `1px solid ${s.prime > 0 ? '#BBF7D0' : '#E3E5E7'}`, gridColumn: 'span 2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prime estimée</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: s.prime > 0 ? '#15803D' : '#9A9A9A' }}>{fmt(s.prime)}</div>
                          <div style={{ fontSize: 11, color: '#8A8A8A', marginTop: 4 }}>{s.primeDetail}</div>
                        </div>
                        {/* Barre de progrès pour salariées */}
                        {typeSalarie && (s.user.seuilCommandes ?? 0) > 0 && (
                          <div style={{ width: 90, flexShrink: 0 }}>
                            <div style={{ fontSize: 10, color: '#8A8A8A', marginBottom: 4, textAlign: 'right' }}>
                              {s.delivered}/{s.user.seuilCommandes} livraisons
                            </div>
                            <div style={{ background: '#E3E5E7', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 4, transition: 'width 0.5s',
                                background: s.salaireDebloque ? '#15803D' : '#7C3AED',
                                width: `${Math.min(100, ((s.delivered / (s.user.seuilCommandes ?? 1)) * 100))}%`,
                              }} />
                            </div>
                            <div style={{ fontSize: 10, color: s.salaireDebloque ? '#15803D' : '#7C3AED', fontWeight: 700, marginTop: 3, textAlign: 'right' }}>
                              {s.salaireDebloque ? '✓ Seuil atteint' : `${s.user.seuilCommandes! - s.delivered} restantes`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Récap global */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Commandes assignées', value: totals.total_new,  color: '#3D3D3D', bg: '#F9FAFB' },
              { label: 'Confirmées',          value: totals.confirmed,  color: '#1D4ED8', bg: '#EFF6FF' },
              { label: 'Livrées',             value: totals.delivered,  color: '#065F46', bg: '#D1FAE5' },
              { label: 'En attente',          value: totals.pending,    color: '#92400E', bg: '#FEF9C3' },
              { label: 'Annulées',            value: totals.cancelled,  color: '#991B1B', bg: '#FEE2E2' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '14px 16px', border: '1px solid #E3E5E7' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 4 }}>Total primes à verser — {periodLabel}</div>
              <div style={{ fontSize: 11, color: '#4ADE80' }}>Toutes confirmatrices confondues</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#15803D' }}>{fmt(totals.prime)}</div>
          </div>

          <p style={{ fontSize: 11, color: '#B0B0B0', marginTop: 12, textAlign: 'center' }}>
            Salariée : seuil non atteint → 0 DA. Seuil atteint → salaire fixe + (livrées × prime/cmd).
            Non-salariée : livrées × prime/cmd (sans seuil).
          </p>
        </>
      )}
    </div>
  )
}
