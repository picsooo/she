'use client'

// Slider hero plein écran avec photos de fond
// Les photos sont dans /public/slides/ — remplaçables par de vraies photos produit
// Supporte background-image CSS + overlay de couleur pour assurer la lisibilité du texte

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Slide {
  id: number
  // Chemin vers l'image dans /public/ (ou URL absolue)
  image: string
  // Overlay de couleur appliqué par-dessus l'image pour harmoniser avec la charte
  overlay: string
  tag: string
  title: string
  subtitle: string
  cta: string
  href: string
  accentClass: string
}

// Photos Unsplash (libres de droit, développement) — à remplacer par les vraies photos produit
// Pour remplacer : mettez le chemin /slides/ma-photo.jpg ou une URL https://
const SLIDES: Slide[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&h=1080&fit=crop&q=85',
    overlay: 'linear-gradient(135deg, rgba(61,10,34,0.72) 0%, rgba(120,20,65,0.50) 50%, rgba(0,0,0,0.35) 100%)',
    tag: 'كوليكشن 2026',
    title: 'أناقتكِ تبدأ هنا',
    subtitle: 'تشكيلة حصرية من أزياء المرأة — جودة راقية بأسعار الجزائر',
    cta: 'تسوقي الآن',
    href: '/products',
    accentClass: 'bg-[#E93D91]',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=1920&h=1080&fit=crop&q=85',
    overlay: 'linear-gradient(135deg, rgba(13,35,71,0.75) 0%, rgba(30,77,140,0.55) 50%, rgba(0,50,100,0.40) 100%)',
    tag: 'عروض الصيف ☀️',
    title: "بوركيني She's",
    subtitle: 'أناقة على الشاطئ — تشكيلة بوركيني حصرية للمرأة المسلمة',
    cta: 'اكتشفي التشكيلة',
    href: '/products?category=burkini',
    accentClass: 'bg-[#1e7abf]',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&h=1080&fit=crop&q=85',
    overlay: 'linear-gradient(135deg, rgba(34,22,0,0.75) 0%, rgba(100,60,0,0.55) 50%, rgba(60,35,0,0.40) 100%)',
    tag: '✨ عروض خاصة',
    title: 'تخفيضات حصرية',
    subtitle: 'أسعار مخفضة على أجمل التشكيلات — الدفع عند الاستلام في كل الجزائر',
    cta: 'اغتنمي الفرصة',
    href: '/products?promo=true',
    accentClass: 'bg-[#CEA060]',
  },
]

const SLIDE_DURATION = 5500

export function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  const goTo = useCallback((index: number) => {
    if (transitioning || index === current) return
    setTransitioning(true)
    setCurrent(index)
    setTimeout(() => setTransitioning(false), 800)
  }, [transitioning, current])

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length)
  }, [current, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length)
  }, [current, goTo])

  // Défilement automatique
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, SLIDE_DURATION)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <section
      className="relative w-full overflow-hidden select-none"
      style={{ height: '100svh', minHeight: '540px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slides ────────────────────────────────────────────────────── */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== current}
          className="absolute inset-0 transition-opacity duration-[800ms] ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          {/* Photo de fond */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${slide.image})` }}
          />
          {/* Overlay couleur pour lisibilité */}
          <div
            className="absolute inset-0"
            style={{ background: slide.overlay }}
          />
          {/* Vignette bords sombres pour effet photo professionnel */}
          <div
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 200px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      ))}

      {/* ── Contenu central ──────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {/* Badge catégorie */}
        <span
          key={`tag-${current}`}
          className={`mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-white ${SLIDES[current].accentClass} shadow-lg`}
          style={{ animation: 'fadeUp 0.6s ease forwards' }}
        >
          {SLIDES[current].tag}
        </span>

        {/* Ligne dorée */}
        <div
          className="mb-5 h-px bg-[#CEA060]"
          style={{ width: '64px', animation: 'scaleIn 0.5s ease 0.1s both' }}
        />

        {/* Titre */}
        <h1
          key={`title-${current}`}
          className="mb-4 text-4xl font-extrabold leading-tight text-white md:text-6xl lg:text-7xl"
          style={{
            textShadow: '0 2px 30px rgba(0,0,0,0.6)',
            animation: 'fadeUp 0.7s ease 0.1s both',
          }}
        >
          {SLIDES[current].title}
        </h1>

        {/* Sous-titre */}
        <p
          key={`sub-${current}`}
          className="mb-8 max-w-lg text-sm leading-relaxed text-white/85 md:text-base"
          style={{ animation: 'fadeUp 0.8s ease 0.2s both' }}
        >
          {SLIDES[current].subtitle}
        </p>

        {/* CTA */}
        <Link
          href={SLIDES[current].href}
          className="inline-flex items-center gap-3 rounded-full bg-[#E93D91] px-8 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:bg-[#D32D80] hover:scale-105 hover:shadow-2xl"
          style={{ animation: 'fadeUp 0.9s ease 0.3s both' }}
        >
          {SLIDES[current].cta}
          <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Watermark marque */}
        <p
          className="mt-10 text-[11px] font-semibold tracking-[0.35em] text-[#CEA060]/50 uppercase"
          style={{ animation: 'fadeUp 1s ease 0.4s both' }}
        >
          She&apos;s Fit &amp; Beauty
        </p>
      </div>

      {/* ── Flèche droite (= précédent en RTL) ───────────────────────── */}
      <button
        onClick={prev}
        aria-label="السابق"
        className="absolute end-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/20 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/40"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Flèche gauche (= suivant en RTL) ─────────────────────────── */}
      <button
        onClick={next}
        aria-label="التالي"
        className="absolute start-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/20 p-3 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/40"
      >
        <svg className="h-5 w-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ── Indicateurs points ────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`الانتقال إلى الشريحة ${i + 1}`}
            className={`rounded-full transition-all duration-400 ${
              i === current
                ? 'w-8 h-2.5 bg-[#E93D91] shadow-lg'
                : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {/* ── Barre de progression ──────────────────────────────────────── */}
      {!paused && (
        <div className="absolute bottom-0 left-0 z-20 h-[3px] w-full bg-white/10">
          <div
            key={`prog-${current}`}
            className="h-full bg-[#E93D91]"
            style={{ animation: `slideProgress ${SLIDE_DURATION}ms linear forwards` }}
          />
        </div>
      )}

      {/* Numéro slide discret */}
      <div className="absolute bottom-8 end-6 z-20 text-[11px] font-bold text-white/30 tabular-nums">
        {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
      </div>

      <style>{`
        @keyframes slideProgress {
          from { width: 0% }
          to   { width: 100% }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
