'use client'
/**
 * Contenu affiché AU-DESSUS du formulaire de connexion Payload.
 * Donne un look premium à la page de login.
 */
import React from 'react'

const BeforeLogin: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
    textAlign: 'center',
  }}>
    {/* Logo */}
    <div style={{
      width: 80,
      height: 80,
      borderRadius: '50%',
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(206,160,96,0.35)',
      border: '2px solid #CEA060',
    }}>
      <img
        src="/branding/logo.png"
        alt="She's Fit & Beauty"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>

    {/* Marque */}
    <div>
      <div style={{
        fontSize: '22px',
        fontWeight: 800,
        color: '#CEA060',
        letterSpacing: '0.12em',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1,
      }}>
        SHE&apos;S
      </div>
      <div style={{
        fontSize: '11px',
        color: '#E93D91',
        letterSpacing: '0.22em',
        marginTop: '3px',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 600,
      }}>
        FIT &amp; BEAUTY
      </div>
    </div>

    {/* Tagline */}
    <p style={{
      fontSize: '13px',
      color: '#6b6b6b',
      margin: 0,
      fontStyle: 'italic',
    }}>
      Panneau d&apos;administration — Boutique en ligne
    </p>

    {/* Séparateur doré */}
    <div style={{
      width: '48px',
      height: '2px',
      background: 'linear-gradient(to right, #CEA060, #E93D91)',
      borderRadius: '2px',
    }} />
  </div>
)

export default BeforeLogin
