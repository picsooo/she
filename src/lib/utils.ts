import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utilitaire shadcn/ui — fusion des classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Génère un slug URL depuis un texte (arabe ou latin)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\u00a0]+/g, '-')  // espaces (y compris insécables) → tiret
    .replace(/[^\w\-\u0600-\u06FF]/g, '') // garder lettres arabes et alphanum
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
}

// Génère un numéro de commande au format SHE-YYYY-NNNN
export function generateOrderNumber(sequence: number): string {
  const year = new Date().getFullYear()
  const padded = String(sequence).padStart(4, '0')
  return `SHE-${year}-${padded}`
}

// Valide un numéro de téléphone algérien (05/06/07 + 8 chiffres)
export function isValidAlgerianPhone(phone: string): boolean {
  return /^0[567]\d{8}$/.test(phone.replace(/\s/g, ''))
}

// Calcule le prix effectif d'une variation (promo ou régulier)
export function getEffectivePrice(regularPrice: number, salePrice?: number | null): number {
  if (salePrice && salePrice > 0 && salePrice < regularPrice) {
    return salePrice
  }
  return regularPrice
}

// Vérifie si une variation est en promo
export function isOnSale(regularPrice: number, salePrice?: number | null): boolean {
  return !!(salePrice && salePrice > 0 && salePrice < regularPrice)
}

// Tronque un texte à N caractères en respectant les mots
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

// Convertit une URL de média Payload en chemin public direct
// Payload stocke : http://localhost:3000/api/media/file/IMG.webp
// Les fichiers sont dans public/media/ → servis par Next.js à /media/IMG.webp
export function toRelativeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Cas absolu : http://localhost:3000/api/media/file/X
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname
    const match = pathname.match(/^\/api\/media\/file\/(.+)$/)
    if (match) return `/media/${match[1]}`
    return pathname
  } catch {
    // Cas relatif : /api/media/file/X
    if (url.startsWith('/api/media/file/')) {
      return `/media/${url.slice('/api/media/file/'.length)}`
    }
    return url
  }
}
