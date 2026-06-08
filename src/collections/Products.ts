import type { CollectionConfig } from 'payload'

// ── Génère le slug depuis le nom ─────────────────────────────────────────────
function makeSlug(text: string): string {
  return text
    .toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
    || String(Date.now())
}

// ── Collection Produits ───────────────────────────────────────────────────────
export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'nameAr',
    group: 'Boutique',
    defaultColumns: ['nameAr', 'category', 'status', 'updatedAt'],
    listSearchableFields: ['nameAr', 'nameFr', 'sku'],
  },
  labels: { singular: 'Produit', plural: 'Produits' },
  versions: false,

  hooks: {
    beforeChange: [
      ({ data, operation, originalDoc }) => {
        if (operation === 'create' && !data.slug) {
          data.slug = makeSlug(data.nameAr || data.nameFr || '')
        }
        return data
      },
    ],
  },

  fields: [
    // ════════════════════════════════════════════════════════════════
    // SECTION 1 — NOM DU PRODUIT (en haut, bien visible)
    // ════════════════════════════════════════════════════════════════
    {
      name: 'nameAr',
      label: 'Nom du produit',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Affiché sur la boutique',
        autoComplete: 'off',
      },
    },

    // ════════════════════════════════════════════════════════════════
    // SECTION 2 — DESCRIPTION
    // ════════════════════════════════════════════════════════════════
    {
      name: 'descriptionAr',
      label: 'Description du produit',
      type: 'textarea',
      admin: {
        description: 'Description affichée sur la page produit (texte simple)',
      },
    },

    // ════════════════════════════════════════════════════════════════
    // SECTION 3 — DONNÉES PRODUIT (style WooCommerce)
    // ════════════════════════════════════════════════════════════════
    {
      type: 'collapsible',
      label: '🏷️  Données Produit',
      admin: { initCollapsed: false },
      fields: [
        // ── Variations ───────────────────────────────────────────
        {
          name: 'variations',
          label: 'Variations (couleur × taille)',
          type: 'array',
          admin: {
            description: 'Ajoutez une ligne par combinaison couleur/taille disponible',
            components: {
              RowLabel: '@/components/admin/VariationRowLabel',
              beforeInput: ['@/components/admin/BulkVariationUpdate#BulkVariationUpdate'],
            },
          },
          fields: [
            {
              name: 'colorAr',
              label: 'Couleur',
              type: 'text',
              admin: {
                description: 'Ex: أبيض, أسود, وردي…',
              },
            },
            {
              name: 'size',
              label: 'Taille',
              type: 'text',
              admin: {
                description: 'Ex: S(38-40), M(40-42), XL(44-46), unique, 38…',
              },
            },
            {
              name: 'regularPrice',
              label: 'Prix (DZD)',
              type: 'number',
              required: true,
              min: 0,
            },
            {
              name: 'salePrice',
              label: 'Prix en promotion (DZD)',
              type: 'number',
              min: 0,
              admin: { description: 'Laisser vide si pas de promo' },
            },
            {
              name: 'stock',
              label: 'Quantité en stock',
              type: 'number',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'inStock',
              label: 'Disponible à la vente',
              type: 'checkbox',
              defaultValue: true,
            },
            // masqués
            { name: 'colorFr',           type: 'text',   admin: { hidden: true } },
            { name: 'legacyVariationId', type: 'text',   admin: { hidden: true }, index: true },
          ],
        },
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SECTION 4 — IMAGES PRODUIT
    // ════════════════════════════════════════════════════════════════
    {
      type: 'collapsible',
      label: '📷  Images du produit',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'images',
          label: 'Photos',
          type: 'array',
          minRows: 1,
          admin: {
            description: 'La première image sera la photo principale',
            components: {
              RowLabel: '@/components/admin/ImageRowLabel',
            },
          },
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
      ],
    },

    // ════════════════════════════════════════════════════════════════
    // SIDEBAR DROITE — style WooCommerce
    // ════════════════════════════════════════════════════════════════
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { label: '✅ Publié',    value: 'published' },
        { label: '📝 Brouillon', value: 'draft' },
        { label: '📦 Archivé',   value: 'archived' },
      ],
      defaultValue: 'published',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'category',
      label: 'Catégorie',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'sku',
      label: 'SKU / Référence',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Code interne optionnel',
      },
    },
    {
      name: 'aiGenerated',
      label: '🤖 Description générée par IA',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Cocher si la description nécessite une relecture',
      },
    },

    // ════════════════════════════════════════════════════════════════
    // CHAMPS TECHNIQUES MASQUÉS
    // ════════════════════════════════════════════════════════════════
    { name: 'slug',     type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
    { name: 'nameFr',   type: 'text', admin: { hidden: true } },
    { name: 'legacyId', type: 'text', unique: true, index: true, admin: { hidden: true } },
  ],
  timestamps: true,
}
