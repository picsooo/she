import Link from 'next/link'
import Image from 'next/image'
import { t } from '@/lib/translations'

// Footer sombre avec logo doré — seul bloc sombre de la page
export function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white/80">
      {/* Bandeau de réassurance */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-4 px-4 py-8">
          {[
            { icon: '🚚', text: t.reassurance.delivery },
            { icon: '💳', text: t.reassurance.payment },
            { icon: '✨', text: t.reassurance.quality },
            { icon: '🔄', text: t.reassurance.returns },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <span className="text-sm text-[#CEA060]">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Corps du footer */}
      <div className="mx-auto max-w-6xl px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Logo + description */}
        <div className="flex flex-col gap-3">
          <Image
            src="/branding/logo.png"
            alt="She's Fit & Beauty"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
          />
          <p className="text-sm text-white/50 leading-relaxed">
            {t.general.siteDescription}
          </p>
        </div>

        {/* Liens */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[#CEA060] mb-2">روابط سريعة</h3>
          {[
            { href: '/products', label: t.nav.catalog },
            { href: '/cart', label: t.nav.cart },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-[#CEA060] mb-2">{t.footer.contact}</h3>
          <p className="text-sm text-white/50">
            الجزائر — التوصيل لجميع الولايات
          </p>
          <p className="text-sm text-white/50">
            الدفع عند الاستلام فقط
          </p>
        </div>
      </div>

      {/* Bas de footer */}
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/30">
        © {new Date().getFullYear()} {t.general.siteTitle} — {t.footer.rights}
      </div>
    </footer>
  )
}
