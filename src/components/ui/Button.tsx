'use client'

import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

// Bouton réutilisable — rose pour les CTA d'achat, or pour les accents
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

  const variants = {
    primary: 'bg-[#E93D91] text-white hover:bg-[#D32D80] active:scale-[0.98]',
    outline: 'border-2 border-[#E93D91] text-[#E93D91] hover:bg-[#E93D91] hover:text-white',
    ghost: 'text-foreground hover:bg-[#F7F5F2]',
    accent: 'bg-[#CEA060] text-white hover:bg-[#9F6F3B]',
  }

  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
