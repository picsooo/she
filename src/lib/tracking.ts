/**
 * Centralisation des événements marketing — Meta Pixel + TikTok Pixel
 *
 * RÈGLE : Aucun appel fbq/ttq en dehors de ce fichier.
 * Tous les composants passent par trackEvent().
 *
 * Architecture :
 *  - trackEvent()      → dispatche vers fbq (Meta) ET ttq (TikTok) si disponibles
 *  - trackPageView()   → PageView sur chaque navigation
 *  - trackViewContent() → ViewContent sur page produit
 *  - trackAddToCart()  → AddToCart à chaque ajout panier
 *  - trackInitiateCheckout() → InitiateCheckout à l'arrivée /checkout
 *  - trackPurchase()   → Purchase/CompletePayment sur thank-you page (1 fois/commande)
 */

// Types globaux pour fbq et ttq — déclarés ici pour éviter les erreurs TypeScript
declare global {
  interface Window {
    fbq?: (
      action: string,
      eventName: string,
      data?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void
    ttq?: {
      track: (eventName: string, data?: Record<string, unknown>) => void
      identify: (data: { phone_number?: string; email?: string }) => void
    }
  }
}

// ── Types des événements ──────────────────────────────────────────────

export interface TrackEventData extends Record<string, unknown> {
  content_id?: string
  content_name?: string
  content_type?: string
  value?: number
  currency?: string
  num_items?: number
  order_id?: string
  contents?: Array<{
    id: string
    name: string
    quantity: number
    price: number
  }>
}

// ── Fonction centrale ─────────────────────────────────────────────────

/**
 * Dispatche un événement vers Meta Pixel ET TikTok Pixel (si chargés).
 * Silencieux si les pixels ne sont pas présents (pas d'erreur console).
 *
 * @param eventName   Nom de l'événement standard (ex: 'AddToCart')
 * @param data        Données de l'événement
 */
export function trackEvent(eventName: string, data?: TrackEventData, eventId?: string) {
  if (typeof window === 'undefined') return

  // Retry jusqu'à 5 fois si fbq n'est pas encore initialisé
  // (race condition : useEffect peut s'exécuter avant le script afterInteractive)
  const fireMeta = (retries = 0) => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, data, eventId ? { eventID: eventId } : undefined)
    } else if (retries < 5) {
      setTimeout(() => fireMeta(retries + 1), 300)
    }
  }
  fireMeta()

  // TikTok Pixel (ttq) — format légèrement différent de Meta
  if (window.ttq?.track) {
    const ttqEventName = TIKTOK_EVENT_MAP[eventName] ?? eventName
    // TikTok attend content_id (string) + contents[].content_id au lieu de contents[].id
    const ttqData = toTikTokData(data)
    window.ttq.track(ttqEventName, ttqData)
  }
}

/**
 * Transforme les données Meta Pixel au format TikTok Pixel.
 * - content_id : chaîne (premier produit ou joint par virgule)
 * - contents   : { content_id, content_type, quantity, price } au lieu de { id, name, ... }
 */
function toTikTokData(data?: TrackEventData): Record<string, unknown> {
  if (!data) return {}
  const out: Record<string, unknown> = { ...data }

  // content_id requis par TikTok — extraire depuis contents si absent
  if (!out.content_id && Array.isArray(data.contents) && data.contents.length > 0) {
    out.content_id = data.contents.map(c => c.id).join(',')
  }
  if (!out.content_type) out.content_type = 'product'

  // Reformater contents : TikTok utilise content_id au lieu de id
  if (Array.isArray(data.contents)) {
    out.contents = data.contents.map(c => ({
      content_id:   c.id,
      content_type: 'product',
      quantity:     c.quantity,
      price:        c.price,
    }))
  }

  return out
}

// Correspondance Meta → TikTok pour les événements qui diffèrent
const TIKTOK_EVENT_MAP: Record<string, string> = {
  Purchase: 'CompletePayment',
  // Les autres sont identiques (AddToCart, ViewContent, InitiateCheckout, PageView)
}

// ── Événements spécialisés ────────────────────────────────────────────

/**
 * PageView — à appeler sur chaque page et navigation client-side.
 * Le composant PixelPageView le fait automatiquement via usePathname().
 */
export function trackPageView() {
  trackEvent('PageView')
}

/**
 * ViewContent — sur la page produit.
 *
 * @param productId    ID du produit Payload
 * @param productName  Nom du produit en arabe
 * @param price        Prix effectif de la variation (ou min des variations)
 */
export function trackViewContent(productId: string, productName: string, price: number) {
  trackEvent('ViewContent', {
    content_id: productId,
    content_name: productName,
    content_type: 'product',
    value: price,
    currency: 'DZD',
  })
}

/**
 * AddToCart — à chaque ajout au panier.
 * Appelé depuis le store Zustand ou le VariantSelector.
 *
 * @param productId    ID du produit
 * @param productName  Nom du produit
 * @param price        Prix unitaire effectif
 * @param quantity     Quantité ajoutée
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number = 1
) {
  trackEvent('AddToCart', {
    content_id: productId,
    content_name: productName,
    content_type: 'product',
    value: price * quantity,
    currency: 'DZD',
    num_items: quantity,
    contents: [{ id: productId, name: productName, quantity, price }],
  })
}

/**
 * InitiateCheckout — à l'arrivée sur /checkout.
 *
 * @param cartTotal   Total du panier en DZD
 * @param numItems    Nombre d'articles
 */
export function trackInitiateCheckout(
  cartTotal: number,
  numItems: number,
  contents?: Array<{ id: string; name: string; quantity: number; price: number }>,
) {
  trackEvent('InitiateCheckout', {
    value: cartTotal,
    currency: 'DZD',
    num_items: numItems,
    ...(contents && contents.length > 0 ? { contents } : {}),
  })
}

/**
 * Purchase / CompletePayment — sur la thank-you page UNIQUEMENT.
 * Protection anti-doublon : vérifie localStorage avant de tirer l'événement.
 *
 * @param orderNumber  Numéro de commande (SHE-YYYY-NNNN)
 * @param total        Total de la commande en DZD
 * @param items        Articles de la commande
 */
export function trackPurchase(
  orderNumber: string,
  total: number,
  items: Array<{ id: string; name: string; quantity: number; price: number }>,
  eventId?: string,
  phone?: string,
) {
  if (typeof window === 'undefined') return

  // Anti-doublon : une seule fois par commande même si la page est rechargée
  const storageKey = `pixel_purchase_${orderNumber}`
  if (localStorage.getItem(storageKey)) return

  // TikTok Advanced Matching — identifier le client par téléphone
  // Normaliser le numéro algérien : 0XXXXXXXXX → +213XXXXXXXXX
  if (phone && window.ttq?.identify) {
    const normalized = phone.replace(/\s/g, '').replace(/^0/, '+213')
    window.ttq.identify({ phone_number: normalized })
  }

  trackEvent('Purchase', {
    order_id: orderNumber,
    value: total,
    currency: 'DZD',
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    contents: items,
  }, eventId)

  localStorage.setItem(storageKey, Date.now().toString())
}
