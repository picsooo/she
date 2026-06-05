import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Collection médias — images produits optimisées avec sharp
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Catalogue',
  },
  labels: {
    singular: 'Média',
    plural: 'Médias',
  },
  // Stockage local en dev, uploadthing en prod (via variable d'env)
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    // Formats auto-générés par sharp
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 500,
        position: 'center',
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'card',
        width: 600,
        height: 750,
        position: 'center',
        formatOptions: { format: 'webp', options: { quality: 85 } },
      },
      {
        name: 'large',
        width: 1200,
        height: 1500,
        position: 'center',
        formatOptions: { format: 'webp', options: { quality: 90 } },
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Texte alternatif (arabe)',
      type: 'text',
    },
    {
      // URL d'origine WooCommerce — pour éviter les re-téléchargements
      name: 'legacyUrl',
      label: 'URL WooCommerce originale',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
