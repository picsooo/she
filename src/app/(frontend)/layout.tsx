import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import '@/styles/globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { PixelScripts } from '@/components/analytics/PixelScripts'
import { PixelPageView } from '@/components/analytics/PixelPageView'
import { getMarketingSettings } from '@/lib/payload-client'

// Police arabe principale — chargée via next/font pour les performances
const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
  preload: true,
})

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
  // Lire les IDs pixels depuis le Global Payload (admin-configurable)
  const marketing = await getMarketingSettings().catch(() => null)

  return (
    <html lang="ar" dir="rtl" className={ibmPlexSansArabic.variable}>
      <body className="min-h-screen bg-white antialiased flex flex-col" suppressHydrationWarning>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {/* Drawer panier */}
        <CartDrawer />
        {/* Pixels marketing — injectés uniquement si IDs configurés dans /admin */}
        <PixelScripts
          metaPixelId={marketing?.metaPixelId}
          tiktokPixelId={marketing?.tiktokPixelId}
        />
        {/* PageView automatique sur chaque navigation client-side */}
        <PixelPageView />
      </body>
    </html>
  )
}
