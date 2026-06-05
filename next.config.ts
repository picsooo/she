import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Déploiement léger sur VPS
  output: 'standalone',

  // Optimisation images
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Images servies par Payload (dev local)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**',
      },
      // Images servies par Payload en prod (même domaine)
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/api/media/**',
      },
      // Ancien site WooCommerce — pour l'import
      {
        protocol: 'https',
        hostname: 'boutique-she.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // CSP de base — à affiner en prod
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://images.unsplash.com",
            ].join('; '),
          },
        ],
      },
    ]
  },

  experimental: {},
}

export default withPayload(nextConfig)
