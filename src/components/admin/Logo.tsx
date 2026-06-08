'use client'
/**
 * Logo She's Fit & Beauty — affiché dans le header admin et sur la page de connexion.
 */
import React from 'react'

const Logo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <img
      src="/branding/logo.png"
      alt="She's Fit & Beauty"
      style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
    />
    <div style={{ lineHeight: 1 }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 800,
        color: '#CEA060',
        letterSpacing: '0.08em',
        fontFamily: 'system-ui, sans-serif',
      }}>
        SHE&apos;S
      </div>
      <div style={{
        fontSize: '9px',
        color: '#E93D91',
        letterSpacing: '0.18em',
        marginTop: '1px',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 600,
      }}>
        FIT &amp; BEAUTY
      </div>
    </div>
  </div>
)

export default Logo
