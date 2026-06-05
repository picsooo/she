import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'promo' | 'new' | 'outofstock' | 'instock'
  className?: string
}

// Badge produit — promo en rose, nouveau en or
export function Badge({ children, variant = 'promo', className }: BadgeProps) {
  const variants = {
    promo: 'bg-[#E93D91] text-white',
    new: 'bg-[#CEA060] text-white',
    outofstock: 'bg-gray-200 text-gray-500',
    instock: 'bg-green-100 text-green-700',
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-bold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
