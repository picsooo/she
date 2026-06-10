'use client'
import React, { useState } from 'react'
import Image from 'next/image'

export default function ComingSoonPage() {
  const [showForm, setShowForm] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/preview-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        window.location.href = '/'
      } else {
        setError('Mot de passe incorrect')
        setPassword('')
      }
    } catch {
      setError('Erreur réseau')
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ── Image de fond ─────────────────────────────────────────────── */}
      <Image
        src="/branding/logo.png"
        alt=""
        fill
        style={{ objectFit: 'cover', filter: 'blur(0px)', transform: 'scale(1.05)' }}
        priority
      />

      {/* ── Overlay sombre ────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(10,10,10,0.80) 0%, rgba(30,10,25,0.85) 50%, rgba(10,10,10,0.80) 100%)',
      }} />

      {/* ── Contenu centré ────────────────────────────────────────────── */}
      <div style={{ position: 'relative', textAlign: 'center', padding: '0 24px', maxWidth: 560, width: '100%' }}>

        {/* Logo */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
          <Image src="/branding/logo.png" alt="She's Fit & Beauty" width={90} height={90}
            style={{ borderRadius: '50%', border: '3px solid #CEA060', boxShadow: '0 0 40px rgba(206,160,96,0.4)' }} />
        </div>

        {/* Titre */}
        <h1 style={{
          fontSize: 'clamp(48px, 10vw, 80px)', fontWeight: 900, letterSpacing: '-2px',
          color: '#fff', margin: '0 0 8px', lineHeight: 1,
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}>
          Coming Soon
        </h1>

        {/* Sous-titre arabe */}
        <p style={{
          fontSize: 'clamp(18px, 4vw, 26px)', color: '#CEA060', fontWeight: 700,
          margin: '0 0 12px', letterSpacing: 1,
        }}>
          قريباً
        </p>

        {/* Liseré doré */}
        <div style={{ width: 60, height: 2, background: '#CEA060', margin: '0 auto 24px' }} />

        {/* Description */}
        <p style={{
          fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7,
          margin: '0 0 40px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto',
        }}>
          متجرنا قيد الإنشاء — سنعود قريباً بتجربة تسوق استثنائية
        </p>

        {/* Bouton Admin (discret en bas) */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.35)', fontSize: 12, padding: '8px 20px',
              borderRadius: 20, cursor: 'pointer', letterSpacing: 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = '#CEA060'
              ;(e.target as HTMLButtonElement).style.color = '#CEA060'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'
              ;(e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'
            }}
          >
            Admin
          </button>
        ) : (
          /* Formulaire mot de passe */
          <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '0 auto' }}>
            <div style={{
              background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(206,160,96,0.3)', borderRadius: 12,
              padding: '24px 20px',
            }}>
              <p style={{ color: '#CEA060', fontSize: 13, fontWeight: 700, margin: '0 0 16px', letterSpacing: 1 }}>
                ACCÈS ADMIN
              </p>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Mot de passe"
                autoFocus
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 8,
                  border: error ? '1px solid #E93D91' : '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)', color: '#fff',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  marginBottom: error ? 6 : 14,
                }}
              />
              {error && (
                <p style={{ color: '#E93D91', fontSize: 12, margin: '0 0 12px', textAlign: 'left' }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setPassword(''); setError('') }}
                  style={{
                    flex: 1, padding: '10px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8,
                    color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  style={{
                    flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                    background: password && !loading ? 'linear-gradient(135deg, #E93D91, #C4197A)' : 'rgba(255,255,255,0.1)',
                    color: password && !loading ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontWeight: 700, fontSize: 13, cursor: password && !loading ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? '…' : 'Entrer'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
