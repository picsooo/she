import type { CollectionConfig } from 'payload'

// Statuts de commande — workflow COD algérien
export const ORDER_STATUSES = [
  { label: 'جديدة (Nouvelle)', value: 'new' },
  { label: 'مؤكدة (Confirmée par téléphone)', value: 'confirmed' },
  { label: 'قيد التوصيل (En livraison)', value: 'shipping' },
  { label: 'تم التسليم (Livrée)', value: 'delivered' },
  { label: 'ملغاة (Annulée)', value: 'cancelled' },
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]['value']

// Collection des commandes
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    group: 'Commandes',
    defaultColumns: ['orderNumber', 'customerName', 'phone', 'wilaya', 'total', 'status', 'createdAt'],
    listSearchableFields: ['orderNumber', 'customerName', 'phone'],
  },
  labels: {
    singular: 'Commande',
    plural: 'Commandes',
  },
  // Pas de création manuelle depuis l'admin (seulement lecture/mise à jour statut)
  access: {
    create: () => true, // Créé par Server Action checkout
    read: ({ req }) => !!req.user,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === 'admin',
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
      admin: {
        description: 'Format: 05/06/07 + 8 chiffres',
      },
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
          admin: {
            description: 'Copie du nom au moment de la commande',
          },
        },
        {
          name: 'variationId',
          label: 'Index variation',
          type: 'number',
        },
        {
          name: 'colorAr',
          label: 'Couleur (arabe)',
          type: 'text',
        },
        {
          name: 'size',
          label: 'Taille',
          type: 'text',
        },
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

    // ── Statut workflow COD ───────────────────────────────────────────
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: ORDER_STATUSES.map(s => ({ label: s.label, value: s.value })),
      defaultValue: 'new',
      required: true,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
