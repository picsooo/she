'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
}

interface MobileBottomNavProps {
  items: NavItem[]
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="admin-bottom-nav" role="navigation" aria-label="Navigation mobile">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              {item.icon}
              {item.badge != null && item.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: '#E93D91', color: '#fff',
                  fontSize: 9, fontWeight: 700, borderRadius: 20,
                  padding: '1px 4px', minWidth: 14, textAlign: 'center',
                  lineHeight: '14px',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
