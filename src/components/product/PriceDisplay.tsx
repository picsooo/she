import { cn } from '@/lib/utils'
import { formatPrice, t } from '@/lib/translations'

interface PriceDisplayProps {
  regularPrice: number
  salePrice?: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Affichage du prix — barré si promo, rose pour le prix promo
export function PriceDisplay({ regularPrice, salePrice, size = 'md', className }: PriceDisplayProps) {
  const isOnSale = !!(salePrice && salePrice > 0 && salePrice < regularPrice)

  const sizes = {
    sm: { current: 'text-base font-bold', original: 'text-xs' },
    md: { current: 'text-xl font-bold', original: 'text-sm' },
    lg: { current: 'text-2xl font-bold', original: 'text-base' },
  }

  return (
    <div className={cn('flex flex-wrap items-baseline gap-2', className)}>
      {isOnSale ? (
        <>
          <span className="text-[#E93D91]" style={{ fontSize: sizes[size].current.split(' ')[0].replace('text-', '') }}>
            <span className={sizes[size].current + ' text-[#E93D91]'}>
              {formatPrice(salePrice!)}
            </span>
          </span>
          <span className={cn(sizes[size].original, 'text-foreground/40 line-through')}>
            {formatPrice(regularPrice)}
          </span>
        </>
      ) : (
        <span className={cn(sizes[size].current, 'text-foreground')}>
          {formatPrice(regularPrice)}
        </span>
      )}
    </div>
  )
}
