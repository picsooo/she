import type { GlobalConfig } from 'payload'

// Global Payload — Paramètres marketing
// Le client colle ses IDs de pixels directement dans /admin, sans toucher au code
export const MarketingSettings: GlobalConfig = {
  slug: 'marketing-settings',
  admin: {
    group: 'Administration',
  },
  label: 'إعدادات التسويق',
  access: {
    read: () => true, // Lu depuis le frontend (Server Component) sans auth
    update: ({ req }) => !!req.user,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Meta / Facebook Pixel',
          fields: [
            {
              name: 'metaPixelId',
              label: 'Meta Pixel ID',
              type: 'text',
              admin: {
                description:
                  'Coller ici votre ID Meta/Facebook Pixel (ex: 1234567890123). Laisser vide pour ne rien injecter.',
                placeholder: 'ex: 1234567890123',
              },
            },
          ],
        },
        {
          label: 'TikTok Pixel',
          fields: [
            {
              name: 'tiktokPixelId',
              label: 'TikTok Pixel ID',
              type: 'text',
              admin: {
                description:
                  'Coller ici votre ID TikTok Pixel (ex: C8ABC12345DEF6789). Laisser vide pour ne rien injecter.',
                placeholder: 'ex: C8ABC12345DEF6789',
              },
            },
          ],
        },
      ],
    },
  ],
}
