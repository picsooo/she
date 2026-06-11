'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useGalleryContext } from './ProductGalleryAndSelector'

interface GalleryImage {
  url: string
  alt?: string
  thumbnail?: string
}

interface ProductGalleryProps {
  images: GalleryImage[]
  productName: string
  // Index contrôlé depuis l'extérieur (ex: changement de couleur)
  controlledIndex?: number
  onIndexChange?: (idx: number) => void
}

// Galerie photos produit — image principale + thumbnails
// Si un ProductGalleryProvider est présent dans l'arbre, l'index actif est contrôlé par lui.
export function ProductGallery({ images, productName, controlledIndex, onIndexChange }: ProductGalleryProps) {
  const ctx = useGalleryContext()
  const [internalIndex, setInternalIndex] = useState(0)
  // Priorité : contexte > prop controlledIndex > état interne
  const activeIndex = ctx?.activeIndex ?? controlledIndex ?? internalIndex
  const setActiveIndex = (idx: number) => {
    setInternalIndex(idx)
    ctx?.setActiveIndex(idx)
    onIndexChange?.(idx)
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-[#F7F5F2]">
        <span className="text-foreground/20 text-sm">لا توجد صورة</span>
      </div>
    )
  }

  const activeImage = images[activeIndex]

  return (
    <div className="flex flex-col gap-3">
      {/* Image principale */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#F7F5F2]">
        <Image
          src={activeImage.url}
          alt={activeImage.alt ?? productName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {/* Thumbnails (si plusieurs images) */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl transition-all',
                idx === activeIndex
                  ? 'ring-2 ring-[#E93D91] ring-offset-1'
                  : 'ring-1 ring-[#EBE6DF] opacity-60 hover:opacity-100'
              )}
            >
              <Image
                src={img.thumbnail ?? img.url}
                alt={`${productName} ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
