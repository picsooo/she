import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { MarketingSettings } from './globals/MarketingSettings'
import { DeliverySettings } from './globals/DeliverySettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Configuration Payload CMS — Boutique She's Fit & Beauty
export default buildConfig({
  admin: {
    user: Users.slug,

    meta: {
      titleSuffix: "— She's Fit & Beauty",
      // Icône de l'onglet navigateur dans l'admin
      icons: [{ url: '/branding/logo.png' }],
    },

    // ── Composants personnalisés ────────────────────────────────────
    components: {
      // Logo affiché dans le header de l'admin et sur la page de connexion
      graphics: {
        Logo: '@/components/admin/Logo',
        Icon: '@/components/admin/Icon',
      },

      // Branding au-dessus du formulaire de connexion
      beforeLogin: ['@/components/admin/BeforeLogin'],

      // CSS de marque injecté sur toutes les pages admin
      afterNavLinks: ['@/components/admin/GlobalStyles'],

      // Dashboard e-commerce personnalisé
      views: {
        Dashboard: {
          Component: '@/components/admin/Dashboard',
        },
      },
    },

    // Thème clair par défaut
    theme: 'light',
  },

  collections: [
    Products,
    Categories,
    Orders,
    Customers,
    Media,
    Users,
  ],

  globals: [
    MarketingSettings,
    DeliverySettings,
  ],

  editor: lexicalEditor(),

  // SQLite en dev — aucune installation requise, fichier local
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI ?? 'file:./boutique-she.db',
    },
    // push: synchronise le schéma directement sans fichiers de migration (mode dev)
    push: true,
  }),

  // Sharp pour l'optimisation et le redimensionnement des images
  sharp,

  secret: process.env.PAYLOAD_SECRET ?? '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  // GraphQL désactivé (non utilisé)
  graphQL: {
    disable: true,
  },

  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',

  upload: {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 Mo
    },
  },
})
