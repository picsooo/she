import type { GlobalConfig } from 'payload'

// Global Payload — Paramètres livraison Yalidine
// Les credentials sont stockés en base, jamais dans le code
export const DeliverySettings: GlobalConfig = {
  slug: 'delivery-settings',
  admin: {
    group: 'Administration',
  },
  label: 'Livraison — Yalidine',
  access: {
    read: ({ req }) => !!req.user,   // Uniquement les admins connectés
    update: ({ req }) => !!req.user,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Yalidine API',
          fields: [
            {
              name: 'yalidineEnabled',
              label: 'Activer Yalidine',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Si activé, les commandes confirmées peuvent être envoyées automatiquement à Yalidine.',
              },
            },
            {
              name: 'yalidineApiId',
              label: 'API ID (X-API-ID)',
              type: 'text',
              admin: {
                placeholder: 'Ex: 12345',
                description: 'Votre identifiant API Yalidine — disponible dans votre espace Yalidine → API.',
              },
            },
            {
              name: 'yalidineApiToken',
              label: 'API Token (X-API-TOKEN)',
              type: 'text',
              admin: {
                placeholder: 'Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6...',
                description: 'Token secret Yalidine. Ne jamais le partager.',
              },
            },
            {
              name: 'yalidineCenterId',
              label: 'Centre de ramassage (ID)',
              type: 'text',
              admin: {
                placeholder: 'Ex: 1',
                description: 'L\'ID de votre centre Yalidine (fourni par Yalidine lors de l\'onboarding).',
              },
            },
            {
              name: 'autoSendOnConfirm',
              label: 'Envoi automatique à Yalidine lors de la confirmation de commande',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          label: 'Frais de livraison',
          fields: [
            {
              name: 'defaultHomeDeliveryFee',
              label: 'Frais livraison à domicile par défaut (DZD)',
              type: 'number',
              defaultValue: 400,
              admin: {
                description: 'Appliqué si la wilaya n\'est pas dans la liste ci-dessous.',
              },
            },
            {
              name: 'defaultDeskDeliveryFee',
              label: 'Frais livraison en bureau par défaut (DZD)',
              type: 'number',
              defaultValue: 300,
            },
            {
              name: 'freeDeliveryThreshold',
              label: 'Seuil livraison gratuite (DZD, 0 = désactivé)',
              type: 'number',
              defaultValue: 0,
              admin: {
                description: 'Ex: 5000 → livraison gratuite pour toute commande ≥ 5 000 DZD.',
              },
            },
          ],
        },
      ],
    },
  ],
}
