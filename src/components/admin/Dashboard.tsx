'use client'
/**
 * Dashboard e-commerce premium — She's Fit & Beauty
 * Inclut : stats par statut, rendement confirmatrices, analytics produits, Yalidine
 */
import React, { useEffect, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalOrders: number
  newOrders: number
  monthOrders: number
  todayOrders: number
  publishedProducts: number
  draftProducts: number
  monthRevenue: number
  recentOrders: RecentOrder[]
  statusCounts: Record<string, number>
  confirmatriceStats: ConfirmatriceStats[]
  topProducts: TopProduct[]
}

interface RecentOrder {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  wilaya: string
  total: number
  status: string
  deliveryMode?: string
  assignedTo?: { id: string; firstName?: string; lastName?: string; email?: string }
  createdAt: string
}

interface ConfirmatriceStats {
  id: string
  name: string
  confirmed: number
  total: number
  failed: number
  cancelled: number
}

interface TopProduct {
  productId: string
  productName: string
  count: number
  revenue: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-DZ').format(n) + ' دج'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  new:         { label: 'جديدة',          bg: '#FFF7E6', color: '#D97706', icon: '🆕' },
  pending:     { label: 'في الانتظار',    bg: '#FEF3C7', color: '#B45309', icon: '⏳' },
  in_progress: { label: 'قيد المعالجة',  bg: '#EFF6FF', color: '#1D4ED8', icon: '🔄' },
  confirmed:   { label: 'مؤكدة',          bg: '#E0F2FE', color: '#0369A1', icon: '✅' },
  shipping:    { label: 'قيد التوصيل',   bg: '#F5F3FF', color: '#6D28D9', icon: '🚚' },
  delivered:   { label: 'تم التسليم',     bg: '#F0FDF4', color: '#15803D', icon: '🎉' },
  failed:      { label: 'فاشلة',          bg: '#FEF2F2', color: '#B91C1C', icon: '❌' },
  cancelled:   { label: 'ملغاة',          bg: '#FFF1F2', color: '#DC2626', icon: '🚫' },
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

async function fetchStats(): Promise<Stats> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const qs = (params: Record<string, string>) =>
    '/api/orders?' + new URLSearchParams(params).toString()

  // Fetch parallèle de toutes les données nécessaires
  const [allRes, newRes, pendingRes, inProgressRes, confirmedRes, shippingRes, deliveredRes, failedRes, cancelledRes,
         monthRes, todayRes, pubRes, draftRes, recentRes, revenueRes, usersRes] = await Promise.all([
    fetch('/api/orders?limit=0&depth=0').then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'new',         limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'pending',     limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'in_progress', limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'confirmed',   limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'shipping',    limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'delivered',   limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'failed',      limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[status][equals]': 'cancelled',   limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[createdAt][greater_than]': startOfMonth, 'where[status][not_equals]': 'cancelled', limit: '0', depth: '0' })).then(r => r.json()),
    fetch(qs({ 'where[createdAt][greater_than]': startOfDay, limit: '0', depth: '0' })).then(r => r.json()),
    fetch('/api/products?limit=0&depth=0&where[status][equals]=published').then(r => r.json()),
    fetch('/api/products?limit=0&depth=0&where[status][equals]=draft').then(r => r.json()),
    fetch('/api/orders?limit=12&sort=-createdAt&depth=1').then(r => r.json()),
    fetch('/api/orders?limit=500&depth=0&where[status][not_equals]=cancelled&where[createdAt][greater_than]=' + startOfMonth).then(r => r.json()),
    fetch('/api/users?limit=20&depth=0&where[role][equals]=confirmatrice').then(r => r.json()),
  ])

  const monthRevenue = (revenueRes.docs ?? []).reduce(
    (sum: number, o: { total?: number }) => sum + (o.total ?? 0), 0
  )

  const statusCounts: Record<string, number> = {
    new:         newRes.totalDocs         ?? 0,
    pending:     pendingRes.totalDocs     ?? 0,
    in_progress: inProgressRes.totalDocs  ?? 0,
    confirmed:   confirmedRes.totalDocs   ?? 0,
    shipping:    shippingRes.totalDocs    ?? 0,
    delivered:   deliveredRes.totalDocs   ?? 0,
    failed:      failedRes.totalDocs      ?? 0,
    cancelled:   cancelledRes.totalDocs   ?? 0,
  }

  // Stats par confirmatrice (à partir des commandes récentes chargées)
  const allConfirmatrices = (usersRes.docs ?? []) as Array<{
    id: string; firstName?: string; lastName?: string; email?: string
  }>

  const confirmatriceStats: ConfirmatriceStats[] = await Promise.all(
    allConfirmatrices.map(async (u) => {
      // Confirmées = confirmed + shipping + delivered (toute commande passée par la confirmation)
      const [totalRes, confirmedOnlyRes, shippingConfRes, deliveredConfRes, failedConfRes, cancelledConfRes] = await Promise.all([
        fetch(qs({ 'where[assignedTo][equals]': u.id, limit: '0', depth: '0' })).then(r => r.json()),
        fetch(qs({ 'where[assignedTo][equals]': u.id, 'where[status][equals]': 'confirmed', limit: '0', depth: '0' })).then(r => r.json()),
        fetch(qs({ 'where[assignedTo][equals]': u.id, 'where[status][equals]': 'shipping',  limit: '0', depth: '0' })).then(r => r.json()),
        fetch(qs({ 'where[assignedTo][equals]': u.id, 'where[status][equals]': 'delivered',  limit: '0', depth: '0' })).then(r => r.json()),
        fetch(qs({ 'where[assignedTo][equals]': u.id, 'where[status][equals]': 'failed',    limit: '0', depth: '0' })).then(r => r.json()),
        fetch(qs({ 'where[assignedTo][equals]': u.id, 'where[status][equals]': 'cancelled', limit: '0', depth: '0' })).then(r => r.json()),
      ])
      return {
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.id,
        total:     totalRes.totalDocs     ?? 0,
        confirmed: (confirmedOnlyRes.totalDocs ?? 0) + (shippingConfRes.totalDocs ?? 0) + (deliveredConfRes.totalDocs ?? 0),
        failed:    failedConfRes.totalDocs    ?? 0,
        cancelled: cancelledConfRes.totalDocs ?? 0,
      }
    })
  )

  // Top produits du mois (agrégation côté client)
  const productMap = new Map<string, TopProduct>()
  for (const order of (revenueRes.docs ?? [])) {
    for (const item of (order.items ?? [])) {
      const id = String(item.product ?? '')
      const name = item.productName ?? 'Inconnu'
      const existing = productMap.get(id) ?? { productId: id, productName: name, count: 0, revenue: 0 }
      productMap.set(id, {
        ...existing,
        count: existing.count + (item.quantity ?? 1),
        revenue: existing.revenue + ((item.unitPrice ?? 0) * (item.quantity ?? 1)),
      })
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    totalOrders:       allRes.totalDocs     ?? 0,
    newOrders:         newRes.totalDocs     ?? 0,
    monthOrders:       monthRes.totalDocs   ?? 0,
    todayOrders:       todayRes.totalDocs   ?? 0,
    publishedProducts: pubRes.totalDocs     ?? 0,
    draftProducts:     draftRes.totalDocs   ?? 0,
    monthRevenue,
    recentOrders:      (recentRes.docs ?? []) as RecentOrder[],
    statusCounts,
    confirmatriceStats,
    topProducts,
  }
}

// ── Composant principal ────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: '32px', maxWidth: '1300px' }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#1A1A1A' }}>
            Tableau de bord
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0' }}>{dateStr}</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg,#FFF7F0,#FFF0F7)',
          border: '1px solid #F3E0D8', borderRadius: '12px', padding: '10px 16px',
        }}>
          <img src="/branding/logo.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#CEA060' }}>She&apos;s Fit &amp; Beauty</span>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      {loading ? (
        <LoadingGrid count={4} />
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'CA du mois',        value: formatPrice(stats.monthRevenue), sub: `${stats.monthOrders} commandes`,     icon: '💰', color: '#16A34A', bg: '#F0FDF4' },
            { label: 'Commandes totales', value: String(stats.totalOrders),       sub: `${stats.todayOrders} aujourd'hui`,   icon: '📦', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Nouvelles',         value: String(stats.newOrders),         sub: 'à traiter',                          icon: '🆕', color: '#D97706', bg: '#FFF7E6' },
            { label: 'Produits publiés',  value: String(stats.publishedProducts), sub: `${stats.draftProducts} brouillons`,  icon: '👗', color: '#7C3AED', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.color}22`,
              borderRadius: '16px', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: '8px',
              boxShadow: `0 1px 8px ${s.color}10`,
            }}>
              <div style={{ fontSize: '28px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{s.label}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Statuts de commande — vue d'ensemble ────────────────────── */}
      <Section title="📊 État des commandes" href="/admin/collections/orders">
        {loading ? <LoadingGrid count={8} height={70} /> : stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <a
                key={key}
                href={`/admin/collections/orders?where[status][equals]=${key}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: meta.bg, border: `1px solid ${meta.color}33`,
                  borderRadius: '12px', padding: '14px 16px',
                  textDecoration: 'none', transition: 'transform 0.15s',
                }}
              >
                <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: meta.color }}>
                    {stats.statusCounts[key] ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>{meta.label}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Section>

      {/* ── Rendement confirmatrices ─────────────────────────────────── */}
      {!loading && stats && stats.confirmatriceStats.length > 0 && (
        <Section title="👩‍💼 Rendement confirmatrices" href="/admin/collections/orders">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
            {stats.confirmatriceStats.map((c) => {
              const rate = c.total > 0 ? Math.round((c.confirmed / c.total) * 100) : 0
              return (
                <div key={c.id} style={{
                  background: '#FAFAFA', border: '1px solid #E5E7EB',
                  borderRadius: '14px', padding: '18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#E93D91,#CEA060)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 800, fontSize: '14px', flexShrink: 0,
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#111827' }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#6B7280' }}>{c.total} commandes assignées</p>
                    </div>
                  </div>

                  {/* Barre de taux de confirmation */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>Taux de confirmation</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: rate >= 60 ? '#16A34A' : '#D97706' }}>
                        {rate}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${rate}%`,
                        background: rate >= 60 ? '#16A34A' : '#D97706',
                        borderRadius: '3px',
                        transition: 'width 0.6s',
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { label: 'Confirmées', count: c.confirmed, color: '#16A34A' },
                      { label: 'Échouées',   count: c.failed,    color: '#DC2626' },
                      { label: 'Annulées',   count: c.cancelled, color: '#9CA3AF' },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        flex: 1, textAlign: 'center', background: '#FFFFFF',
                        border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 4px',
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: stat.color }}>{stat.count}</div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Top produits du mois ─────────────────────────────────────── */}
      {!loading && stats && stats.topProducts.length > 0 && (
        <Section title="🏆 Top produits du mois" href="/admin/collections/products">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['#', 'Produit', 'Qté vendues', 'Revenu'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: '11px', fontWeight: 600, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid #E5E7EB',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.topProducts.map((p, i) => (
                <tr key={p.productId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', color: '#9CA3AF', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{p.productName}</td>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>{p.count}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#059669' }}>{formatPrice(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── Actions rapides ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px', marginBottom: '32px' }}>
        {[
          { href: '/admin/collections/products/create',                              label: '+ Nouveau produit',   emoji: '👗' },
          { href: '/admin/collections/orders?where[status][equals]=new',             label: 'Nouvelles cmd.',      emoji: '🆕' },
          { href: '/admin/collections/orders?where[status][equals]=pending',         label: 'En attente',          emoji: '⏳' },
          { href: '/admin/collections/orders?where[status][equals]=confirmed',       label: 'Confirmées',          emoji: '✅' },
          { href: '/admin/globals/delivery-settings',                                label: 'Livraison / Yalidine',emoji: '🚚' },
        ].map(a => (
          <a key={a.href} href={a.href} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 14px', background: '#FFFFFF',
            border: '1px solid #E5E7EB', borderRadius: '12px',
            textDecoration: 'none', color: '#374151',
            fontSize: '12px', fontWeight: 600,
          }}>
            <span style={{ fontSize: '18px' }}>{a.emoji}</span>
            <span>{a.label}</span>
          </a>
        ))}
      </div>

      {/* ── Dernières commandes ─────────────────────────────────────── */}
      <Section title="📋 Dernières commandes" href="/admin/collections/orders">
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>Chargement…</div>
        ) : !stats || stats.recentOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
            Aucune commande pour l&apos;instant.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['N°', 'Client', 'Wilaya', 'Livraison', 'Total', 'Statut', 'Confirmatrice', 'Date', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left',
                    fontSize: '10px', fontWeight: 600, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid #E5E7EB',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order, idx) => {
                const status = STATUS_META[order.status] ?? STATUS_META['new']
                const assignedName = order.assignedTo
                  ? [order.assignedTo.firstName, order.assignedTo.lastName].filter(Boolean).join(' ') || order.assignedTo.email || '—'
                  : '—'
                return (
                  <tr key={order.id} style={{
                    background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    borderBottom: '1px solid #F3F4F6',
                  }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#111827', fontSize: '12px' }}>{order.orderNumber}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#374151', fontSize: '12px' }}>{order.customerName}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{order.phone}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: '12px' }}>{order.wilaya}</td>
                    <td style={{ padding: '10px 12px', fontSize: '18px' }}>
                      {order.deliveryMode === 'desk' ? '🏢' : '🏠'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669', fontSize: '12px' }}>{formatPrice(order.total)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 8px', borderRadius: '20px',
                        fontSize: '10px', fontWeight: 600,
                        background: status.bg, color: status.color,
                        whiteSpace: 'nowrap',
                      }}>{status.icon} {status.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: '11px', color: '#6B7280' }}>{assignedName}</td>
                    <td style={{ padding: '10px 12px', color: '#9CA3AF', fontSize: '11px' }}>{formatDate(order.createdAt)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <a href={`/admin/collections/orders/${order.id}`} style={{
                        padding: '4px 10px', background: '#E93D91', color: '#fff',
                        borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none',
                      }}>Voir</a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Section>

      <div style={{ marginTop: '24px', textAlign: 'center', color: '#D1D5DB', fontSize: '11px' }}>
        She&apos;s Fit &amp; Beauty — Panneau d&apos;administration
      </div>
    </div>
  )
}

// ── Composants utilitaires ────────────────────────────────────────────────────

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E5E7EB',
      borderRadius: '16px', overflow: 'hidden', marginBottom: '24px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 22px', borderBottom: '1px solid #F3F4F6',
      }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>{title}</h2>
        {href && (
          <a href={href} style={{ fontSize: '12px', color: '#E93D91', textDecoration: 'none', fontWeight: 600 }}>
            Voir tout →
          </a>
        )}
      </div>
      <div style={{ padding: '16px 22px' }}>{children}</div>
    </div>
  )
}

function LoadingGrid({ count, height = 110 }: { count: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 4)},1fr)`, gap: '16px', marginBottom: '32px' }}>
      {[...Array(count)].map((_, i) => (
        <div key={i} style={{ height, background: '#F3F4F6', borderRadius: '12px' }} />
      ))}
    </div>
  )
}
