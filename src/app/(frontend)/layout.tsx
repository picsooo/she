import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { PixelScripts } from '@/components/analytics/PixelScripts'
import { PixelPageView } from '@/components/analytics/PixelPageView'
import { getMarketingSettings, getChapeauGift } from '@/lib/payload-client'
import { FreeGiftInit } from '@/components/FreeGiftInit'

export const metadata: Metadata = {
  title: {
    default: "She's Fit & Beauty | أزياء المرأة الجزائرية",
    template: "%s | She's Fit & Beauty",
  },
  description: 'متجر أزياء المرأة الجزائرية — بوركيني، فساتين حجاب، معاطف وأطقم. توصيل لجميع الولايات، الدفع عند الاستلام.',
  keywords: ['أزياء', 'بوركيني', 'حجاب', 'جزائر', 'ملابس نسائية', 'she fit beauty'],
  openGraph: {
    locale: 'ar_DZ',
    type: 'website',
    siteName: "She's Fit & Beauty",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E93D91',
}

// Layout principal — tout le frontend est en arabe, RTL
export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  // Lire les IDs pixels et le produit chapeau (cadeau burkini) en parallèle
  const [marketing, chapeau] = await Promise.all([
    getMarketingSettings().catch(() => null),
    getChapeauGift().catch(() => null),
  ])

  // Fallback sur les variables d'environnement si non configuré dans l'admin
  const metaPixelId = marketing?.metaPixelId || process.env.NEXT_PUBLIC_FB_PIXEL_ID || null
  const tiktokPixelId = marketing?.tiktokPixelId || null

  return (
    <div className="min-h-screen bg-white antialiased flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* Drawer panier */}
      <CartDrawer />
      {/* Initialise le store cadeau (toutes les variations du chapeau) */}
      <FreeGiftInit chapeauVariations={chapeau ?? []} />
      {/* Pixels marketing */}
      <PixelScripts
        metaPixelId={metaPixelId}
        tiktokPixelId={tiktokPixelId}
      />
      {/* PageView automatique sur chaque navigation client-side */}
      <PixelPageView />
    </div>
  )
}
