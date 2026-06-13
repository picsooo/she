'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ConfirmatriceUserContext, ConfUser } from './ConfirmatriceUserContext'
import '@/styles/boutique-admin.css'

// ── Icônes ─────────────────────────────────────────────────────────────────────
const IconOrders = (
  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
    <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconStock = (
  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
    <path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M10 2v14M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)

const IconLogout = (
  <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
    <path d="M8 17H5a2 2 0 01-2-2V5a2 2 0 012-2h3M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconLogoutSmall = (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function ConfirmatriceLayout({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<ConfUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loginEmail,  setLoginEmail]  = useState('')
  const [loginPass,   setLoginPass]   = useState('')
  const [loginError,  setLoginError]  = useState('')
  const [loginLoading,setLoginLoading]= useState(false)
  const pathname = usePathname()
  const router   = useRouter()

  // Vérifie le token stocké au montage
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('conf-token')
      if (!token) { setAuthChecked(true); return }

      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) { localStorage.removeItem('conf-token'); setAuthChecked(true); return }

      const data = await res.json()
      const u = data.user ?? null
      if (u && ['confirmatrice', 'admin'].includes(u.role ?? '')) {
        setUser({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role })
      } else {
        localStorage.removeItem('conf-token')
      }
    } catch {
      localStorage.removeItem('conf-token')
    } finally {
      setAuthChecked(true)
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  // Soumission du formulaire de connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) {
        setLoginError('Email ou mot de passe incorrect')
        return
      }
      const u = data.user
      if (!u || !['confirmatrice', 'admin'].includes(u.role ?? '')) {
        setLoginError('Accès non autorisé pour ce compte')
        return
      }
      localStorage.setItem('conf-token', data.token)
      setUser({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role })
      router.push('/confirmatrice/orders')
    } catch {
      setLoginError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST' }) } catch { /* ignore */ }
    localStorage.removeItem('conf-token')
    window.location.href = '/boutique-admin'
  }

  // ── Écran de chargement ────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <html lang="fr" dir="ltr" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body suppressHydrationWarning>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E3E5E7', borderTopColor: '#E93D91', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </body>
      </html>
    )
  }

  // ── Formulaire de connexion ────────────────────────────────────────────
  if (!user) {
    return (
      <html lang="fr" dir="ltr" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body suppressHydrationWarning style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FFF0F7 0%, #F9FAFB 50%, #F0F5FF 100%)', padding: '20px 16px' }}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 36px', width: '100%', maxWidth: 380 }}>

              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <img src="/branding/logo.png" alt="She's Fit & Beauty" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E93D91', marginBottom: 12 }} />
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>She&apos;s Fit &amp; Beauty</div>
                <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 4 }}>Espace Confirmatrice</div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6D7175', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                    className="admin-input"
                    style={{ width: '100%', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6D7175', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="admin-input"
                    style={{ width: '100%', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                {loginError && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
                    ✕ {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  style={{
                    marginTop: 4, padding: '12px', borderRadius: 10, border: 'none',
                    background: loginLoading ? '#9A9A9A' : 'linear-gradient(135deg, #E93D91, #D32D80)',
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: loginLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {loginLoading && (
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  )}
                  {loginLoading ? 'Connexion…' : 'Se connecter'}
                </button>
              </form>
            </div>
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg) } }
            * { box-sizing: border-box; }
          `}</style>
        </body>
      </html>
    )
  }

  // ── Interface authentifiée ─────────────────────────────────────────────
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email.split('@')[0]

  const isOrdersActive = pathname?.startsWith('/confirmatrice/orders')
  const isStockActive  = pathname?.startsWith('/confirmatrice/stock')

  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

          {/* ── Sidebar (desktop uniquement) ───────────────────────────────── */}
          <aside className="admin-sidebar" style={{
            width: 220, minHeight: '100vh', flexShrink: 0,
            background: '#fff', borderRight: '1px solid #E3E5E7',
            display: 'flex', flexDirection: 'column',
            position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
          }}>
            {/* Logo */}
            <div style={{ padding: '16px 14px', borderBottom: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/branding/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E93D91' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>She&apos;s Fit &amp; Beauty</div>
                <div style={{ fontSize: 11, color: '#8A8A8A' }}>Confirmatrice</div>
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 8px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#B0B0B0', letterSpacing: '0.08em', padding: '8px 8px 6px', textTransform: 'uppercase' }}>
                ESPACE CONFIRMATRICE
              </div>
              <Link href="/confirmatrice/orders" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                color: isOrdersActive ? '#E93D91' : '#3D3D3D',
                background: isOrdersActive ? '#FEF0F7' : 'transparent',
                fontSize: 14, fontWeight: isOrdersActive ? 700 : 500,
                transition: 'background 0.15s',
                border: isOrdersActive ? '1px solid rgba(233,61,145,0.15)' : '1px solid transparent',
                marginBottom: 2,
              }}>
                <span style={{ color: isOrdersActive ? '#E93D91' : '#666', flexShrink: 0, display: 'flex' }}>{IconOrders}</span>
                <span>📋 Commandes</span>
              </Link>
              <Link href="/confirmatrice/stock" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, textDecoration: 'none',
                color: isStockActive ? '#E93D91' : '#3D3D3D',
                background: isStockActive ? '#FEF0F7' : 'transparent',
                fontSize: 14, fontWeight: isStockActive ? 700 : 500,
                transition: 'background 0.15s',
                border: isStockActive ? '1px solid rgba(233,61,145,0.15)' : '1px solid transparent',
              }}>
                <span style={{ color: isStockActive ? '#E93D91' : '#666', flexShrink: 0, display: 'flex' }}>{IconStock}</span>
                <span>📦 Gestion stock</span>
              </Link>
            </nav>

            {/* Footer : user + déconnexion */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid #F1F1F1', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #E93D91, #CEA060)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                {displayName[0]?.toUpperCase() ?? 'C'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 11, color: '#8A8A8A' }}>Confirmatrice</div>
              </div>
              <button
                onClick={handleLogout}
                title="Déconnexion"
                style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9A9A9A', cursor: 'pointer', border: '1px solid #E8E8E8', background: 'transparent', flexShrink: 0 }}
              >
                {IconLogoutSmall}
              </button>
            </div>
          </aside>

          {/* ── Zone contenu ─────────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

            {/* ── Top bar mobile (logo + nom + déconnexion) ── */}
            <header className="conf-mobile-topbar" style={{ display: 'none', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#1A1A1A', borderBottom: '1px solid #2D2D2D', position: 'sticky', top: 0, zIndex: 40, flexShrink: 0 }}>
              <img src="/branding/logo.png" alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E93D91' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: 10, color: '#9A9A9A' }}>Confirmatrice</div>
              </div>
              <button
                onClick={handleLogout}
                style={{ padding: '6px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {IconLogoutSmall} Déco
              </button>
            </header>

            <main className="admin-main" style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', background: '#F9FAFB' }}>
              <ConfirmatriceUserContext.Provider value={user}>
                {children}
              </ConfirmatriceUserContext.Provider>
            </main>
          </div>
        </div>

        {/* ── Bottom nav mobile ────────────────────────────────────────────── */}
        <nav className="admin-bottom-nav" role="navigation" aria-label="Navigation mobile">
          <Link href="/confirmatrice/orders" className={`admin-bottom-nav-item${isOrdersActive ? ' active' : ''}`}>
            {IconOrders}
            <span>Commandes</span>
          </Link>
          <Link href="/confirmatrice/stock" className={`admin-bottom-nav-item${isStockActive ? ' active' : ''}`}>
            {IconStock}
            <span>Stock</span>
          </Link>
          <button className="admin-bottom-nav-item" onClick={handleLogout}>
            {IconLogout}
            <span>Déconnexion</span>
          </button>
        </nav>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
          @media (max-width: 768px) {
            .conf-mobile-topbar { display: flex !important; }
          }
        `}</style>
      </body>
    </html>
  )
}
