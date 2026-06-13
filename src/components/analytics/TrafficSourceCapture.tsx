'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Capture la source de trafic à chaque page et la stocke en sessionStorage.
 * Logique "first-touch" : on ne remplace pas si déjà capturé dans cette session.
 *
 * Sources détectées (priorité dans l'ordre) :
 *  1. fbclid dans l'URL      → 'facebook'
 *  2. ttclid dans l'URL      → 'tiktok'
 *  3. utm_source             → mapped (facebook/instagram/tiktok/google/email/sms…)
 *  4. document.referrer      → facebook / instagram / tiktok / google
 *  5. Rien                   → 'direct'
 */
export function TrafficSourceCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // First-touch : ne pas écraser une source déjà capturée dans cette session
    if (sessionStorage.getItem('_traffic_source')) return

    const source = detectSource(searchParams)
    sessionStorage.setItem('_traffic_source', source)
  }, [searchParams])

  return null
}

function detectSource(params: ReturnType<typeof useSearchParams>): string {
  // 1. Click ID publicitaires (les plus fiables — injectés par la plateforme)
  if (params.get('fbclid')) return 'facebook'
  if (params.get('ttclid')) return 'tiktok'
  if (params.get('gclid'))  return 'google'

  // 2. UTM source
  const utmSource = (params.get('utm_source') ?? '').toLowerCase()
  if (utmSource) {
    if (utmSource.includes('facebook') || utmSource.includes('fb'))        return 'facebook'
    if (utmSource.includes('instagram') || utmSource.includes('ig'))       return 'instagram'
    if (utmSource.includes('tiktok') || utmSource.includes('tt'))          return 'tiktok'
    if (utmSource.includes('google') || utmSource.includes('gg'))          return 'google'
    if (utmSource.includes('email') || utmSource.includes('newsletter'))   return 'email'
    if (utmSource.includes('sms') || utmSource.includes('whatsapp'))       return 'sms'
    return utmSource // garder la valeur brute si aucun match
  }

  // 3. Referrer (trafic organique ou navigation directe depuis une appli sociale)
  if (typeof document !== 'undefined' && document.referrer) {
    const ref = document.referrer.toLowerCase()
    if (ref.includes('facebook.com') || ref.includes('fb.com') || ref.includes('l.facebook')) return 'facebook'
    if (ref.includes('instagram.com'))                                                          return 'instagram'
    if (ref.includes('tiktok.com'))                                                             return 'tiktok'
    if (ref.includes('google.')  || ref.includes('googleadservices'))                          return 'google'
    if (ref.includes('bing.com') || ref.includes('yahoo.com'))                                 return 'google'
    return 'organic'
  }

  // 4. Aucune source détectée → accès direct
  return 'direct'
}
