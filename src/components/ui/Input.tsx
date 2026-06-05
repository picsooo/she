'use client'

import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

// Champ texte RTL — label en arabe, validation en arabe
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-[#E93D91] ms-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-xl border border-[#EBE6DF] bg-white px-4 py-3 text-foreground',
          'placeholder:text-foreground/40',
          'focus:border-[#E93D91] focus:outline-none focus:ring-2 focus:ring-[#E93D91]/20',
          'transition-colors',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-foreground/50">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
