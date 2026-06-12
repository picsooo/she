'use client'
import React, { useState } from 'react'

// ── Page de connexion boutique-admin ──────────────────────────────────────────
// Deux onglets : Admin et Confirmatrice — email + mot de passe dans les deux cas
// Redirection selon le rôle retourné par l'API
export function LoginPage() {
  const [mode, setMode] = useState<'admin' | 'confirmatrice'>('admin')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #080810 0%, #0F0720 50%, #080810 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,61,145,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(206,160,96,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/branding/logo.png" alt="She's" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(233,61,145,0.6)', boxShadow: '0 0 30px rgba(233,61,145,0.35)', display: 'block', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg, #CEA060 0%, #F5D08A 50%, #CEA060 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.1em' }}>
            SHE'S FIT & BEAUTY
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, letterSpacing: '0.06em' }}>ESPACE ADMINISTRATION</div>
        </div>

        {/* Sélecteur de mode */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 5 }}>
          <ModeBtn active={mode === 'admin'} onClick={() => setMode('admin')} icon="🔐" label="Administrateur" />
          <ModeBtn active={mode === 'confirmatrice'} onClick={() => setMode('confirmatrice')} icon="📋" label="Confirmatrice" />
        </div>

        <LoginForm mode={mode} />

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.1)' }}>
          She's Fit & Beauty — v2.0
        </p>
      </div>
    </div>
  )
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '10px 8px', borderRadius: 10,
      background: active ? 'rgba(233,61,145,0.25)' : 'rgba(255,255,255,0.08)',
      border: active ? '1px solid rgba(233,61,145,0.6)' : '1px solid rgba(255,255,255,0.15)',
      color: active ? '#FF69B4' : '#FFFFFF',
      fontSize: 13, fontWeight: active ? 700 : 500,
      cursor: 'pointer', transition: 'all 0.2s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    }}>
      <span>{icon}</span> {label}
    </button>
  )
}

// ── Formulaire unifié — email + mot de passe ──────────────────────────────────
// Redirection après login basée sur le rôle retourné par l'API :
// confirmatrice → /confirmatrice/orders | admin/éditeur → /boutique-admin/dashboard
function LoginForm({ mode }: { mode: 'admin' | 'confirmatrice' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const isConfirmatrice = mode === 'confirmatrice'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.token) {
        setError('Email ou mot de passe incorrect')
        return
      }
      const role = data.user?.role ?? ''
      if (isConfirmatrice) {
        // Onglet confirmatrice : seul le rôle confirmatrice est autorisé
        // Stocker le token dans localStorage pour le portail confirmatrice
        if (role === 'confirmatrice') {
          localStorage.setItem('conf-token', data.token)
          window.location.href = '/confirmatrice/orders'
        } else {
          setError('Email ou mot de passe incorrect')
        }
      } else {
        // Onglet admin : seuls admin et editor sont autorisés — les confirmatrices voient une erreur
        if (['admin', 'editor'].includes(role)) {
          window.location.href = '/boutique-admin/dashboard'
        } else {
          setError('Accès non autorisé pour ce compte')
        }
      }
    } catch { setError('Erreur réseau. Réessayez.') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleLogin} style={CARD_STYLE}>
      <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#fff' }}>
        {isConfirmatrice ? 'Espace confirmatrice' : 'Connexion admin'}
      </h2>
      <p style={{ margin: '0 0 22px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
        {isConfirmatrice ? 'Entrez votre email et mot de passe' : 'Entrez vos identifiants administrateur'}
      </p>

      {error && <ErrorBox message={error} />}

      <Field label="Email" value={email} onChange={setEmail} type="email"
        placeholder={isConfirmatrice ? 'votre@email.com' : 'admin@boutique-she.com'} autoFocus />

      <div style={{ marginBottom: 24, position: 'relative' }}>
        <label style={LABEL_STYLE}>Mot de passe</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
            style={{ ...INPUT_STYLE, paddingRight: 44 }}
            onFocus={e => { e.target.style.borderColor = 'rgba(233,61,145,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(233,61,145,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16 }}>
            {showPwd ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <SubmitBtn loading={loading} label={isConfirmatrice ? 'Accéder à mes commandes →' : 'Se connecter →'} />
    </form>
  )
}

// ── Composants partagés ───────────────────────────────────────────────────────
function Field({ label, value, onChange, type, placeholder, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void
  type: string; placeholder: string; autoFocus?: boolean
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        required autoFocus={autoFocus} placeholder={placeholder}
        style={INPUT_STYLE}
        onFocus={e => { e.target.style.borderColor = 'rgba(233,61,145,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(233,61,145,0.08)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '10px 14px', color: '#F87171', fontSize: 13, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
      <span>⚠️</span> {message}
    </div>
  )
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading} style={{
      width: '100%', padding: '14px',
      background: loading ? 'rgba(233,61,145,0.35)' : 'linear-gradient(135deg, #E93D91, #C4197A)',
      color: '#fff', border: 'none', borderRadius: 12,
      fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
      boxShadow: loading ? 'none' : '0 4px 24px rgba(233,61,145,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      transition: 'all 0.25s',
    }}>
      {loading ? (
        <><span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Connexion…</>
      ) : label}
    </button>
  )
}

const CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 24, padding: '28px 24px',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: 7,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#fff', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', transition: 'all 0.2s',
}
