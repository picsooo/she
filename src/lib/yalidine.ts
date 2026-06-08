/**
 * Service Yalidine — Intégration API livraison Algérie
 * Documentation : https://api.yalidine.app/v1/
 *
 * ⚠️  Les credentials (API ID + Token) sont stockés dans le global Payload
 *     "delivery-settings" — jamais en dur dans le code.
 *
 * COMMENT UTILISER :
 *   const client = await getYalidineClient()  // charge les credentials depuis la DB
 *   const result = await client.createParcel({ ... })
 */

const YALIDINE_BASE_URL = 'https://api.yalidine.app/v1'

// ── Types Yalidine ────────────────────────────────────────────────────────────

export interface YalidineParcel {
  order_id: string          // Référence interne (ex: SHE-2026-0001)
  firstname: string         // Prénom client
  familyname: string        // Nom de famille client
  contact_phone: string     // Téléphone (format: 05XXXXXXXX)
  address: string           // Adresse complète
  from_wilaya_id: number    // Wilaya d'expédition (votre centre)
  to_wilaya_id: number      // Wilaya de destination
  to_commune_id: number     // Commune de destination
  product_list: string      // Description des produits (ex: "Robe T42 x1")
  price: number             // Valeur déclarée (COD = montant à collecter)
  do_insurance: 0 | 1       // Assurance (0 = non)
  declared_value: number    // Valeur assurée si do_insurance = 1
  height: number            // Hauteur colis cm
  width: number             // Largeur colis cm
  length: number            // Longueur colis cm
  weight: number            // Poids kg
  freeshipping: 0 | 1       // 0 = client paie la livraison, 1 = gratuit
  is_stopdesk: 0 | 1        // 0 = livraison à domicile, 1 = bureau
  stopdesk_id?: number      // ID bureau si is_stopdesk = 1
  has_exchange: 0 | 1       // Échange à la livraison
  note?: string             // Note pour le livreur
}

export interface YalidineParcelResponse {
  success: boolean
  parcel_id?: string        // ID unique du colis chez Yalidine
  tracking?: string         // Numéro de suivi
  label_url?: string        // URL du bon de livraison PDF
  error?: string
}

export interface YalidineWilaya {
  id: number
  name: string
  name_ascii: string
  has_home_delivery: boolean
  has_stop_desk: boolean
  home_delivery_fee: number
  desk_delivery_fee: number
}

export interface YalidineCommune {
  id: number
  name: string
  wilaya_id: number
  has_home_delivery: boolean
  stop_desk_fee: number
  home_delivery_fee: number
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
    const res = await fetch(`${YALIDINE_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...this.headers, ...(options.headers ?? {}) },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Yalidine API ${res.status}: ${err}`)
    }
    return res.json()
  }

  /** Créer un colis (envoi d'une commande à Yalidine) */
  async createParcel(parcel: YalidineParcel): Promise<YalidineParcelResponse> {
    return this.request<YalidineParcelResponse>('/parcels/', {
      method: 'POST',
      body: JSON.stringify(parcel),
    })
  }

  /** Récupérer le statut d'un colis par son tracking ID */
  async getParcel(parcelId: string): Promise<{ data: Record<string, unknown> }> {
    return this.request(`/parcels/${parcelId}/`)
  }

  /** Annuler un colis */
  async cancelParcel(parcelId: string): Promise<{ success: boolean }> {
    return this.request(`/parcels/${parcelId}/cancel/`, { method: 'POST' })
  }

  /** Liste des wilayas avec frais de livraison */
  async getWilayas(): Promise<{ data: YalidineWilaya[] }> {
    return this.request('/wilayas/')
  }

  /** Liste des communes d'une wilaya */
  async getCommunes(wilayaId: number): Promise<{ data: YalidineCommune[] }> {
    return this.request(`/communes/?wilaya_id=${wilayaId}`)
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
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/globals/delivery-settings`,
      { cache: 'no-store' }
    )
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
 */
export function orderToYalidineParcel(order: {
  orderNumber: string
  customerName: string
  phone: string
  address: string
  wilayaId: number        // ID Yalidine de la wilaya (à mapper depuis le nom)
  communeId: number       // ID Yalidine de la commune
  total: number           // Montant COD
  items: Array<{ name: string; quantity: number; size?: string; color?: string }>
  note?: string
  fromWilayaId: number    // ID Yalidine de votre centre d'expédition
  isStopDesk?: boolean
  stopdeskId?: number
}): YalidineParcel {
  // Construction de la description produits
  const productList = order.items
    .map(i => `${i.name}${i.size ? ` T${i.size}` : ''}${i.color ? ` (${i.color})` : ''} x${i.quantity}`)
    .join(', ')

  // Séparation nom / prénom (best-effort)
  const nameParts = order.customerName.trim().split(/\s+/)
  const firstname = nameParts[0] ?? order.customerName
  const familyname = nameParts.slice(1).join(' ') || firstname

  return {
    order_id: order.orderNumber,
    firstname,
    familyname,
    contact_phone: order.phone,
    address: order.address,
    from_wilaya_id: order.fromWilayaId,
    to_wilaya_id: order.wilayaId,
    to_commune_id: order.communeId,
    product_list: productList,
    price: order.total,           // Montant COD
    do_insurance: 0,
    declared_value: order.total,
    height: 5,                    // Valeurs par défaut (vêtements)
    width: 30,
    length: 40,
    weight: 1,
    freeshipping: 0,              // Client paie la livraison
    is_stopdesk: order.isStopDesk ? 1 : 0,
    ...(order.stopdeskId ? { stopdesk_id: order.stopdeskId } : {}),
    has_exchange: 0,
    note: order.note,
  }
}
