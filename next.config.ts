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
    // CSP du frontend public — sans 'unsafe-eval'
    const frontendCSP = [
      "default-src 'self'",
      // Scripts : Meta Pixel + TikTok (analytics + ads) — sans 'unsafe-eval'
      "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://analytics.tiktok.com https://ads.tiktok.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // Connexions : Meta events + TikTok events (analytics + ads)
      "connect-src 'self' https://images.unsplash.com https://connect.facebook.net https://www.facebook.com https://graph.facebook.com https://analytics.tiktok.com https://ads.tiktok.com",
      // Frames Meta (optionnel — sécurité)
      "frame-src https://www.facebook.com",
    ].join('; ')

    // CSP de l'admin Payload — 'unsafe-eval' autorisé uniquement ici (requis par certains bundlers admin)
    const adminCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-src 'self'",
    ].join('; ')

    // Headers communs à toutes les routes
    const commonHeaders = [
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
    ]

    return [
      // Admin Payload — 'unsafe-eval' autorisé + pas de X-Frame-Options DENY (iframes admin)
      {
        source: '/admin(.*)',
        headers: [
          ...commonHeaders,
          {
            key: 'Content-Security-Policy',
            value: adminCSP,
          },
        ],
      },
      // Frontend public — CSP stricte sans 'unsafe-eval'
      {
        source: '/((?!admin).*)',
        headers: [
          ...commonHeaders,
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: frontendCSP,
          },
        ],
      },
    ]
  },

  experimental: {},
}

export default withPayload(nextConfig)
