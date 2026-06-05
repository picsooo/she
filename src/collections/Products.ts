import type { CollectionConfig } from 'payload'

// Variation produit : couleur + taille + prix + stock
const variationFields = [
  {
    name: 'colorAr',
    label: 'Couleur (arabe)',
    type: 'text' as const,
  },
  {
    name: 'colorFr',
    label: 'Couleur (français — import)',
    type: 'text' as const,
    admin: { position: 'sidebar' as const },
  },
  {
    name: 'size',
    label: 'Taille (المقاس)',
    type: 'text' as const,
  },
  {
    name: 'regularPrice',
    label: 'Prix régulier (DZD)',
    type: 'number' as const,
    required: true,
    min: 0,
  },
  {
    name: 'salePrice',
    label: 'Prix promo (DZD)',
    type: 'number' as const,
    min: 0,
    admin: {
      description: 'Laisser vide si pas de promo',
    },
  },
  {
    name: 'stock',
    label: 'Stock',
    type: 'number' as const,
    defaultValue: 0,
    min: 0,
  },
  {
    name: 'inStock',
    label: 'En stock ?',
    type: 'checkbox' as const,
    defaultValue: false,
  },
  {
    name: 'legacyVariationId',
    label: 'ID variation WooCommerce',
    type: 'text' as const,
    index: true,
    admin: { position: 'sidebar' as const },
  },
]

// Collection principale des produits
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'nameAr',
    group: 'Catalogue',
    defaultColumns: ['nameAr', 'category', 'status', 'updatedAt'],
    listSearchableFields: ['nameAr', 'nameFr', 'sku'],
  },
  labels: {
    singular: 'Produit',
    plural: 'Produits',
  },
  versions: {
    drafts: false,
  },
  fields: [
    // ── Informations de base ──────────────────────────────────────────
    {
      name: 'nameAr',
      label: 'Nom du produit (arabe)',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'nameFr',
      label: 'Nom (français — import WooCommerce)',
      type: 'text',
    },
    {
      name: 'slug',
      label: 'Slug URL',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'category',
      label: 'Catégorie',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { label: 'Publié', value: 'published' },
        { label: 'Brouillon', value: 'draft' },
        { label: 'Archivé', value: 'archived' },
      ],
      defaultValue: 'published',
      required: true,
      admin: { position: 'sidebar' },
    },

    // ── Description ───────────────────────────────────────────────────
    {
      name: 'descriptionAr',
      label: 'Description (arabe)',
      type: 'richText',
      admin: {
        description: 'Description affichée sur la page produit',
      },
    },
    {
      name: 'aiGenerated',
      label: 'Description générée par IA',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Marquer pour relecture manuelle',
      },
    },

    // ── Images ────────────────────────────────────────────────────────
    {
      name: 'images',
      label: 'Images produit',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'image',
          label: 'Image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },

    // ── Variations ───────────────────────────────────────────────────
    {
      name: 'variations',
      label: 'Variations (couleur × taille)',
      type: 'array',
      fields: variationFields,
    },

    // ── Métadonnées d'import ──────────────────────────────────────────
    {
      name: 'legacyId',
      label: 'ID WooCommerce (import)',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'ID original WooCommerce — ne pas modifier',
      },
    },
    {
      name: 'sku',
      label: 'SKU / Référence',
      type: 'text',
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
