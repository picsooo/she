import type { CollectionConfig } from 'payload'

// ── Couleurs disponibles ──────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { label: 'أبيض — Blanc',             value: 'أبيض' },
  { label: 'أسود — Noir',              value: 'أسود' },
  { label: 'وردي — Rose',              value: 'وردي' },
  { label: 'أحمر — Rouge',             value: 'أحمر' },
  { label: 'أزرق — Bleu',              value: 'أزرق' },
  { label: 'كحلي — Bleu marine',       value: 'كحلي' },
  { label: 'أزرق سماوي — Bleu ciel',   value: 'أزرق سماوي' },
  { label: 'أزرق فاتح — Bleu clair',   value: 'أزرق فاتح' },
  { label: 'أزرق غامق — Bleu foncé',   value: 'أزرق غامق' },
  { label: 'أخضر — Vert',              value: 'أخضر' },
  { label: 'أخضر زيتوني — Vert kaki',  value: 'أخضر زيتوني' },
  { label: 'رمادي — Gris',             value: 'رمادي' },
  { label: 'رمادي فاتح — Gris clair',  value: 'رمادي فاتح' },
  { label: 'رمادي غامق — Gris foncé',  value: 'رمادي غامق' },
  { label: 'بيج — Beige',              value: 'بيج' },
  { label: 'بني — Marron',             value: 'بني' },
  { label: 'جملي — Camel',             value: 'جملي' },
  { label: 'كريمي — Crème',            value: 'كريمي' },
  { label: 'أبيض مكسور — Blanc cassé', value: 'أبيض مكسور' },
  { label: 'إيكرو — Ecru',             value: 'إيكرو' },
  { label: 'بنفسجي — Violet',          value: 'بنفسجي' },
  { label: 'خزامي — Lavande',          value: 'خزامي' },
  { label: 'برتقالي — Orange',         value: 'برتقالي' },
  { label: 'مرجاني — Corail',          value: 'مرجاني' },
  { label: 'سلموني — Saumon',          value: 'سلموني' },
  { label: 'أصفر — Jaune',             value: 'أصفر' },
  { label: 'خردلي — Moutarde',         value: 'خردلي' },
  { label: 'فوشيا — Fuchsia',          value: 'فوشيا' },
  { label: 'وردي فوشيا — Rose fushia', value: 'وردي فوشيا' },
  { label: 'وردي ناعم — Rose poudré',  value: 'وردي ناعم' },
  { label: 'عنابي — Bordeaux',         value: 'عنابي' },
  { label: 'تركواز — Turquoise',       value: 'تركواز' },
  { label: 'ذهبي — Or',               value: 'ذهبي' },
  { label: 'فضي — Argent',             value: 'فضي' },
  { label: 'كاكي — Kaki',             value: 'كاكي' },
  { label: 'توب — Taupe',              value: 'توب' },
  { label: 'بشرة — Nude',              value: 'بشرة' },
]

const SIZE_OPTIONS = [
  { label: 'XS  (36-38)', value: 'XS(36-38)' },
  { label: 'S   (38-40)', value: 'S(38-40)' },
  { label: 'M   (40-42)', value: 'M(40-42)' },
  { label: 'L   (42-44)', value: 'L(42-44)' },
  { label: 'XL  (44-46)', value: 'XL(44-46)' },
  { label: 'XXL (46-48)', value: 'XXL(46-48)' },
  { label: 'Taille unique', value: 'unique' },
]

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
              type: 'select',
              options: COLOR_OPTIONS,
              admin: {
                description: 'Choisissez parmi les couleurs existantes',
              },
            },
            {
              name: 'size',
              label: 'Taille',
              type: 'select',
              options: SIZE_OPTIONS,
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
