import { Cairo } from 'next/font/google'

// Police partagée par tout le site — déclarée ici pour éviter de la charger plusieurs fois
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-arabic',
  display: 'swap',
  preload: false,
})

// Layout racine — obligatoire pour Next.js App Router
// Les sous-layouts (frontend, boutique-admin, payload) ajoutent leur propre contenu
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
