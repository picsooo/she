'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/boutique-admin/dashboard',  icon: '◈', label: 'Tableau de bord', emoji: '📊' },
  { href: '/boutique-admin/orders',     icon: '◈', label: 'Commandes',        emoji: '📦', badge: true },
  { href: '/boutique-admin/products',   icon: '◈', label: 'Produits',          emoji: '👗' },
  { href: '/boutique-admin/categories', icon: '◈', label: 'Catégories',        emoji: '🗂️' },
  { href: '/boutique-admin/settings',   icon: '◈', label: 'Paramètres',        emoji: '⚙️' },
]

interface SidebarProps { newOrdersCount?: number }

export function Sidebar({ newOrdersCount = 0 }: SidebarProps) {
  const path = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside style={{
      width: collapsed ? 72 : 256,
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #080810 0%, #0F0720 50%, #080810 100%)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0,
      position: 'sticky', top: 0, height: '100vh',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      zIndex: 50,
    }}>

      {/* Logo Zone */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: collapsed ? '20px 0' : '24px 20px',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 12, cursor: 'pointer',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          minHeight: 80,
          position: 'relative', overflow: 'hidden',
        }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 50%, rgba(233,61,145,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src="/branding/logo.png" alt="" style={{
            width: collapsed ? 36 : 44, height: collapsed ? 36 : 44,
            borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(233,61,145,0.5)',
            boxShadow: '0 0 16px rgba(233,61,145,0.4)',
            transition: 'all 0.3s ease',
            display: 'block',
          }} />
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: '50%',
            background: '#22C55E',
            border: '2px solid #080810',
          }} />
        </div>

        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              color: '#CEA060', fontWeight: 800, fontSize: 15,
              letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #CEA060, #F5D08A, #CEA060)',
              backgroundSize: '200%',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
            }}>SHE'S</div>
            <div style={{ color: 'rgba(233,61,145,0.8)', fontSize: 9, fontWeight: 600, letterSpacing: '0.14em' }}>
              FIT & BEAUTY
            </div>
          </div>
        )}

        {!collapsed && (
          <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>‹</div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {!collapsed && (
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.14em', textTransform: 'uppercase', padding: '4px 10px 8px' }}>
            NAVIGATION
          </div>
        )}

        {NAV.map(item => {
          const active = path?.startsWith(item.href)
          const count = item.badge ? newOrdersCount : 0

          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 12,
              padding: collapsed ? '12px 0' : '10px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 12,
              textDecoration: 'none',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.2s ease',
              background: active
                ? 'linear-gradient(135deg, rgba(233,61,145,0.2), rgba(196,25,122,0.1))'
                : 'transparent',
              border: active
                ? '1px solid rgba(233,61,145,0.25)'
                : '1px solid transparent',
              boxShadow: active ? '0 4px 12px rgba(233,61,145,0.15)' : 'none',
            }}>
              {/* Active glow left bar */}
              {active && (
                <div style={{
                  position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: '0 3px 3px 0',
                  background: 'linear-gradient(180deg, #E93D91, #C4197A)',
                  boxShadow: '0 0 8px #E93D91',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                background: active
                  ? 'linear-gradient(135deg, rgba(233,61,145,0.3), rgba(196,25,122,0.2))'
                  : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(233,61,145,0.3)' : '1px solid rgba(255,255,255,0.06)',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 2px 8px rgba(233,61,145,0.2)' : 'none',
              }}>
                {item.emoji}
              </div>

              {!collapsed && (
                <>
                  <span style={{
                    fontSize: 13.5, fontWeight: active ? 600 : 400,
                    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                    flex: 1, transition: 'color 0.2s',
                  }}>
                    {item.label}
                  </span>
                  {count > 0 && (
                    <span style={{
                      background: 'linear-gradient(135deg, #E93D91, #C4197A)',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      borderRadius: 20, padding: '2px 7px', minWidth: 20, textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(233,61,145,0.4)',
                      animation: 'glow 2s ease infinite',
                    }}>{count}</span>
                  )}
                </>
              )}

              {collapsed && count > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  background: '#E93D91', color: '#fff',
                  fontSize: 9, fontWeight: 800, borderRadius: '50%',
                  width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{count}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <Link href="/" target="_blank" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 10,
            textDecoration: 'none', border: '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Voir la boutique</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
