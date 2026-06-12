'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useConfUser } from '../../ConfirmatriceUserContext'

interface OrderItem {
  productName?: string
  product?: { nameAr?: string; slug?: string; images?: Array<{ image?: { url?: string } }> }
  variationIndex?: number
  colorAr?: string; size?: string
  quantity?: number; unitPrice?: number; price?: number
}

interface Order {
  id: string; orderNumber: string; customerName: string; phone: string; phone2?: string
  wilaya: string; commune?: string; address?: string; note?: string
  subtotal?: number; shippingFee?: number; total: number
  status: string; createdAt: string; updatedAt: string
  items?: OrderItem[]
  deliveryMode?: string
  yalidineTrackingId?: string
  yalidineLabelUrl?: string
  yalidineStatus?: string
  yalidineSentAt?: string
  lastStatusUpdatedBy?: string
  lastStatusUpdatedAt?: string
}

interface DeliverySettings {
  homeDeliveryFee?: number
  officeDeliveryFee?: number
  freeDeliveryThreshold?: number
}

// Variation d'un produit du catalogue
interface CatalogVariation {
  colorAr?: string; colorFr?: string; size?: string
  regularPrice?: number; salePrice?: number; inStock?: boolean
}
// Produit simplifié du catalogue (pour la recherche)
interface CatalogProduct {
  id: string; nameAr?: string; nameFr?: string
  variations?: CatalogVariation[]
}

interface EditableItem {
  productId?: string
  productName?: string
  colorAr?: string
  size?: string
  quantity: number
  unitPrice: number
  product?: OrderItem['product']
  variationIndex?: number
  availableColors?: string[]
  availableSizes?: { size: string; inStock: boolean }[]
}

const STATUSES = [
  { value: 'new',       labelFr: 'Nouvelle',      color: '#B45309', bg: '#FEF3C7', dot: '#F59E0B' },
  { value: 'pending',   labelFr: 'En attente',     color: '#92400E', bg: '#FEF9C3', dot: '#EAB308' },
  { value: 'confirmed', labelFr: 'Confirmée',      color: '#1D4ED8', bg: '#DBEAFE', dot: '#3B82F6' },
  { value: 'shipping',  labelFr: 'En livraison',   color: '#7C3AED', bg: '#EDE9FE', dot: '#8B5CF6' },
  { value: 'delivered', labelFr: 'Livrée',          color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  { value: 'cancelled', labelFr: 'Annulée',         color: '#991B1B', bg: '#FEE2E2', dot: '#EF4444' },
]
const STATUS_TIMELINE = ['new', 'confirmed', 'shipping', 'delivered']

const fmt     = (n: number) => new Intl.NumberFormat('fr-DZ').format(n) + ' DA'
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtDateShort = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function ConfirmatriceOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const currentUser = useConfUser()

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

  // ── Édition infos client ──────────────────────────────────────────────────────
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editPhone,        setEditPhone]        = useState('')
  const [editPhone2,       setEditPhone2]       = useState('')
  const [editAddress,      setEditAddress]      = useState('')

  // ── Catalogue produits ────────────────────────────────────────────────────────
  const [catalog,        setCatalog]        = useState<CatalogProduct[]>([])
  const [catalogLoaded,  setCatalogLoaded]  = useState(false)
  const [changingProductIdx, setChangingProductIdx] = useState(-1)
  const [productSearch,      setProductSearch]      = useState('')

  // ── État Yalidine ─────────────────────────────────────────────────────────────
  const [yalidineLoading,   setYalidineLoading]   = useState(false)
  const [yalidineEditPrice, setYalidineEditPrice] = useState('')
  const [yalidineEditList,  setYalidineEditList]  = useState('')
  const [yalidineEditMode,  setYalidineEditMode]  = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/boutique-admin/orders/${id}?depth=2`)
      if (res.status === 404) { setNotFound(true); return }
      setOrder(await res.json())
    } catch { setNotFound(true) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const loadDeliverySettings = useCallback(async () => {
    if (loadingDelivery) return
    setLoadingDelivery(true)
    try {
      const res = await fetch('/api/boutique-admin/settings')
      if (res.ok) {
        const data = await res.json()
        setDelivery({
          homeDeliveryFee:   data.delivery?.defaultHomeDeliveryFee,
          officeDeliveryFee: data.delivery?.defaultDeskDeliveryFee,
        })
      }
    } catch { /* silencieux */ }
    finally { setLoadingDelivery(false) }
  }, [loadingDelivery])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  function getOptionsFromProduct(prod: CatalogProduct) {
    const variations = prod.variations ?? []
    const colorsSet = new Set<string>()
    const colors: string[] = []
    for (const v of variations) {
      const c = v.colorAr ?? ''
      if (c && !colorsSet.has(c)) { colorsSet.add(c); colors.push(c) }
    }
    return { availableColors: colors }
  }

  function getSizesForColor(prod: CatalogProduct, colorAr: string) {
    return (prod.variations ?? [])
      .filter(v => (v.colorAr ?? '') === colorAr)
      .filter(v => v.size && v.size !== 'UNIQUE')
      .map(v => ({ size: v.size!, inStock: v.inStock ?? false }))
  }

  function getPriceForVariation(prod: CatalogProduct, colorAr: string, size: string) {
    const v = (prod.variations ?? []).find(v => (v.colorAr ?? '') === colorAr && (v.size ?? '') === size)
      ?? (prod.variations ?? []).find(v => (v.colorAr ?? '') === colorAr)
    if (!v) return 0
    return v.salePrice && v.salePrice > 0 ? v.salePrice : (v.regularPrice ?? 0)
  }

  const enterEditMode = async () => {
    if (!order) return
    setEditNote(order.note ?? '')
    setEditDelivery((order.deliveryMode as 'home' | 'office') ?? 'home')
    setEditCustomerName(order.customerName)
    setEditPhone(order.phone)
    setEditPhone2(order.phone2 ?? '')
    setEditAddress(order.address ?? '')

    let cat = catalog
    if (!catalogLoaded) {
      try {
        const res = await fetch('/api/boutique-admin/products?limit=200&depth=1&sort=nameAr')
        if (res.ok) {
          const data = await res.json()
          cat = data.docs ?? []
          setCatalog(cat)
          setCatalogLoaded(true)
        }
      } catch { /* silencieux */ }
    }

    setEditItems(
      (order.items ?? []).map(item => {
        const productId = typeof item.product === 'object' && item.product
          ? String((item.product as { id?: string | number }).id ?? '')
          : ''
        const catalogProd = cat.find(p => p.id === productId)
        const availableColors = catalogProd ? getOptionsFromProduct(catalogProd).availableColors : []
        const availableSizes  = catalogProd ? getSizesForColor(catalogProd, item.colorAr ?? '') : []
        return {
          productId,
          productName:    item.productName,
          colorAr:        item.colorAr,
          size:           item.size,
          quantity:       item.quantity ?? 1,
          unitPrice:      item.unitPrice ?? item.price ?? 0,
          product:        item.product,
          variationIndex: item.variationIndex,
          availableColors,
          availableSizes,
        }
      })
    )
    loadDeliverySettings()
    setEditMode(true)
  }

  const cancelEdit = () => setEditMode(false)

  const computedShippingFee = (): number => {
    if (editDelivery === 'office') return delivery.officeDeliveryFee ?? 0
    return delivery.homeDeliveryFee ?? 0
  }
  const computedSubtotal = (): number =>
    editItems.reduce((s, item) => s + item.unitPrice * item.quantity, 0)
  const computedTotal = (): number => computedSubtotal() + computedShippingFee()

  const changeQty = (idx: number, delta: number) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, quantity: Math.max(1, item.quantity + delta) }
    }))
  }

  const removeItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx))
    if (changingProductIdx === idx) setChangingProductIdx(-1)
  }

  const selectProductFromCatalog = (prod: CatalogProduct, targetIdx: number) => {
    const { availableColors } = getOptionsFromProduct(prod)
    const firstColor = availableColors[0] ?? ''
    const sizes = getSizesForColor(prod, firstColor)
    const firstSize = sizes.find(s => s.inStock)?.size ?? sizes[0]?.size ?? ''
    const price = getPriceForVariation(prod, firstColor, firstSize)
    const newItem: EditableItem = {
      productId:      prod.id,
      productName:    prod.nameAr ?? prod.nameFr ?? '',
      colorAr:        firstColor,
      size:           firstSize,
      quantity:       1,
      unitPrice:      price,
      availableColors,
      availableSizes: sizes,
    }
    if (targetIdx < editItems.length) {
      setEditItems(prev => prev.map((it, i) => i === targetIdx ? newItem : it))
    } else {
      setEditItems(prev => [...prev, newItem])
    }
    setChangingProductIdx(-1)
    setProductSearch('')
  }

  const handleColorChange = (idx: number, newColor: string) => {
    setEditItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const prod = catalog.find(p => p.id === it.productId)
      const newSizes  = prod ? getSizesForColor(prod, newColor) : []
      const firstSize = newSizes.find(s => s.inStock)?.size ?? newSizes[0]?.size ?? ''
      const newPrice  = prod ? getPriceForVariation(prod, newColor, firstSize) : it.unitPrice
      return { ...it, colorAr: newColor, availableSizes: newSizes, size: firstSize, unitPrice: newPrice > 0 ? newPrice : it.unitPrice }
    }))
  }

  const handleSizeChange = (idx: number, newSize: string) => {
    setEditItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const prod = catalog.find(p => p.id === it.productId)
      const newPrice = prod ? getPriceForVariation(prod, it.colorAr ?? '', newSize) : it.unitPrice
      return { ...it, size: newSize, unitPrice: newPrice > 0 ? newPrice : it.unitPrice }
    }))
  }

  const saveEdit = async () => {
    if (!order) return
    setUpdating(true)
    try {
      const shippingFee = computedShippingFee()
      const subtotal    = computedSubtotal()
      const total       = subtotal + shippingFee

      const body = {
        customerName: editCustomerName.trim(),
        phone:        editPhone.trim(),
        phone2:       editPhone2.trim() || null,
        address:      editAddress.trim(),
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

  const sendToYalidine = async () => {
    if (!order) return
    if (!confirm(`Envoyer la commande ${order.orderNumber} à Yalidine ?`)) return
    setYalidineLoading(true)
    try {
      const res = await fetch(`/api/boutique-admin/orders/${order.id}/send-to-yalidine`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erreur envoi Yalidine', false); return }
      await load()
      showToast(`✓ Colis créé — Tracking : ${data.tracking}`)
    } catch { showToast('Erreur réseau', false) }
    finally { setYalidineLoading(false) }
  }

  const deleteFromYalidine = async () => {
    if (!order) return
    if (!confirm(`Supprimer le colis ${order.yalidineTrackingId} de Yalidine ? (impossible si déjà ramassé)`)) return
    setYalidineLoading(true)
    try {
      const res = await fetch(`/api/boutique-admin/orders/${order.id}/delete-yalidine`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erreur suppression Yalidine', false); return }
      await load()
      showToast('Colis supprimé de Yalidine ✓')
    } catch { showToast('Erreur réseau', false) }
    finally { setYalidineLoading(false) }
  }

  const updateYalidine = async () => {
    if (!order) return
    const bodyData: { price?: number; product_list?: string } = {}
    if (yalidineEditPrice) bodyData.price = parseInt(yalidineEditPrice)
    if (yalidineEditList)  bodyData.product_list = yalidineEditList
    if (Object.keys(bodyData).length === 0) { showToast('Aucune modification', false); return }
    setYalidineLoading(true)
    try {
      const res = await fetch(`/api/boutique-admin/orders/${order.id}/update-yalidine`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Erreur modification Yalidine', false); return }
      await load()
      setYalidineEditMode(false)
      showToast('Colis mis à jour chez Yalidine ✓')
    } catch { showToast('Erreur réseau', false) }
    finally { setYalidineLoading(false) }
  }

  // Changement de statut — enregistre le nom de la confirmatrice
  const changeStatus = async (status: string) => {
    if (!order) return
    setUpdating(true)
    try {
      const updatedBy = currentUser?.firstName || currentUser?.email || 'Confirmatrice'
      const res = await fetch(`/api/boutique-admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          lastStatusUpdatedBy: updatedBy,
          lastStatusUpdatedAt: new Date().toISOString(),
        }),
      })
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
      <Link href="/confirmatrice/orders" className="admin-btn admin-btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
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
        <Link href="/confirmatrice/orders" className="admin-btn admin-btn-secondary" style={{ padding: '7px 14px', textDecoration: 'none', display: 'inline-flex' }}>
          ← Retour
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', fontFamily: 'monospace', margin: 0 }}>
              {order.orderNumber}
            </h1>
            <span className="admin-badge" style={{ background: statusInfo.bg, color: statusInfo.color, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusInfo.dot }} />
              {statusInfo.labelFr}
            </span>

            {/* Carte "Dernière mise à jour par" */}
            {order.lastStatusUpdatedBy && (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E3E5E7',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 14 }}>👤</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#6D7175', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Dernière mise à jour
                  </div>
                  <div style={{ color: '#1A1A1A', fontWeight: 600 }}>
                    {order.lastStatusUpdatedBy}
                    {order.lastStatusUpdatedAt && (
                      <span style={{ color: '#9A9A9A', fontWeight: 400, marginLeft: 6 }}>
                        · {fmtDateShort(order.lastStatusUpdatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#9A9A9A', marginTop: 4 }}>
            Passée le {fmtDate(order.createdAt)}
            {order.updatedAt !== order.createdAt && ` · Mise à jour le ${fmtDate(order.updatedAt)}`}
          </div>
        </div>

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

      {editMode && (
        <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '12px 18px', marginBottom: 16, color: '#4A3DBC', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✏️</span> Mode édition — modifiez le client, les articles, le mode de livraison ou la note, puis cliquez sur « Enregistrer ».
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
                    <div style={{ flex: 1, height: 2, margin: '-14px 4px 14px', background: i < timelineIdx ? '#E3E5E7' : '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
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

        {/* ── Infos client ─────────────────────────────────────────────────────── */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={CARD_TITLE}>👤 Client</div>
          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <EditField label="Nom complet" value={editCustomerName} onChange={setEditCustomerName} />
              <EditField label="Téléphone 1" value={editPhone} onChange={setEditPhone} type="tel" />
              <EditField label="Téléphone 2 (optionnel)" value={editPhone2} onChange={setEditPhone2} type="tel" placeholder="Ajouter un 2ème numéro" />
              <EditField label="Adresse" value={editAddress} onChange={setEditAddress} />
              <div>
                <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Note client</div>
                <textarea
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="Note optionnelle…"
                  className="admin-input"
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon="🙍‍♀️" label="Nom"       value={order.customerName} />
              <InfoRow icon="📱" label="Téléphone" value={<a href={`tel:${order.phone}`} style={{ color: '#E93D91', textDecoration: 'none', fontWeight: 700 }}>{order.phone}</a>} />
              {order.phone2 && <InfoRow icon="📱" label="Tél. 2" value={<a href={`tel:${order.phone2}`} style={{ color: '#E93D91', textDecoration: 'none', fontWeight: 700 }}>{order.phone2}</a>} />}
              <InfoRow icon="📍" label="Wilaya"    value={order.wilaya} />
              {order.commune && <InfoRow icon="🏘️" label="Commune"  value={order.commune} />}
              {order.address && <InfoRow icon="🏠" label="Adresse"  value={order.address} />}
              {order.note ? (
                <div style={{ marginTop: 4, padding: '10px 12px', background: '#FFFBEB', borderRadius: 8, borderLeft: '3px solid #CEA060' }}>
                  <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Note client</div>
                  <div style={{ fontSize: 13, color: '#6D7175', fontStyle: 'italic' }}>{order.note}</div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ── Récap financier ──────────────────────────────────────────────────── */}
        <div className="admin-card" style={{ padding: '20px 24px' }}>
          <div style={CARD_TITLE}>💳 Récapitulatif</div>

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

      {/* ── Articles ─────────────────────────────────────────────────────────── */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={CARD_TITLE}>🛍️ Articles commandés ({editMode ? editItems.length : items.length})</div>

        {editMode ? (
          editItems.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🛒</div>
              Aucun article — la commande sera vide si vous sauvegardez.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {editItems.map((item, idx) => (
                <div key={idx}>
                  <div style={{ background: '#F9FAFB', border: `1px solid ${changingProductIdx === idx ? '#4A3DBC' : '#C7D2FE'}`, borderRadius: 10, padding: '14px 16px' }}>
                    {/* Ligne 1 : nom produit + bouton changer + supprimer */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: '#EEF2FF', color: '#4A3DBC', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.productName || <span style={{ color: '#9A9A9A' }}>Produit non défini</span>}
                      </div>
                      <button
                        onClick={() => {
                          setChangingProductIdx(changingProductIdx === idx ? -1 : idx)
                          setProductSearch('')
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid #C7D2FE',
                          background: changingProductIdx === idx ? '#EEF2FF' : '#fff',
                          color: '#4A3DBC', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        🔄 Changer
                      </button>
                      <button onClick={() => removeItem(idx)} style={{
                        width: 28, height: 28, borderRadius: 6, border: '1px solid #FCA5A5',
                        background: '#FEE2E2', color: '#991B1B', fontSize: 14,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>✕</button>
                    </div>

                    {/* Panneau recherche produit */}
                    {changingProductIdx === idx && (
                      <div style={{ marginBottom: 10, background: '#EEF2FF', borderRadius: 8, padding: '10px 12px' }}>
                        <input
                          autoFocus
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Rechercher un produit…"
                          className="admin-input"
                          style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                        />
                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {catalog
                            .filter(p => {
                              const q = productSearch.toLowerCase()
                              return !q || (p.nameAr ?? '').toLowerCase().includes(q) || (p.nameFr ?? '').toLowerCase().includes(q)
                            })
                            .slice(0, 30)
                            .map(p => (
                              <button
                                key={p.id}
                                onClick={() => selectProductFromCatalog(p, idx)}
                                style={{
                                  textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                                  border: '1px solid #C7D2FE', background: '#fff',
                                  color: '#1A1A1A', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                }}
                              >
                                <span>{p.nameAr ?? p.nameFr ?? '—'}</span>
                                <span style={{ fontSize: 10, color: '#9A9A9A', flexShrink: 0 }}>{p.nameFr ?? ''}</span>
                              </button>
                            ))}
                          {catalog.filter(p => {
                            const q = productSearch.toLowerCase()
                            return !q || (p.nameAr ?? '').toLowerCase().includes(q) || (p.nameFr ?? '').toLowerCase().includes(q)
                          }).length === 0 && (
                            <div style={{ fontSize: 12, color: '#9A9A9A', textAlign: 'center', padding: 8 }}>Aucun produit trouvé</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ligne 2 : couleur + taille + prix + quantité */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.availableColors && item.availableColors.length > 0 ? (
                        <select
                          value={item.colorAr ?? ''}
                          onChange={e => handleColorChange(idx, e.target.value)}
                          className="admin-input"
                          dir="rtl"
                          style={{ width: 140, fontSize: 12 }}
                        >
                          {item.availableColors.map(c => (
                            <option key={c} value={c}>{c || '—'}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={item.colorAr ?? ''}
                          onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, colorAr: e.target.value } : it))}
                          placeholder="🎨 Couleur"
                          className="admin-input"
                          dir="rtl"
                          style={{ width: 130, fontSize: 12 }}
                        />
                      )}

                      {item.availableSizes && item.availableSizes.length > 0 ? (
                        <select
                          value={item.size ?? ''}
                          onChange={e => handleSizeChange(idx, e.target.value)}
                          className="admin-input"
                          style={{ width: 120, fontSize: 12 }}
                        >
                          {item.availableSizes.map(s => (
                            <option key={s.size} value={s.size}>
                              {s.size}{!s.inStock ? ' (épuisé)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={item.size ?? ''}
                          onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, size: e.target.value } : it))}
                          placeholder="📐 Taille"
                          className="admin-input"
                          style={{ width: 100, fontSize: 12 }}
                        />
                      )}

                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                        placeholder="Prix"
                        className="admin-input"
                        style={{ width: 100, fontSize: 12 }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E3E5E7', borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => changeQty(idx, -1)} style={{ width: 30, height: 30, border: 'none', background: '#F5F5F5', color: '#1A1A1A', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>−</button>
                        <span style={{ padding: '0 10px', fontSize: 13, fontWeight: 700, color: '#1A1A1A', minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => changeQty(idx, +1)} style={{ width: 30, height: 30, border: 'none', background: '#F5F5F5', color: '#1A1A1A', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>+</button>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 800, color: '#007A5C', marginLeft: 'auto' }}>{fmt(item.unitPrice * item.quantity)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Ajouter un article */}
              {changingProductIdx === editItems.length ? (
                <div style={{ background: '#EEF2FF', border: '1px solid #4A3DBC', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4A3DBC', marginBottom: 8 }}>➕ Ajouter un article</div>
                  <input
                    autoFocus
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                    className="admin-input"
                    style={{ width: '100%', fontSize: 13, marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {catalog
                      .filter(p => {
                        const q = productSearch.toLowerCase()
                        return !q || (p.nameAr ?? '').toLowerCase().includes(q) || (p.nameFr ?? '').toLowerCase().includes(q)
                      })
                      .slice(0, 30)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectProductFromCatalog(p, editItems.length)}
                          style={{
                            textAlign: 'left', padding: '7px 10px', borderRadius: 6,
                            border: '1px solid #C7D2FE', background: '#fff',
                            color: '#1A1A1A', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                          }}
                        >
                          <span>{p.nameAr ?? p.nameFr ?? '—'}</span>
                          <span style={{ fontSize: 10, color: '#9A9A9A', flexShrink: 0 }}>{p.nameFr ?? ''}</span>
                        </button>
                      ))}
                  </div>
                  <button
                    onClick={() => { setChangingProductIdx(-1); setProductSearch('') }}
                    style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #E3E5E7', background: '#fff', fontSize: 12, cursor: 'pointer', color: '#6D7175' }}
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setChangingProductIdx(editItems.length); setProductSearch('') }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10, border: '2px dashed #C7D2FE',
                    background: '#F8F9FF', color: '#4A3DBC', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  ➕ Ajouter un article
                </button>
              )}
            </div>
          )
        ) : (
          items.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#9A9A9A', fontSize: 13 }}>Aucun article</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => {
                const name  = item.productName ?? (item.product?.nameAr) ?? '—'
                const price = item.unitPrice ?? item.price ?? 0
                const qty   = item.quantity ?? 1
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FCE7F3', color: '#E93D91', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div style={{ fontSize: 11, color: '#9A9A9A', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {item.colorAr && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>🎨 {item.colorAr}</span>}
                        {item.size && item.size !== 'UNIQUE' && <span style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>📐 {item.size}</span>}
                      </div>
                    </div>
                    <div style={{ padding: '4px 12px', borderRadius: 7, background: '#F1F5F9', color: '#6D7175', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>× {qty}</div>
                    <div style={{ fontSize: 12, color: '#9A9A9A', flexShrink: 0 }}>{fmt(price)} / u.</div>
                    <div style={{ fontWeight: 800, color: '#007A5C', fontSize: 14, flexShrink: 0 }}>{fmt(price * qty)}</div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ── Section Yalidine ─────────────────────────────────────────────────── */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={CARD_TITLE}>🚚 Yalidine — Expédition</div>

        {order.yalidineTrackingId ? (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Numéro de suivi</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#065F46', fontFamily: 'monospace' }}>{order.yalidineTrackingId}</div>
              </div>
              {order.yalidineStatus && (
                <div style={{ background: '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Statut Yalidine</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{order.yalidineStatus}</div>
                </div>
              )}
              {order.yalidineSentAt && (
                <div style={{ background: '#F9FAFB', border: '1px solid #E3E5E7', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Envoyé le</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#6D7175' }}>{fmtDate(order.yalidineSentAt)}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              {order.yalidineLabelUrl && (
                <a href={order.yalidineLabelUrl} target="_blank" rel="noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 8, border: '1.5px solid #E3E5E7',
                  background: '#fff', color: '#1A1A1A', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none',
                }}>
                  🖨️ Imprimer le bordereau
                </a>
              )}
              <button
                onClick={deleteFromYalidine}
                disabled={yalidineLoading}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: '1.5px solid #FCA5A5',
                  background: '#FEE2E2', color: '#991B1B', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                  opacity: yalidineLoading ? 0.6 : 1,
                }}
              >
                🗑️ Supprimer de Yalidine
              </button>
            </div>

            {order.yalidineStatus === 'En préparation' && (
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
                {!yalidineEditMode ? (
                  <button
                    onClick={() => {
                      setYalidineEditPrice(String(order.total))
                      setYalidineEditList(
                        (order.items ?? []).map((i: OrderItem) =>
                          `${i.productName ?? 'Article'}${i.size ? ` T${i.size}` : ''}${i.colorAr ? ` (${i.colorAr})` : ''} x${i.quantity ?? 1}`
                        ).join(', ')
                      )
                      setYalidineEditMode(true)
                    }}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: '1.5px solid #F59E0B',
                      background: '#FFFBEB', color: '#B45309', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    ✏️ Modifier le colis chez Yalidine
                  </button>
                ) : (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '16px' }}>
                    <div style={{ fontSize: 12, color: '#B45309', fontWeight: 700, marginBottom: 12 }}>
                      ⚠️ Modification possible uniquement avant le ramassage (&quot;En préparation&quot;)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Montant COD (DZD)</label>
                        <input type="number" value={yalidineEditPrice} onChange={e => setYalidineEditPrice(e.target.value)} className="admin-input" style={{ width: '100%', maxWidth: 200 }} placeholder="Ex: 5800" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Liste des articles</label>
                        <textarea value={yalidineEditList} onChange={e => setYalidineEditList(e.target.value)} rows={2} className="admin-input" style={{ width: '100%', fontFamily: 'inherit', fontSize: 13, resize: 'vertical' }} placeholder="Ex: Robe T42 (Beige) x1" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button onClick={() => setYalidineEditMode(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E3E5E7', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
                        <button onClick={updateYalidine} disabled={yalidineLoading} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#B45309', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: yalidineLoading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {yalidineLoading && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />}
                          💾 Envoyer les modifications
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#6D7175', marginBottom: 14 }}>
              Ce colis n&apos;a pas encore été envoyé à Yalidine. Cliquez sur le bouton pour créer le colis et obtenir le numéro de suivi.
            </p>
            <button
              onClick={sendToYalidine}
              disabled={yalidineLoading}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: yalidineLoading ? '#9A9A9A' : '#4A3DBC',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: yalidineLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
            >
              {yalidineLoading
                ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Envoi en cours…</>
                : <>🚚 Envoyer à Yalidine</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Changer le statut */}
      <div className="admin-card" style={{ padding: '20px 24px' }}>
        <div style={CARD_TITLE}>⚡ Changer le statut</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {STATUSES.filter(s => ['new', 'pending', 'confirmed', 'cancelled'].includes(s.value)).map(s => {
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

function EditField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input"
        style={{ width: '100%', fontSize: 13 }}
      />
    </div>
  )
}

const CARD_TITLE: React.CSSProperties = { fontSize: 10, color: '#9A9A9A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }
