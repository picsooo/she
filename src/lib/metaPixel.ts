// lib/metaPixel.ts
// Helpers CLIENT (navigateur uniquement) pour le Meta Pixel.

/**
 * Génère un event_id UUID — partagé entre Pixel navigateur et CAPI serveur.
 * Indispensable pour la déduplication côté Meta (même event_id des deux côtés).
 */
export function genEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Lit les cookies _fbp / _fbc posés par le pixel Meta.
 * À capturer au checkout et stocker sur la commande pour améliorer le matching CAPI.
 */
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === 'undefined') return {}
  const read = (name: string): string | undefined => {
    const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'))
    return m ? decodeURIComponent(m[2]) : undefined
  }
  return { fbp: read('_fbp'), fbc: read('_fbc') }
}
