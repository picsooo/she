'use client'
import React, { useEffect, useState } from 'react'

interface MarketingSettings { metaPixelId?: string; tiktokPixelId?: string }
interface DeliverySettings {
  yalidineEnabled?: boolean
  yalidineApiId?: string
  yalidineApiToken?: string
  yalidineCenterId?: string
  yalidineFromWilayaName?: string
  autoSendOnConfirm?: boolean
  defaultHomeDeliveryFee?: number
  defaultDeskDeliveryFee?: number
  freeDeliveryThreshold?: number
}

// ── Champ de saisie ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, hint, mono = false, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; hint?: string; mono?: boolean; type?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9A9A9A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
        style={{ fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? '0.03em' : 'normal' }}
      />
      {hint && <p style={{ fontSize: 11, color: '#9A9A9A', margin: '6px 0 0', lineHeight: 1.5 }}>{hint}</p>}
    </div>
  )
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 14 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, flexShrink: 0, marginTop: 2,
          background: checked ? '#E93D91' : '#E3E5E7',
          position: 'relative', transition: 'all 0.25s', cursor: 'pointer',
        }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: checked ? '#1A1A1A' : '#6D7175' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
    </label>
  )
}

// ── Section Card ───────────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, status, children }: {
  icon: string; title: string; subtitle: string; status?: 'active' | 'inactive' | 'warning'
  children: React.ReactNode
}) {
  const statusMap = {
    active:   { color: '#065F46', bg: '#D1FAE5', label: 'Actif',      dot: '#10B981' },
    inactive: { color: '#6D7175', bg: '#F1F1F1', label: 'Inactif',    dot: '#D0D0D0' },
    warning:  { color: '#B45309', bg: '#FEF3C7', label: 'Incomplet',  dot: '#F59E0B' },
  }
  const s = status ? statusMap[status] : null

  return (
    <div className="admin-card" style={{ overflow: 'hidden', marginBottom: 16 }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid #F1F1F1',
        display: 'flex', alignItems: 'center', gap: 14, background: '#FAFAFA',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: '#FCE7F3', border: '1px solid #F9A8D4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 2 }}>{subtitle}</div>
        </div>
        {s && (
          <span className="admin-badge" style={{ background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
            {s.label}
          </span>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>{children}</div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [marketing, setMarketing] = useState<MarketingSettings>({})
  const [delivery,  setDelivery]  = useState<DeliverySettings>({
    defaultHomeDeliveryFee: 400, defaultDeskDeliveryFee: 300, freeDeliveryThreshold: 0,
  })
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/globals/marketing-settings').then(r => r.json()),
      fetch('/api/globals/delivery-settings').then(r => r.json()),
    ]).then(([m, d]) => {
      setMarketing(m ?? {})
      setDelivery({ defaultHomeDeliveryFee: 400, defaultDeskDeliveryFee: 300, freeDeliveryThreshold: 0, ...d })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      await Promise.all([
        fetch('/api/globals/marketing-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(marketing) }),
        fetch('/api/globals/delivery-settings',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(delivery) }),
      ])
      showToast('Paramètres enregistrés ✓', true)
    } catch { showToast('Erreur lors de l\'enregistrement', false) }
    finally { setSaving(false) }
  }

  async function testYalidine() {
    if (!delivery.yalidineApiId || !delivery.yalidineApiToken) {
      showToast('Entrez l\'API ID et le Token avant de tester', false); return
    }
    setTesting(true); setTestResult(null)
    try {
      // Appel via proxy serveur pour éviter le blocage CORS du navigateur
      const res = await fetch(
        `/api/boutique-admin/yalidine-test?apiId=${encodeURIComponent(delivery.yalidineApiId!)}&apiToken=${encodeURIComponent(delivery.yalidineApiToken!)}`
      )
      const data = await res.json()
      setTestResult(data.ok ? 'ok' : 'fail')
    } catch { setTestResult('fail') }
    finally { setTesting(false) }
  }

  const yalidineStatus = delivery.yalidineEnabled
    ? (delivery.yalidineApiId && delivery.yalidineApiToken ? 'active' : 'warning')
    : 'inactive'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 720, animation: 'fadeIn 0.25s ease' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          background: toast.ok ? '#D1FAE5' : '#FEE2E2',
          border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`,
          color: toast.ok ? '#065F46' : '#991B1B',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', animation: 'fadeIn 0.2s ease',
        }}>{toast.ok ? '✓ ' : '✕ '}{toast.msg}</div>
      )}

      {/* Titre */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Paramètres</h1>
        <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>Pixels marketing, livraison Yalidine et frais de livraison.</p>
      </div>

      {/* ── Yalidine ── */}
      <SectionCard icon="🚚" title="Yalidine — Livraison" subtitle="Synchronisation automatique des commandes avec Yalidine" status={yalidineStatus}>
        <Toggle
          label="Activer l'intégration Yalidine"
          hint="Permet d'envoyer les commandes directement à Yalidine depuis l'admin."
          checked={!!delivery.yalidineEnabled}
          onChange={v => setDelivery(d => ({ ...d, yalidineEnabled: v }))}
        />

        <div style={{ marginTop: 8, padding: '16px 18px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E3E5E7' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#6D7175', lineHeight: 1.6 }}>
            📍 Trouvez votre <strong>API ID</strong> et <strong>API Token</strong> dans votre espace Yalidine :<br />
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#E93D91' }}>app.yalidine.app → Paramètres → API</span>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="API ID (X-API-ID)"       value={delivery.yalidineApiId ?? ''}    onChange={v => setDelivery(d => ({ ...d, yalidineApiId: v }))}    placeholder="Ex: 12345"          mono />
            <Field label="API Token (X-API-TOKEN)"  value={delivery.yalidineApiToken ?? ''} onChange={v => setDelivery(d => ({ ...d, yalidineApiToken: v }))} placeholder="Votre token secret" mono type="password" />
          </div>
          <Field
            label="ID Centre de ramassage"
            value={delivery.yalidineCenterId ?? ''}
            onChange={v => setDelivery(d => ({ ...d, yalidineCenterId: v }))}
            placeholder="Ex: 1  (fourni par Yalidine)"
            hint="L'ID de votre agence/centre Yalidine depuis lequel partent vos colis."
            mono
          />
          <Field
            label="Wilaya d'expédition (nom français)"
            value={delivery.yalidineFromWilayaName ?? ''}
            onChange={v => setDelivery(d => ({ ...d, yalidineFromWilayaName: v }))}
            placeholder="Ex: Alger"
            hint="Votre wilaya de départ pour les envois Yalidine — doit correspondre exactement au nom français (ex: Alger, Oran, Blida…)"
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <button onClick={testYalidine} disabled={testing} style={{
              padding: '8px 16px', borderRadius: 8,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              color: '#1D4ED8', fontSize: 12, fontWeight: 600,
              cursor: testing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {testing
                ? <><span style={{ width: 12, height: 12, border: '2px solid #BFDBFE', borderTopColor: '#1D4ED8', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Test en cours…</>
                : '🔌 Tester la connexion'}
            </button>
            {testResult === 'ok'   && <span style={{ fontSize: 12, fontWeight: 700, color: '#065F46' }}>● Connexion réussie ✓</span>}
            {testResult === 'fail' && <span style={{ fontSize: 12, fontWeight: 700, color: '#991B1B' }}>● Échec — vérifiez vos credentials</span>}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Toggle
            label="Envoi automatique lors de la confirmation de commande"
            hint="Dès qu'une commande passe au statut « Confirmée », elle est envoyée automatiquement à Yalidine."
            checked={!!delivery.autoSendOnConfirm}
            onChange={v => setDelivery(d => ({ ...d, autoSendOnConfirm: v }))}
          />
        </div>

        <div style={{ marginTop: 8, padding: '16px 18px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E3E5E7' }}>
          <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Frais de livraison par défaut</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Domicile (DA)"         value={String(delivery.defaultHomeDeliveryFee ?? 400)} onChange={v => setDelivery(d => ({ ...d, defaultHomeDeliveryFee: Number(v) || 0 }))} placeholder="400" type="number" />
            <Field label="Bureau (DA)"            value={String(delivery.defaultDeskDeliveryFee ?? 300)} onChange={v => setDelivery(d => ({ ...d, defaultDeskDeliveryFee: Number(v) || 0 }))} placeholder="300" type="number" />
            <Field label="Gratuit à partir de (DA)" value={String(delivery.freeDeliveryThreshold ?? 0)} onChange={v => setDelivery(d => ({ ...d, freeDeliveryThreshold: Number(v) || 0 }))} placeholder="0 = désactivé" type="number" hint="0 = jamais gratuite" />
          </div>
        </div>
      </SectionCard>

      {/* ── Pixels marketing ── */}
      <SectionCard
        icon="📊"
        title="Pixels Marketing"
        subtitle="Meta (Facebook/Instagram) et TikTok Ads — suivi des conversions"
        status={marketing.metaPixelId || marketing.tiktokPixelId ? 'active' : 'inactive'}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>📘</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>Meta Pixel</span>
              {marketing.metaPixelId && <span className="admin-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>Actif</span>}
            </div>
            <Field label="ID du Pixel Meta"   value={marketing.metaPixelId ?? ''} onChange={v => setMarketing(m => ({ ...m, metaPixelId: v }))} placeholder="Ex: 1234567890123456" hint="Meta Business → Gestionnaire d'événements → Pixels" mono />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A' }}>TikTok Pixel</span>
              {marketing.tiktokPixelId && <span className="admin-badge" style={{ background: '#D1FAE5', color: '#065F46' }}>Actif</span>}
            </div>
            <Field label="ID du Pixel TikTok" value={marketing.tiktokPixelId ?? ''} onChange={v => setMarketing(m => ({ ...m, tiktokPixelId: v }))} placeholder="Ex: C8ABC12345DEF6789" hint="TikTok Ads Manager → Outils → Pixel" mono />
          </div>
        </div>
      </SectionCard>

      {/* Enregistrer */}
      <button onClick={save} disabled={saving} className="admin-btn admin-btn-primary" style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, justifyContent: 'center' }}>
        {saving
          ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Enregistrement…</>
          : '💾 Enregistrer tous les paramètres'}
      </button>
    </div>
  )
}
