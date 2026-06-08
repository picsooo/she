'use client'

import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  placeholder?: string
  options: { value: string; label: string }[]
}

// Select RTL avec flèche inversée
export function Select({ label, error, placeholder, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? `select-${Math.random().toString(36).slice(2)}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
          {props.required && <span className="text-[#E93D91] ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full appearance-none rounded-xl border border-[#EBE6DF] bg-white px-4 py-3',
            'text-foreground pe-10',
            'focus:border-[#E93D91] focus:outline-none focus:ring-2 focus:ring-[#E93D91]/20',
            'transition-colors cursor-pointer',
            error && 'border-red-400',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt, i) => (
            <option key={`${opt.value}-${i}`} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Flèche en position fin (gauche en RTL) */}
        <div className="pointer-events-none absolute inset-y-0 end-3 flex items-center">
          <svg className="h-4 w-4 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
