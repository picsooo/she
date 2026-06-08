'use client'
import React, { useState } from 'react'

// Page de connexion custom — rendue par le layout quand aucune session n'est active
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.token) {
        window.location.href = '/boutique-admin/dashboard'
      } else {
        setError(data.errors?.[0]?.message ?? 'Email ou mot de passe incorrect')
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080810 0%, #0F0720 50%, #080810 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow effects */}
      <div style={{
        position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(233,61,145,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '8%',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(206,160,96,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>

        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
            <img src="/branding/logo.png" alt="She's Fit & Beauty" style={{
              width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
              border: '2px solid rgba(233,61,145,0.6)',
              boxShadow: '0 0 30px rgba(233,61,145,0.35), 0 0 60px rgba(233,61,145,0.15)',
              display: 'block',
            }} />
            <div style={{
              position: 'absolute', bottom: 2, right: 2,
              width: 14, height: 14, borderRadius: '50%',
              background: '#22C55E', border: '2px solid #080810',
            }} />
          </div>
          <div style={{
            fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(135deg, #CEA060 0%, #F5D08A 50%, #CEA060 100%)',
            backgroundSize: '200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '0.1em',
          }}>SHE'S FIT & BEAUTY</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 6, letterSpacing: '0.06em' }}>
            ESPACE ADMINISTRATEUR
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleLogin} style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24, padding: '32px 28px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{
            margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#fff',
          }}>Connexion</h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Connectez-vous à votre tableau de bord
          </p>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 12, padding: '12px 16px',
              color: '#F87171', fontSize: 13, marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required autoFocus
              placeholder="admin@boutique-she.com"
              style={{
                width: '100%', padding: '13px 14px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(233,61,145,0.5)'
                e.target.style.boxShadow = '0 0 0 3px rgba(233,61,145,0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                style={{
                  width: '100%', padding: '13px 48px 13px 14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: 14, outline: 'none',
                  boxSizing: 'border-box', transition: 'all 0.2s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(233,61,145,0.5)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(233,61,145,0.08)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, padding: 4,
              }}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading
              ? 'rgba(233,61,145,0.35)'
              : 'linear-gradient(135deg, #E93D91, #C4197A)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 15, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 24px rgba(233,61,145,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.25s', letterSpacing: '0.02em',
          }}>
            {loading ? (
              <>
                <span style={{
                  width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.8s linear infinite',
                }} />
                Connexion…
              </>
            ) : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
          She's Fit & Beauty — Panneau d'administration
        </p>
      </div>
    </div>
  )
}
