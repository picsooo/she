import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Déploiement léger sur VPS
  output: 'standalone',

  // Optimisation images
  // unoptimized: les images sont déjà en WebP/JPEG optimisé par Payload
  // (contournement incompatibilité sharp sur CPU ancien du VPS)
  images: {
    unoptimized: true,
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
          // CSP — autorise Meta Pixel, TikTok Pixel, Google Fonts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts : Meta Pixel (connect.facebook.net) + TikTok (analytics.tiktok.com)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://analytics.tiktok.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              // Connexions : Meta events + TikTok events + images
              "connect-src 'self' https://images.unsplash.com https://connect.facebook.net https://www.facebook.com https://graph.facebook.com https://analytics.tiktok.com",
              // Frames Meta (optionnel — sécurité)
              "frame-src https://www.facebook.com",
            ].join('; '),
          },
        ],
      },
    ]
  },

  experimental: {},
}

export default withPayload(nextConfig)
