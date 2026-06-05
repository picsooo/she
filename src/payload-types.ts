/**
 * Ce fichier est généré automatiquement par Payload CMS.
 * Il sera écrasé au premier `npm run dev` avec la DB connectée.
 * Ne pas modifier manuellement.
 * Commande pour regénérer : npx payload generate:types
 */

export interface Media {
  id: string
  alt?: string | null
  legacyUrl?: string | null
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: { url?: string | null; width?: number | null; height?: number | null }
    card?: { url?: string | null; width?: number | null; height?: number | null }
    large?: { url?: string | null; width?: number | null; height?: number | null }
  }
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  nameAr: string
  nameFr: string
  slug: string
  parent?: Category | string | null
  image?: Media | string | null
  legacyId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProductVariation {
  colorAr?: string | null
  colorFr?: string | null
  size?: string | null
  regularPrice?: number | null
  salePrice?: number | null
  stock?: number | null
  inStock?: boolean | null
  legacyVariationId?: string | null
  id?: string | null
}

export interface Product {
  id: string
  nameAr: string
  nameFr?: string | null
  slug: string
  category?: (Category | string)[] | null
  status: 'published' | 'draft' | 'archived'
  descriptionAr?: Record<string, unknown> | string | null
  aiGenerated?: boolean | null
  images?: Array<{ image: Media | string; id?: string | null }> | null
  variations?: ProductVariation[] | null
  legacyId?: string | null
  sku?: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  product: Product | string
  productName: string
  variationIndex?: number | null
  colorAr?: string | null
  size?: string | null
  quantity: number
  unitPrice: number
  id?: string | null
}

export type OrderStatus = 'new' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  phone: string
  wilaya: string
  commune: string
  address: string
  note?: string | null
  items?: OrderItem[] | null
  subtotal: number
  shippingFee?: number | null
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  wilaya?: string | null
  commune?: string | null
  address?: string | null
  orders?: (Order | string)[] | null
  ordersCount?: number | null
  legacyId?: string | null
  createdAt: string
  updatedAt: string
}

export interface MarketingSettings {
  id: string
  metaPixelId?: string | null
  tiktokPixelId?: string | null
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'editor'
  firstName?: string | null
  lastName?: string | null
  createdAt: string
  updatedAt: string
}
