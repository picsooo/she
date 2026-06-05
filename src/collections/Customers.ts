import type { CollectionConfig } from 'payload'

// Collection clients — créée automatiquement à chaque commande
export const Customers: CollectionConfig = {
  slug: 'customers',
  admin: {
    useAsTitle: 'name',
    group: 'Commandes',
    defaultColumns: ['name', 'phone', 'wilaya', 'ordersCount', 'createdAt'],
    listSearchableFields: ['name', 'phone'],
  },
  labels: {
    singular: 'Client',
    plural: 'Clients',
  },
  access: {
    read: ({ req }) => !!req.user,
    create: () => true,
    update: ({ req }) => !!req.user,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      label: 'Nom complet',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      label: 'Téléphone',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Champ clé — identifie le client en Algérie',
      },
    },
    {
      name: 'wilaya',
      label: 'Wilaya habituelle',
      type: 'text',
    },
    {
      name: 'commune',
      label: 'Commune',
      type: 'text',
    },
    {
      name: 'address',
      label: 'Adresse',
      type: 'text',
    },
    {
      name: 'orders',
      label: 'Commandes',
      type: 'relationship',
      relationTo: 'orders',
      hasMany: true,
      admin: { readOnly: true },
    },
    {
      name: 'ordersCount',
      label: 'Nombre de commandes',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      // Import éventuel depuis CSV clients WooCommerce
      name: 'legacyId',
      label: 'ID WooCommerce (import)',
      type: 'text',
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
