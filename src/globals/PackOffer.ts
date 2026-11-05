import type { GlobalConfig } from 'payload'

// Global Payload — Offre pack « N articles achetés = prix fixe »
// Ex: 2 ensembles au choix = 10 000 DA.
//
// Les produits éligibles sont choisis par le client depuis /boutique-admin/offers :
// rien n'est figé dans le code, il peut changer la sélection à chaque campagne.
export const PackOffer: GlobalConfig = {
  slug: 'pack-offer',
  admin: { group: 'Boutique' },
  label: 'Offre pack (2 = prix fixe)',
  access: {
    // Lecture publique : le frontend doit connaître l'offre pour afficher le bon total
    read: () => true,
    update: ({ req }) => !!req.user,
  },
  fields: [
    {
      name: 'enabled',
      label: 'Activer l\'offre',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Décocher pour arrêter l\'offre immédiatement, sans rien supprimer.',
      },
    },
    {
      name: 'titleAr',
      label: 'Titre affiché (arabe)',
      type: 'text',
      defaultValue: 'قطعتان بـ 10.000 دج',
      admin: {
        description: 'Affiché sur les produits concernés et dans le panier.',
      },
    },
    {
      name: 'subtitleAr',
      label: 'Sous-titre (arabe, optionnel)',
      type: 'text',
      admin: {
        description: 'Ex: اختاري أي قطعتين من التشكيلة',
      },
    },
    {
      name: 'products',
      label: 'Produits concernés',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      admin: {
        description: 'Les articles qui entrent dans l\'offre. La cliente peut en mélanger plusieurs modèles.',
      },
    },
    {
      name: 'packQuantity',
      label: 'Nombre d\'articles par pack',
      type: 'number',
      defaultValue: 2,
      min: 2,
      required: true,
    },
    {
      name: 'packPrice',
      label: 'Prix du pack (DZD)',
      type: 'number',
      defaultValue: 10000,
      min: 0,
      required: true,
      admin: {
        description: 'Prix total pour le nombre d\'articles ci-dessus. Ex: 10 000 DA pour 2 ensembles.',
      },
    },
    {
      name: 'repeatable',
      label: 'L\'offre se répète',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Coché : 4 articles = 2 packs (20 000 DA). Décoché : l\'offre ne s\'applique qu\'une fois par commande.',
      },
    },
  ],
}
