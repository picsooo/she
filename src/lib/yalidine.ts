/**
 * Service Yalidine — Intégration API livraison Algérie
 * Documentation : https://api.yalidine.app/v1/
 * BASE URL : https://api.yalidine.app/v1
 *
 * Auth : headers X-API-ID + X-API-TOKEN sur chaque requête
 * Les credentials sont stockés dans le global Payload "delivery-settings".
 */

const YALIDINE_BASE_URL = 'https://api.yalidine.app/v1'

// ── Types Yalidine ────────────────────────────────────────────────────────────

/** Corps d'un colis à créer — champs obligatoires sauf indication contraire */
export interface YalidineParcel {
  order_id: string            // Référence unique (ex: SHE-2026-0001)
  from_wilaya_name: string    // Wilaya d'expédition en français (ex: "Alger")
  firstname: string           // Prénom destinataire
  familyname: string          // Nom destinataire
  contact_phone: string       // Téléphone (ex: 0550123456)
  address: string             // Adresse complète
  to_wilaya_name: string      // Wilaya destination en français (ex: "Oran")
  to_commune_name: string     // Commune destination en français (ex: "Bir El Djir")
  product_list: string        // Description des articles (ex: "Robe T42 x1")
  price: number               // Montant COD à collecter (0–150000)
  do_insurance: boolean       // Assurance (si true : 0% fee, remboursement 100%)
  declared_value: number      // Valeur déclarée (0–150000)
  length: number              // Longueur colis en cm (>= 0)
  width: number               // Largeur colis en cm (>= 0)
  height: number              // Hauteur colis en cm (>= 0)
  weight: number              // Poids colis en kg (>= 0)
  freeshipping: boolean       // true = vendeur paie la livraison
  is_stopdesk: boolean        // true = retrait bureau, false = domicile
  stopdesk_id?: number        // Requis si is_stopdesk = true
  has_exchange: boolean       // Échange (retour produit)
  product_to_collect?: string // Requis si has_exchange = true
}

/** Résultat de création pour un colis — clé = order_id */
export interface YalidineCreateResult {
  success: boolean
  order_id: string
  tracking: string | null     // ex: "yal-12345A"
  import_id: number | null
  label: string | null        // URL bordereau individuel
  labels: string | null       // URL bordereau groupé (même import)
  message: string             // Message d'erreur si success = false
}

/** Détail d'un colis récupéré depuis l'API */
export interface YalidineParcelDetail {
  tracking: string
  order_id: string
  last_status: string
  date_creation: string
  date_last_status: string
  to_wilaya_name: string
  to_commune_name: string
  price: number
  freeshipping: boolean
  is_stopdesk: boolean
  payment_status: string      // not-ready | ready | receivable | payed
  label: string               // URL bordereau
}

/** Entrée de l'historique d'un colis */
export interface YalidineHistoryEntry {
  tracking: string
  status: string              // ex: "Sorti en livraison"
  date_status: string
  reason: string
  center_id: number
  center_name: string
  wilaya_id: number
  wilaya_name: string
  commune_id: number
  commune_name: string
}

/** Frais de livraison par commune */
export interface YalidineFees {
  from_wilaya_name: string
  to_wilaya_name: string
  zone: number
  retour_fee: number
  cod_percentage: number
  per_commune: Record<string, {
    commune_id: number
    commune_name: string
    express_home: number | null
    express_desk: number | null
    economic_home: number | null
    economic_desk: number | null
  }>
}

/** Wilaya depuis l'API Yalidine */
export interface YalidineWilaya {
  id: number
  name: string
  zone: number
  is_deliverable: number
}

/** Centre / bureau Yalidine */
export interface YalidineCenter {
  center_id: number
  name: string
  address: string
  commune_name: string
  wilaya_id: number
  wilaya_name: string
  phone: string
  gps: string | null
}

// ── Mapping statuts Yalidine → statuts commande She's ────────────────────────

/**
 * Traduit un statut Yalidine en statut de commande She's.
 * Retourne null si aucun changement de statut n'est nécessaire.
 */
export function mapYalidineStatusToOrder(
  yalidineStatus: string
): 'shipping' | 'delivered' | 'failed' | 'cancelled' | null {
  const statusMap: Record<string, 'shipping' | 'delivered' | 'failed' | 'cancelled' | null> = {
    'Pas encore expédié':  null,
    'A vérifier':          null,
    'En préparation':      null,
    'Pas encore ramassé':  null,
    'Prêt à expédier':     null,
    'En passation':        'shipping',
    'Ramassé':             'shipping',
    'Bloqué':              null,
    'Débloqué':            'shipping',
    'Transfert':           'shipping',
    'Expédié':             'shipping',
    'Centre':              'shipping',
    'En localisation':     'shipping',
    'Vers Wilaya':         'shipping',
    'En transit':          'shipping',
    'Reçu à Wilaya':       'shipping',
    'En attente du client':'shipping',
    'Prêt pour livreur':   'shipping',
    'Sorti en livraison':  'shipping',
    'En attente':          'shipping',
    'En alerte':           null,
    'Alerte résolue':      null,
    'Tentative échouée':   null,
    'Livré':               'delivered',
    'Echèc livraison':     'failed',
    'Annulé':              'cancelled',
    'Retour vers centre':  null,
    'Retourné au centre':  null,
    'Retour transfert':    null,
    'Retour groupé':       null,
    'Retour à retirer':    null,
    'Retour vers vendeur': null,
    'Retourné au vendeur': null,
    'Echange échoué':      null,
  }
  return statusMap[yalidineStatus] ?? null
}

// ── Client Yalidine ───────────────────────────────────────────────────────────

export class YalidineClient {
  private headers: Record<string, string>

  constructor(apiId: string, apiToken: string) {
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-ID': apiId,
      'X-API-TOKEN': apiToken,
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${YALIDINE_BASE_URL}${endpoint}`
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers, ...(options.headers ?? {}) },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Yalidine API ${res.status}: ${err}`)
    }
    return res.json() as Promise<T>
  }

  /**
   * Créer un colis chez Yalidine.
   * L'API attend un tableau de colis, même pour un seul.
   * La réponse est un objet indexé par order_id.
   */
  async createParcel(parcel: YalidineParcel): Promise<YalidineCreateResult> {
    const responseMap = await this.request<Record<string, YalidineCreateResult>>(
      '/parcels/',
      {
        method: 'POST',
        body: JSON.stringify([parcel]),  // toujours un tableau
      }
    )
    // La réponse est { "order_id": { success, tracking, label, ... } }
    const result = responseMap[parcel.order_id]
    if (!result) {
      return { success: false, order_id: parcel.order_id, tracking: null, import_id: null, label: null, labels: null, message: 'Réponse inattendue de Yalidine' }
    }
    return result
  }

  /**
   * Modifier un colis chez Yalidine.
   * ATTENTION : seulement possible si last_status = "En préparation".
   */
  async updateParcel(tracking: string, data: Partial<YalidineParcel>): Promise<YalidineParcelDetail> {
    return this.request<YalidineParcelDetail>(`/parcels/${tracking}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  /**
   * Supprimer un colis chez Yalidine.
   * ATTENTION : seulement possible si last_status = "En préparation".
   */
  async deleteParcel(tracking: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/parcels/${tracking}/`, {
      method: 'DELETE',
    })
  }

  /** Récupérer le détail d'un colis par son numéro de suivi */
  async getParcel(tracking: string): Promise<{ data: YalidineParcelDetail[] }> {
    return this.request<{ data: YalidineParcelDetail[] }>(`/parcels/${tracking}/`)
  }

  /** Récupérer l'historique complet des statuts d'un colis */
  async getParcelHistory(tracking: string): Promise<{ data: YalidineHistoryEntry[] }> {
    return this.request<{ data: YalidineHistoryEntry[] }>(`/histories/${tracking}/`)
  }

  /**
   * Récupérer les frais de livraison entre deux wilayas.
   * from_wilaya_id et to_wilaya_id correspondent au code numérique (01→1, 16→16).
   */
  async getFees(fromWilayaId: number, toWilayaId: number): Promise<YalidineFees> {
    return this.request<YalidineFees>(
      `/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`
    )
  }

  /** Liste des wilayas Yalidine (58 wilayas) */
  async getWilayas(): Promise<{ data: YalidineWilaya[] }> {
    return this.request<{ data: YalidineWilaya[] }>('/wilayas/?page_size=100')
  }

  /**
   * Récupérer les centres (bureaux) Yalidine pour une wilaya donnée.
   * wilayaId = code numérique (ex: 16 pour Alger)
   */
  async getCenters(wilayaId: number): Promise<{ data: YalidineCenter[] }> {
    return this.request<{ data: YalidineCenter[] }>(`/centers/?wilaya_id=${wilayaId}&page_size=100`)
  }

  /** Vérifier que les credentials sont valides */
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/wilayas/?page_size=1')
      return true
    } catch {
      return false
    }
  }
}

// ── Factory — charge les credentials depuis Payload ───────────────────────────

/**
 * Charge les credentials Yalidine depuis la base de données Payload
 * et retourne un client prêt à l'emploi.
 * Retourne null si Yalidine n'est pas configuré/activé.
 */
export async function getYalidineClient(): Promise<YalidineClient | null> {
  try {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
    const res = await fetch(`${serverUrl}/api/globals/delivery-settings`, { cache: 'no-store' })
    if (!res.ok) return null
    const settings = await res.json()

    if (!settings.yalidineEnabled) return null
    if (!settings.yalidineApiId || !settings.yalidineApiToken) return null

    return new YalidineClient(settings.yalidineApiId, settings.yalidineApiToken)
  } catch {
    return null
  }
}

// ── Helper : convertir une commande She's en colis Yalidine ──────────────────

/**
 * Convertit les données d'une commande She's Fit & Beauty
 * au format attendu par l'API Yalidine.
 * Les noms de wilaya/commune doivent être en français (noms Yalidine).
 */
export function orderToYalidineParcel(order: {
  orderNumber: string
  customerName: string
  phone: string
  address: string
  fromWilayaNameFr: string   // Wilaya expéditeur en français (settings)
  toWilayaNameFr: string     // Wilaya destinataire en français
  toCommuneNameFr: string    // Commune destinataire en français
  total: number
  subtotal: number           // Montant produits seuls (sans livraison)
  shippingFee: number
  deliveryMode: 'home' | 'desk'
  items: Array<{ name: string; quantity: number; size?: string; color?: string }>
  note?: string
  stopdeskId?: number
}): YalidineParcel {
  // Description des produits
  const productList = order.items
    .map(i => `${i.name}${i.size ? ` T${i.size}` : ''}${i.color ? ` (${i.color})` : ''} x${i.quantity}`)
    .join(', ')

  // Séparation prénom / nom (best-effort sur le nom complet)
  const nameParts = order.customerName.trim().split(/\s+/)
  const firstname  = nameParts[0] ?? order.customerName
  const familyname = nameParts.slice(1).join(' ') || firstname

  // Les frais de livraison sont payés par le vendeur si shippingFee = 0 côté client
  // En pratique pour She's : freeshipping = false (client paie)
  const isStopdesk = order.deliveryMode === 'desk'

  return {
    order_id:         order.orderNumber,
    from_wilaya_name: order.fromWilayaNameFr,
    firstname,
    familyname,
    contact_phone:    order.phone,
    address:          order.address,
    to_wilaya_name:   order.toWilayaNameFr,
    to_commune_name:  order.toCommuneNameFr,
    product_list:     productList,
    // On envoie le sous-total (produits seuls) — Yalidine ajoute ses frais de livraison
    // par-dessus pour calculer le montant COD final. Si on envoyait order.total
    // (subtotal + shippingFee), le client paierait deux fois les frais de livraison.
    price:            order.subtotal,
    do_insurance:     false,
    declared_value:   order.subtotal,
    length:           40,               // Valeurs par défaut vêtements
    width:            30,
    height:           5,
    weight:           1,
    freeshipping:     false,            // Client paie la livraison via Yalidine (ajoutée au COD)
    is_stopdesk:      isStopdesk,
    ...(isStopdesk && order.stopdeskId ? { stopdesk_id: order.stopdeskId } : {}),
    has_exchange:     false,
  }
}
