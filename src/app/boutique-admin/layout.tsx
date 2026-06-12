import React from 'react'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { LoginPage } from '@/components/boutique-admin/LoginPage'
import { LogoutButton } from '@/components/boutique-admin/LogoutButton'
import '@/styles/boutique-admin.css'

export const metadata = { title: "She's Admin" }

interface SessionUser {
  id: string
  email: string
  role?: string
  firstName?: string
  lastName?: string
}

// Récupère l'utilisateur connecté via le cookie payload-token
async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value
    if (!token) return null
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/users/me`,
      { headers: { Authorization: `JWT ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.user ?? null
  } catch { return null }
}

// Nombre de commandes "nouvelles" — filtré automatiquement par le rôle JWT
async function getNewOrdersCount(token: string): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/orders?limit=0&depth=0&where[status][equals]=new`,
      { headers: { Authorization: `JWT ${token}` }, cache: 'no-store' }
    )
    const data = await res.json()
    return data.totalDocs ?? 0
  } catch { return 0 }
}

// ── Icônes SVG ─────────────────────────────────────────────────────────────────
const Icons = {
  home:       <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 2L2 8v10h5v-5h6v5h5V8L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  orders:     <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  products:   <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 2v14M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/></svg>,
  categories: <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  settings:   <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  store:      <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M2 7h16M2 7l2-4h12l2 4M2 7v10h16V7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  logout:     <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  bell:       <svg width="18" height="18" fill="none" viewBox="0 0 20 20"><path d="M10 2a6 6 0 016 6v3l1.5 2.5H2.5L4 11V8a6 6 0 016-6zM8 16a2 2 0 004 0" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  analytics:  <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="3" y="10" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8.5" y="6" width="3" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="2" width="3" height="16" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  primes:     <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M10 6v1.5M10 12.5V14M7.5 8.5C7.5 7.4 8.6 6.5 10 6.5s2.5.9 2.5 2c0 2.5-5 2.5-5 5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  assign:     <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="14" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 17c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 12l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({
  newOrdersCount,
  user,
}: {
  newOrdersCount: number
  user: SessionUser
}) {
  const isConfirmatrice = user.role === 'confirmatrice'
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email?.split('@')[0] ?? 'Admin'

  const roleLabel = isConfirmatrice
    ? `Confirmatrice`
    : user.role === 'admin' ? 'Administrateur' : 'Éditeur'

  // Nav complète pour admin/éditeur, réduite pour confirmatrice
  const NAV_ADMIN = [
    { href: '/boutique-admin/dashboard',       label: 'Accueil',        icon: Icons.home },
    { href: '/boutique-admin/orders',          label: 'Commandes',      icon: Icons.orders,    badge: newOrdersCount },
    { href: '/boutique-admin/assignation',     label: 'Assignation',    icon: Icons.assign },
    { href: '/boutique-admin/orders/analytics',label: 'Analytics',      icon: Icons.analytics },
    { href: '/boutique-admin/products',        label: 'Produits',       icon: Icons.products },
    { href: '/boutique-admin/stock',           label: 'Gestion stock',  icon: Icons.products },
    { href: '/boutique-admin/categories',      label: 'Catégories',     icon: Icons.categories },
    { href: '/boutique-admin/primes',          label: 'Primes',         icon: Icons.primes },
    { href: '/boutique-admin/settings',        label: 'Paramètres',     icon: Icons.settings },
  ]

  const NAV_CONFIRMATRICE = [
    { href: '/boutique-admin/orders', label: 'Mes commandes', icon: Icons.orders, badge: newOrdersCount },
  ]

  const nav = isConfirmatrice ? NAV_CONFIRMATRICE : NAV_ADMIN

  return (
    <aside style={{
      width: 240, minHeight: '100vh', flexShrink: 0,
      background: '#fff', borderRight: '1px solid #E3E5E7',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 14px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/branding/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E93D91' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>She&apos;s Fit &amp; Beauty</div>
          <div style={{ fontSize: 11, color: '#8A8A8A' }}>boutique-she.com</div>
        </div>
      </div>

      {/* Badge rôle confirmatrice */}
      {isConfirmatrice && (
        <div style={{ margin: '10px 12px 0', padding: '8px 12px', background: 'linear-gradient(135deg, #FEF3F8, #FFF0F7)', border: '1px solid rgba(233,61,145,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
            {displayName[0]?.toUpperCase() ?? 'C'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{displayName}</div>
            <div style={{ fontSize: 10, color: '#E93D91', fontWeight: 600 }}>{roleLabel}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#B0B0B0', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>
          {isConfirmatrice ? 'MES COMMANDES' : 'BOUTIQUE'}
        </div>
        {nav.map(item => (
          <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} badge={item.badge} />
        ))}

        {!isConfirmatrice && (
          <>
            <div style={{ margin: '8px 0', height: 1, background: '#F1F1F1' }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: '#B0B0B0', letterSpacing: '0.08em', padding: '8px 8px 4px', textTransform: 'uppercase' }}>CANAUX DE VENTE</div>
            <NavItem href="/" icon={Icons.store} label="Boutique en ligne" external />
          </>
        )}
      </nav>

      {/* Footer : user + déconnexion */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
          {displayName[0]?.toUpperCase() ?? 'A'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </div>
          <div style={{ fontSize: 11, color: '#8A8A8A' }}>{roleLabel}</div>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  )
}

function NavItem({ href, icon, label, badge, external }: { href: string; icon: React.ReactNode; label: string; badge?: number; external?: boolean }) {
  return (
    <Link href={href} target={external ? '_blank' : undefined} className="admin-nav-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#3D3D3D', fontSize: 14, fontWeight: 500, transition: 'background 0.15s', marginBottom: 2 }}>
      <span style={{ color: '#666', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{ background: '#E93D91', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
          {badge}
        </span>
      )}
      {external && <span style={{ fontSize: 12, color: '#B0B0B0' }}>↗</span>}
    </Link>
  )
}

// ── Top Bar ────────────────────────────────────────────────────────────────────
function TopBar({ user }: { user: SessionUser }) {
  const displayName = user.firstName ?? user.email?.split('@')[0] ?? 'Admin'

  return (
    <header style={{ height: 56, background: '#1A1A1A', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, position: 'sticky', top: 0, zIndex: 40, flexShrink: 0 }}>
      <div style={{ flex: 1, maxWidth: 480, margin: '0 auto', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, height: 34, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 20 20" style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1 }}>Rechercher…</span>
        <kbd style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 5px', fontFamily: 'monospace' }}>Ctrl K</kbd>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user.role !== 'confirmatrice' && (
          <Link href="/" target="_blank" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icons.store}<span>Boutique</span>
          </Link>
        )}
        <button style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icons.bell}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px 4px 6px' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
            {displayName[0]?.toUpperCase() ?? 'A'}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {/* Bouton déconnexion visible */}
          <LogoutButton variant="topbar" />
        </div>
      </div>
    </header>
  )
}

// ── Layout principal ───────────────────────────────────────────────────────────
export default async function BoutiqueAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  // Non connecté → page de login
  if (!user) {
    return (
      <html lang="fr" dir="ltr" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body suppressHydrationWarning>
          <LoginPage />
        </body>
      </html>
    )
  }

  // Récupère le token pour compter les nouvelles commandes
  const cookieStore = await cookies()
  const token = cookieStore.get('payload-token')?.value ?? ''
  const newOrdersCount = await getNewOrdersCount(token)

  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <TopBar user={user} />
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
          <Sidebar newOrdersCount={newOrdersCount} user={user} />
          <main style={{ flex: 1, minWidth: 0, padding: '24px 28px', overflowY: 'auto', animation: 'fadeIn 0.25s ease' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
