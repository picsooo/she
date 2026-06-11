import type { CollectionConfig } from 'payload'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// ── Statuts de commande — workflow COD algérien complet ───────────────────────
export const ORDER_STATUSES = [
  { label: 'جديدة — Nouvelle',                value: 'new' },
  { label: 'في الانتظار — En attente',         value: 'pending' },
  { label: 'قيد المعالجة — En cours',          value: 'in_progress' },
  { label: 'مؤكدة — Confirmée',               value: 'confirmed' },
  { label: 'قيد التوصيل — En livraison',       value: 'shipping' },
  { label: 'تم التسليم — Livrée',              value: 'delivered' },
  { label: 'فاشلة — Échouée',                 value: 'failed' },
  { label: 'ملغاة — Annulée',                 value: 'cancelled' },
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

// Statuts qui déclenchent un retour de stock
const STOCK_RETURN_STATUSES: OrderStatus[] = ['failed', 'cancelled']
// Statut qui déclenche la déduction de stock
const STOCK_DEDUCT_STATUS: OrderStatus = 'confirmed'

// ── Collection des commandes ──────────────────────────────────────────────────
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Commandes',
    defaultColumns: ['orderNumber', 'customerName', 'phone', 'wilaya', 'total', 'status', 'assignedTo', 'createdAt'],
    listSearchableFields: ['orderNumber', 'customerName', 'phone'],
  },
  labels: {
    singular: 'Commande',
    plural: 'Commandes',
  },
  access: {
    create: () => true, // Créé par Server Action checkout
    read: ({ req }) => {
      if (!req.user) return false
      // Les confirmatrices voient seulement leurs commandes assignées
      if (req.user.role === 'confirmatrice') {
        return { assignedTo: { equals: req.user.id } }
      }
      return true
    },
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: {
    // Gestion du stock automatique selon changement de statut
    afterChange: [
      async ({ doc, previousDoc, operation }) => {
        if (operation !== 'update') return
        const prevStatus = previousDoc?.status as OrderStatus | undefined
        const newStatus = doc.status as OrderStatus

        if (prevStatus === newStatus) return

        try {
          const payload = await getPayload({ config: configPromise })

          // Confirmation → déduire le stock
          if (newStatus === STOCK_DEDUCT_STATUS && !doc.stockDecremented) {
            for (const item of (doc.items ?? [])) {
              const productId = typeof item.product === 'object' ? item.product.id : item.product
              if (!productId) continue
              const product = await payload.findByID({ collection: 'products', id: productId })
              const variations = product?.variations ?? []
              const varIdx = item.variationIndex ?? -1
              if (varIdx < 0 || varIdx >= variations.length) continue
              const v = variations[varIdx]
              const newStock = Math.max(0, (v.stock ?? 0) - (item.quantity ?? 1))
              variations[varIdx] = { ...v, stock: newStock, inStock: newStock > 0 }
              await payload.update({
                collection: 'products',
                id: productId,
                data: { variations },
              })
            }
            // Marquer le stock comme déduit pour éviter la double déduction
            await payload.update({ collection: 'orders', id: doc.id, data: { stockDecremented: true } })
          }

          // Annulation/Échec → remettre le stock si précédemment déduit
          if (STOCK_RETURN_STATUSES.includes(newStatus) && doc.stockDecremented) {
            for (const item of (doc.items ?? [])) {
              const productId = typeof item.product === 'object' ? item.product.id : item.product
              if (!productId) continue
              const product = await payload.findByID({ collection: 'products', id: productId })
              const variations = product?.variations ?? []
              const varIdx = item.variationIndex ?? -1
              if (varIdx < 0 || varIdx >= variations.length) continue
              const v = variations[varIdx]
              const newStock = (v.stock ?? 0) + (item.quantity ?? 1)
              variations[varIdx] = { ...v, stock: newStock, inStock: true }
              await payload.update({
                collection: 'products',
                id: productId,
                data: { variations },
              })
            }
            await payload.update({ collection: 'orders', id: doc.id, data: { stockDecremented: false } })
          }
        } catch (err) {
          console.error('[Orders hook] Erreur gestion stock:', err)
        }
      },
    ],
  },

  fields: [
    // ── Numéro de commande ────────────────────────────────────────────
    {
      name: 'orderNumber',
      label: 'N° commande',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },

    // ── Statut ────────────────────────────────────────────────────────
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: ORDER_STATUSES.map(s => ({ label: s.label, value: s.value })),
      defaultValue: 'new',
      required: true,
      admin: { position: 'sidebar' },
    },

    // ── Confirmatrice assignée ─────────────────────────────────────────
    {
      name: 'assignedTo',
      label: 'Confirmatrice',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        description: 'Confirmatrice en charge de cette commande',
      },
    },

    // ── Mode de livraison ─────────────────────────────────────────────
    {
      name: 'deliveryMode',
      label: 'Mode de livraison',
      type: 'select',
      options: [
        { label: '🏠 توصيل إلى المنزل (Domicile)', value: 'home' },
        { label: '🏢 توصيل إلى المكتب (Bureau Yalidine)', value: 'desk' },
      ],
      defaultValue: 'home',
      admin: { position: 'sidebar' },
    },

    // ── Marge commerciale ─────────────────────────────────────────────
    {
      name: 'margin',
      label: 'Marge (DZD)',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Marge commerciale définie par l\'admin',
      },
    },

    // ── Informations client ───────────────────────────────────────────
    {
      name: 'customerName',
      label: 'Nom complet',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      label: 'Téléphone',
      type: 'text',
      required: true,
      admin: { description: 'Format: 05/06/07 + 8 chiffres' },
    },
    {
      name: 'wilaya',
      label: 'Wilaya',
      type: 'text',
      required: true,
    },
    {
      name: 'commune',
      label: 'Commune (بلدية)',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      label: 'Adresse',
      type: 'text',
      required: true,
    },
    {
      name: 'note',
      label: 'Note client',
      type: 'textarea',
    },
    {
      name: 'email',
      label: 'Email client',
      type: 'email',
      admin: { description: 'Adresse email pour l\'envoi de la confirmation (optionnel)' },
    },

    // ── Articles commandés ────────────────────────────────────────────
    {
      name: 'items',
      label: 'Articles',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'product',
          label: 'Produit',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'productName',
          label: 'Nom produit (snapshot)',
          type: 'text',
          required: true,
          admin: { description: 'Copie du nom au moment de la commande' },
        },
        { name: 'variationIndex', label: 'Index variation', type: 'number' },
        { name: 'colorAr',        label: 'Couleur (arabe)',  type: 'text' },
        { name: 'size',           label: 'Taille',           type: 'text' },
        {
          name: 'quantity',
          label: 'Quantité',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'unitPrice',
          label: 'Prix unitaire (DZD)',
          type: 'number',
          required: true,
        },
      ],
    },

    // ── Totaux ────────────────────────────────────────────────────────
    {
      name: 'subtotal',
      label: 'Sous-total (DZD)',
      type: 'number',
      required: true,
    },
    {
      name: 'shippingFee',
      label: 'Frais de livraison (DZD)',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'total',
      label: 'Total (DZD)',
      type: 'number',
      required: true,
    },

    // ── Champs techniques masqués ─────────────────────────────────────
    {
      name: 'stockDecremented',
      label: 'Stock déduit',
      type: 'checkbox',
      defaultValue: false,
      admin: { hidden: true },
    },
    {
      name: 'yalidineTrackingId',
      label: 'Tracking Yalidine',
      type: 'text',
      admin: { description: 'ID de suivi Yalidine (rempli automatiquement à l\'envoi)' },
    },
    {
      name: 'yalidineLabelUrl',
      label: 'Bordereau Yalidine (URL)',
      type: 'text',
      admin: { description: 'URL du bordereau PDF à imprimer (fourni par Yalidine)' },
    },
    {
      name: 'yalidineStatus',
      label: 'Statut Yalidine',
      type: 'text',
      admin: { description: 'Dernier statut reçu depuis Yalidine via webhook' },
    },
    {
      name: 'yalidineSentAt',
      label: 'Envoyé à Yalidine le',
      type: 'date',
      admin: { description: 'Date/heure d\'envoi du colis à Yalidine' },
    },
  ],
  timestamps: true,
}
