'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface OrderItem {
  productName?: string
  product?: { nameAr?: string; slug?: string; images?: Array<{ image?: { url?: string } }> }
  variationIndex?: number
  colorAr?: string; size?: string
  quantity?: number; unitPrice?: number; price?: number
}

interface Order {
  id: string; orderNumber: string; customerName: string; phone: string
  wilaya: string; commune?: string; address?: string; note?: string
  subtotal?: number; shippingFee?: number; total: number
  status: string; createdAt: string; updatedAt: string
  items?: OrderItem[]
  deliveryMode?: string
}

interface DeliverySettings {
  homeDeliveryFee?: number
  officeDeliveryFee?: number
  freeDeliveryThreshold?: number
}

// Article en cours d'édition — copie mutable
interface EditableItem {
  productName?: string
  colorAr?: string
  size?: string
  quantity: number
  unitPrice: number
  // Pour conserver les champs originaux lors du PATCH
  product?: OrderItem['product']
  variationIndex?: number
}

const STATUSES = [
  { value: 'new',       labelFr: 'Nouvelle',      color: '#B45309', bg: '#FEF3C7', dot: '#F59E0B' },
  { value: 'confirmed', labelFr: 'Confirmée',      color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  { value: 'shipping',  labelFr: 'En livraison',   color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  { value: 'delivered', labelFr: 'Livrée',          color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  { value: 'cancelled', labelFr: 'Annulée',         color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
]
const STATUS_TIMELINE = ['new', 'confirmed', 'shipping', 'delivered']

const fmt     = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [order,    setOrder]    = useState<Order | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Mode édition ──────────────────────────────────────────────────────────────
  const [editMode,       setEditMode]       = useState(false)
  const [editNote,       setEditNote]       = useState('')
  const [editItems,      setEditItems]      = useState<EditableItem[]>([])
  const [editDelivery,   setEditDelivery]   = useState<'home' | 'office'>('home')
  const [delivery,       setDelivery]       = useState<DeliverySettings>({})
  const [loadingDelivery,setLoadingDelivery]= useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/boutique-admin/orders/${id}?depth=2`)
      if (res.status === 404) { setNotFound(true); return }
      setOrder(await res.json())
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // Charger les tarifs de livraison depuis le global Payload
  const loadDeliverySettings = useCallback(async () => {
    if (loadingDelivery) return
    setLoadingDelivery(true)
    try {
      const res = await fetch('/api/globals/delivery-settings?depth=0')
      if (res.ok) setDelivery(await res.json())
    } catch { /* silencieux — on affiche 0 DA par défaut */ }
    finally { setLoadingDelivery(false) }
  }, [loadingDelivery])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  // Entrer en mode édition : copier l'état courant
  const enterEditMode = () => {
    if (!order) return
    setEditNote(order.note ?? '')
    setEditDelivery((order.deliveryMode as 'home' | 'office') ?? 'home')
    setEditItems(
      (order.items ?? []).map(item => ({
        productName:    item.productName,
        colorAr:        item.colorAr,
        size:           item.size,
        quantity:       item.quantity ?? 1,
        unitPrice:      item.unitPrice ?? item.price ?? 0,
        product:        item.product,
        variationIndex: item.variationIndex,
      }))
    )
    loadDeliverySettings()
    setEditMode(true)
  }

  const cancelEdit = () => setEditMode(false)

  // Calcul dynamique des frais selon le mode choisi
  const computedShippingFee = (): number => {
    if (editDelivery === 'office') return delivery.officeDeliveryFee ?? 0
    return delivery.homeDeliveryFee ?? 0
  }

  const computedSubtotal = (): number =>
    editItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0)

  const computedTotal = (): number => computedSubtotal() + computedShippingFee()

  // Modifier la quantité d'un article
  const changeQty = (idx: number, delta: number) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const q = Math.max(1, item.quantity + delta)
      return { ...item, quantity: q }
    }))
  }

  // Supprimer un article
  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx))
  }

  // Sauvegarder via PATCH
  const saveEdit = async () => {
    if (!order) return
    setUpdating(true)
    try {
      const shippingFee = computedShippingFee()
      const subtotal    = computedSubtotal()
      const total       = subtotal + shippingFee

      const body = {
        deliveryMode: editDelivery,
        shippingFee,
        subtotal,
        total,
        note:  editNote,
        items: editItems.map(item => ({
          productName:    item.productName,
          colorAr:        item.colorAr,
          size:           item.size,
          quantity:       item.quantity,
          unitPrice:      item.unitPrice,
          price:          item.unitPrice,
          product:        item.product,
          variationIndex: item.variationIndex,
        })),
      }

      const res = await fetch(`/api/boutique-admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      await load()
      setEditMode(false)
      showToast('Commande mise à jour ✓')
    } catch {
      showToast('Erreur lors de la sauvegarde', false)
    } finally {
      setUpdating(false)
    }
  }

  const changeStatus = async (status: string) => {
    if (!order) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/boutique-admin/orders/${order.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      if (!res.ok) throw new Error()
      await load(); showToast('Statut mis à jour ✓')
    } catch { showToast('Erreur lors de la mise à jour', false) }
    finally { setUpdating(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (notFound || !order) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: '#9A9A9A' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>Commande introuvable</div>
      <div style={{ fontSize: 13, marginBottom: 24 }}>La commande #{id} n&apos;existe pas.</div>
      <Link href="/boutique-admin/orders" className="admin-btn admin-btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
        ← Retour aux commandes
      </Link>
    </div>
  )

  const statusInfo  = STATUSES.find(s => s.value === order.status) ?? STATUSES[0]
  const isCancelled = order.status === 'cancelled'
  const timelineIdx = STATUS_TIMELINE.indexOf(order.status)
  const items       = order.items ?? []
  const subtotal    = order.subtotal ?? items.reduce((s, i) => s + (i.unitPrice ?? i.price ?? 0) * (i.quantity ?? 1), 0)
  const shippingFee = order.shippingFee ?? 0

  return (
    <div style={{ maxWidth: 900, animation: 'fadeIn 0.25s ease' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          background: toast.ok ? '#D1FAE5' : '#FEE2E2',
          border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`,
          color: toast.ok ? '#065F46' : '#991B1B',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => router.back()} className="admin-btn admin-btn-secondary" style={{ padding: '7px 14px' }}>
          ← Retour
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', fontFamily: 'monospace', margin: 0 }}>
              {order.orderNumber}
            </h1>
            <span className="admin-badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusInfo.dot }} />
              {statusInfo.labelFr}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 4 }}>
            Passée le {fmtDate(order.createdAt)}
            {order.updatedAt !== order.createdAt && ` · Mise à jour le ${fmtDate(order.updatedAt)}`}
          </div>
        </div>

        {/* Bouton mode édition */}
        {!editMode ? (
          <button onClick={enterEditMode} className="admin-btn" style={{
            padding: '8px 18px', background: '#1A1A1A', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ✏️ Modifier la commande
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelEdit} className="admin-btn admin-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
              Annuler
            </button>
            <button onClick={saveEdit} disabled={updating} style={{
              padding: '8px 18px', background: '#007A5C', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: updating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {updating && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
              💾 Enregistrer
            </button>
          </div>
        )}
      </div>

      {/* Bannière mode édition */}
      {editMode && (
        <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '12px 18px', marginBottom: 16, color: '#4A3DBC', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✏️</span> Mode édition actif — modifiez les articles, le mode de livraison ou la note, puis cliquez sur « Enregistrer ».
        </div>
      )}

      {/* Timeline */}
      {!isCancelled && (
        <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
            Progression de la commande
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STATUS_TIMELINE.map((st, i) => {
              const info    = STATUSES.find(s => s.value === st)!
              const done    = i <= timelineIdx
              const current = i === timelineIdx
              const labels: Record<string, string> = { new: 'Nouvelle', confirmed: 'Confirmée', shipping: 'En livraison', delivered: 'Livrée' }
              return (
                <React.Fragment key={st}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: done ? info.bg : '#F1F5F9',
                      border: `2px solid ${done ? info.dot : '#E3E5E7'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      boxShadow: current ? `0 0 0 4px ${info.dot}20` : 'none',
                      transition: 'all 0.3s',
                    }}>
                      {i < timelineIdx ? <span style={{ color: info.dot, fontWeight: 700 }}>✓</span>
                       : current ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: info.dot, display: 'block' }} />
                       : null}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: current ? 700 : 500, color: done ? info.color : '#B0B0B0', whiteSpace: 'nowrap' }}>
                      {labels[st]}
                    </span>
                  </div>
                  {i < STATUS_TIMELINE.length - 1 && (
                    <div style={{
                      flex: 1, height: 2, margin: '-14px 4px 14px',
                      background: i < timelineIdx ? '#E3E5E7' : '#F1F5F9',
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      {i < timelineIdx && <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${STATUSES.find(s => s.value === STATUS_TIMELINE[i])!.dot}, ${STATUSES.find(s => s.value === STATUS_TIMELINE[i+1])!.dot})` }} />}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 18px', marginBottom: 16, color: '#991B1B', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✕</span> Cette commande a été annulée.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Client */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={CARD_TITLE}>👤 Client</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <InfoRow icon="🙍‍♀️" label="Nom"       value={order.customerName} />
            <InfoRow icon="📱" label="Téléphone" value={<a href={`tel:${order.phone}`} style={{ color: '#E93D91', textDecoration: 'none', fontWeight: 700 }}>{order.phone}</a>} />
            <InfoRow icon="📍" label="Wilaya"    value={order.wilaya} />
            {order.commune && <InfoRow icon="🏘️" label="Commune"  value={order.commune} />}
            {order.address && <InfoRow icon="🏠" label="Adresse"  value={order.address} />}

            {/* Note — éditable en mode édition */}
            {editMode ? (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Note client</div>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  rows={3}
                  placeholder="Note optionnelle du client…"
                  className="admin-input"
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                />
              </div>
            ) : order.note ? (
              <div style={{ marginTop: 4, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, borderLeft: '3px solid #CEA060' }}>
                <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Note client</div>
                <div style={{ fontSize: 13, color: '#6D7175', fontStyle: 'italic' }}>{order.note}</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Récap financier — dynamique en mode édition */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={CARD_TITLE}>💳 Récapitulatif</div>

          {/* Mode livraison — éditable */}
          {editMode && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mode de livraison</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: 'home',   label: '🏠 Domicile', fee: delivery.homeDeliveryFee ?? 0 },
                  { value: 'office', label: '🏢 Bureau',   fee: delivery.officeDeliveryFee ?? 0 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setEditDelivery(opt.value as 'home' | 'office')}
                    style={{
                      padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                      border: editDelivery === opt.value ? '2px solid #4A3DBC' : '1.5px solid #E3E5E7',
                      background: editDelivery === opt.value ? '#F2F0FF' : '#fff',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: editDelivery === opt.value ? '#4A3DBC' : '#1A1A1A', marginBottom: 2 }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: opt.fee === 0 ? '#007A5C' : '#6D7175', fontWeight: 600 }}>
                      {opt.fee === 0 ? 'Gratuit' : fmt(opt.fee)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode livraison actuel (lecture seule) */}
          {!editMode && order.deliveryMode && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6D7175' }}>
              {order.deliveryMode === 'office' ? '🏢 Bureau Yalidine' : '🏠 Livraison domicile'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6D7175' }}>
              <span>Sous-total</span>
              <span>{editMode ? fmt(computedSubtotal()) : fmt(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6D7175' }}>
              <span>Livraison</span>
              <span style={{ color: (editMode ? computedShippingFee() : shippingFee) === 0 ? '#007A5C' : '#1A1A1A', fontWeight: (editMode ? computedShippingFee() : shippingFee) === 0 ? 700 : 400 }}>
                {(editMode ? computedShippingFee() : shippingFee) === 0 ? 'Gratuite' : fmt(editMode ? computedShippingFee() : shippingFee)}
              </span>
            </div>
            <div style={{ height: 1, background: '#F1F1F1', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
              <span style={{ color: '#1A1A1A' }}>Total</span>
              <span style={{ color: '#007A5C' }}>{editMode ? fmt(computedTotal()) : fmt(order.total)}</span>
            </div>
            <div style={{ marginTop: 8, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#B45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>💵</span> Paiement à la livraison (COD)
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={CARD_TITLE}>🛍️ Articles commandés ({editMode ? editItems.length : items.length})</div>

        {/* ── Vue édition ─────────────────────────────────────────────────────── */}
        {editMode ? (
          editItems.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
              Aucun article — la commande sera vide si vous sauvegardez.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {editItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F9FAFB', border: '1px solid #C7D2FE', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EEF2FF', color: '#4A3DBC', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.productName ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#9A9A9A', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {item.colorAr && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>🎨 {item.colorAr}</span>}
                      {item.size && item.size !== 'UNIQUE' && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>📐 {item.size}</span>}
                    </div>
                  </div>
                  {/* Contrôles quantité */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E3E5E7', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                    <button onClick={() => changeQty(idx, -1)} style={{
                      width: 30, height: 30, border: 'none', background: '#F5F5F5',
                      color: '#1A1A1A', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    }}>−</button>
                    <span style={{ padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#1A1A1A', minWidth: 24, textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button onClick={() => changeQty(idx, +1)} style={{
                      width: 30, height: 30, border: 'none', background: '#F5F5F5',
                      color: '#1A1A1A', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    }}>+</button>
                  </div>
                  <div style={{ fontSize: 12, color: '#9A9A9A', flexShrink: 0 }}>{fmt(item.unitPrice)} / u.</div>
                  <div style={{ fontWeight: 800, color: '#007A5C', fontSize: 14, flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                    {fmt(item.unitPrice * item.quantity)}
                  </div>
                  {/* Supprimer */}
                  <button onClick={() => removeItem(idx)} title="Supprimer l'article" style={{
                    width: 28, height: 28, borderRadius: 6, border: '1px solid #FCA5A5',
                    background: '#FEE2E2', color: '#991B1B', fontSize: 14,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── Vue lecture ──────────────────────────────────────────────────── */
          items.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>Aucun article</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => {
                const name      = item.productName ?? (item.product?.nameAr) ?? '—'
                const price     = item.unitPrice ?? item.price ?? 0
                const qty       = item.quantity ?? 1
                const lineTotal = price * qty
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FCE7F3', color: '#E93D91', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9A9A9A', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {item.colorAr && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>🎨 {item.colorAr}</span>}
                        {item.size && item.size !== 'UNIQUE' && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>📐 {item.size}</span>}
                      </div>
                    </div>
                    <div style={{ padding: '4px 12px', borderRadius: 7, background: '#F1F5F9', color: '#6D7175', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      × {qty}
                    </div>
                    <div style={{ fontSize: 12, color: '#9A9A9A', flexShrink: 0 }}>{fmt(price)} / u.</div>
                    <div style={{ fontWeight: 800, color: '#007A5C', fontSize: 14, flexShrink: 0 }}>{fmt(lineTotal)}</div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Changer le statut */}
      <div className="admin-card" style={{ padding: '20px 24px' }}>
        <div style={CARD_TITLE}>⚡ Changer le statut</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUSES.map(s => {
            const isCurrent = s.value === order.status
            return (
              <button
                key={s.value}
                onClick={() => !isCurrent && changeStatus(s.value)}
                disabled={isCurrent || updating}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: isCurrent ? s.bg : '#fff',
                  color: isCurrent ? s.color : '#6D7175',
                  border: `1px solid ${isCurrent ? s.dot + '60' : '#E3E5E7'}`,
                  cursor: isCurrent ? 'default' : 'pointer',
                  opacity: updating && !isCurrent ? 0.5 : 1,
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {isCurrent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />}
                {s.labelFr}{isCurrent && ' (actuel)'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
      <span style={{ flexShrink: 0, opacity: 0.5 }}>{icon}</span>
      <span style={{ color: '#9A9A9A', flexShrink: 0, minWidth: 80 }}>{label}</span>
      <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

const CARD_TITLE: React.CSSProperties = { fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }
