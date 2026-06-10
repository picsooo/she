import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "She's Fit & Beauty — Bientôt disponible",
}

// Layout minimal : pas de header/footer, juste le plein écran
export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
