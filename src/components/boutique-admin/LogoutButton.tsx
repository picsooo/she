'use client'

import { useRouter } from 'next/navigation'

const IconLogout = (
  <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
    <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Bouton déconnexion — efface le cookie Payload via fetch puis redirige vers /boutique-admin
export function LogoutButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' }) {
  const router = useRouter()

  const handleLogout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST' }) } catch { /* ignore */ }
    router.push('/boutique-admin')
    router.refresh()
  }

  if (variant === 'topbar') {
    return (
      <button
        onClick={handleLogout}
        title="Se déconnecter"
        style={{
          background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
          color: '#FCA5A5', borderRadius: 6, padding: '4px 8px',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'all 0.15s',
        }}
      >
        {IconLogout}
        <span>Déco</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      title="Déconnexion"
      style={{
        width: 28, height: 28, borderRadius: 6, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#9A9A9A', cursor: 'pointer',
        border: '1px solid #E8E8E8', background: 'transparent', flexShrink: 0,
      }}
    >
      {IconLogout}
    </button>
  )
}
