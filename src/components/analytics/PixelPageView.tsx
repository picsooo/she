'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/tracking'

/**
 * Client Component — déclenche PageView à chaque navigation App Router.
 * Placé dans le layout, il s'exécute sur chaque changement de route.
 * Ne rend rien (null) — uniquement des effets de bord.
 */
export function PixelPageView() {
  const pathname = usePathname()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Le premier PageView est déjà déclenché par les scripts d'initialisation
    // (fbq('track', 'PageView') et ttq.page() dans PixelScripts)
    // On ne tire que pour les navigations client-side suivantes
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    trackPageView()
  }, [pathname])

  return null
}
