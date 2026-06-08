'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, { label: string; emoji: string; desc: string }> = {
  '/boutique-admin/dashboard':  { label: 'Tableau de bord', emoji: '📊', desc: 'Vue d\'ensemble de votre boutique' },
  '/boutique-admin/orders':     { label: 'Commandes',       emoji: '📦', desc: 'Gérer et suivre les commandes' },
  '/boutique-admin/products':   { label: 'Produits',        emoji: '👗', desc: 'Catalogue et gestion des articles' },
  '/boutique-admin/categories': { label: 'Catégories',      emoji: '🗂️', desc: 'Organiser les collections' },
  '/boutique-admin/settings':   { label: 'Paramètres',      emoji: '⚙️', desc: 'Pixels marketing et configuration' },
}

interface TopBarProps { userEmail?: string }

export function TopBar({ userEmail }: TopBarProps) {
  const path = usePathname() ?? ''
  const page = Object.entries(TITLES).find(([k]) => path.startsWith(k))?.[1]
  const [hovered, setHovered] = useState(false)

  const initials = userEmail
    ? userEmail.split('@')[0].slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <header style={{
      height: 64,
      background: 'rgba(8,8,16,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px',
      gap: 20,
      position: 'sticky', top: 0, zIndex: 30,
      boxShadow: '0 1px 0 rgba(233,61,145,0.08), 0 4px 24px rgba(0,0,0,0.2)',
    }}>

      {/* Title zone */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
        {page && (
          <>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(233,61,145,0.2), rgba(206,160,96,0.15))',
              border: '1px solid rgba(233,61,145,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{page.emoji}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{page.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{page.desc}</div>
            </div>
          </>
        )}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)' }} />

      {/* Nouveau produit */}
      <Link
        href="/boutique-admin/products/new"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: hovered
            ? 'linear-gradient(135deg, #F04DA0, #D42A87)'
            : 'linear-gradient(135deg, #E93D91, #C4197A)',
          color: '#fff', padding: '8px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
          boxShadow: hovered
            ? '0 4px 20px rgba(233,61,145,0.5), 0 0 0 1px rgba(233,61,145,0.3)'
            : '0 2px 12px rgba(233,61,145,0.35)',
          transition: 'all 0.2s ease',
          position: 'relative', overflow: 'hidden',
          letterSpacing: '0.01em',
        }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
        <span>Nouveau produit</span>
      </Link>

      {/* View store */}
      <Link href="/" target="_blank" style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500,
        textDecoration: 'none', transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 13 }}>🌐</span>
        <span>Boutique</span>
      </Link>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 12px 6px 6px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 50,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #E93D91, #CEA060)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 800,
            boxShadow: '0 0 0 2px rgba(233,61,145,0.3)',
            letterSpacing: '0.05em',
          }}>{initials}</div>
          <div style={{ maxWidth: 130 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail?.split('@')[0] ?? 'Admin'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Administrateur</div>
          </div>
        </div>

        {/* Bouton déconnexion */}
        <button
          onClick={async () => {
            await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
            window.location.href = '/boutique-admin'
          }}
          title="Déconnexion"
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.2)',
            color: '#F87171', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.18)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.2)'
          }}
        >
          ⎋
        </button>
      </div>
    </header>
  )
}
