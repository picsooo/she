import type { CollectionConfig } from 'payload'

// Collection des catégories produits (hiérarchique, FR importé → AR affiché)
export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'nameAr',
    group: 'Catalogue',
    defaultColumns: ['nameAr', 'nameFr', 'parent', 'slug'],
  },
  labels: {
    singular: 'Catégorie',
    plural: 'Catégories',
  },
  fields: [
    {
      name: 'nameAr',
      label: 'Nom (arabe)',
      type: 'text',
      required: true,
      localized: false,
    },
    {
      name: 'nameFr',
      label: 'Nom (français — import WooCommerce)',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug URL',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Identifiant URL (généré automatiquement)',
      },
    },
    {
      name: 'parent',
      label: 'Catégorie parente',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
    },
    {
      name: 'image',
      label: 'Image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      // Clé d'idempotence pour l'import depuis WooCommerce
      name: 'legacyId',
      label: 'ID WooCommerce (import)',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'ID original WooCommerce — ne pas modifier',
      },
    },
  ],
  timestamps: true,
}
