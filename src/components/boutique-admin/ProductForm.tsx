'use client'
/**
 * Formulaire produit — Style WooCommerce
 * Nom en haut, metabox "Données du produit" avec onglets, sidebar droite
 */
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Couleurs disponibles ───────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  { label: 'أبيض — Blanc',              value: 'أبيض' },
  { label: 'أسود — Noir',               value: 'أسود' },
  { label: 'رمادي — Gris',              value: 'رمادي' },
  { label: 'رمادي فاتح — Gris clair',   value: 'رمادي فاتح' },
  { label: 'رمادي غامق — Gris foncé',   value: 'رمادي غامق' },
  { label: 'أبيض مكسور — Blanc cassé',  value: 'أبيض مكسور' },
  { label: 'إيكرو — Ecru',              value: 'إيكرو' },
  { label: 'كريمي — Crème',             value: 'كريمي' },
  { label: 'بشرة — Nude',               value: 'بشرة' },
  { label: 'بيج — Beige',               value: 'بيج' },
  { label: 'جملي — Camel',              value: 'جملي' },
  { label: 'بني — Marron',              value: 'بني' },
  { label: 'شوكولاتة — Chocolat',       value: 'شوكولاتة' },
  { label: 'وردي ناعم — Rose poudré',   value: 'وردي ناعم' },
  { label: 'وردي — Rose',               value: 'وردي' },
  { label: 'وردي فوشيا — Rose fuchsia', value: 'وردي فوشيا' },
  { label: 'فوشيا — Fuchsia',           value: 'فوشيا' },
  { label: 'أحمر — Rouge',              value: 'أحمر' },
  { label: 'عنابي — Bordeaux',          value: 'عنابي' },
  { label: 'مرجاني — Corail',           value: 'مرجاني' },
  { label: 'سلموني — Saumon',           value: 'سلموني' },
  { label: 'برتقالي — Orange',          value: 'برتقالي' },
  { label: 'أصفر — Jaune',              value: 'أصفر' },
  { label: 'خردلي — Moutarde',          value: 'خردلي' },
  { label: 'ذهبي — Or',                 value: 'ذهبي' },
  { label: 'فضي — Argent',              value: 'فضي' },
  { label: 'أخضر فاتح — Vert clair',    value: 'أخضر فاتح' },
  { label: 'أخضر — Vert',               value: 'أخضر' },
  { label: 'أخضر زيتوني — Kaki',        value: 'أخضر زيتوني' },
  { label: 'تركواز — Turquoise',        value: 'تركواز' },
  { label: 'نعناعي — Menthe',           value: 'نعناعي' },
  { label: 'أزرق سماوي — Bleu ciel',    value: 'أزرق سماوي' },
  { label: 'أزرق — Bleu',               value: 'أزرق' },
  { label: 'أزرق ملكي — Bleu roi',      value: 'أزرق ملكي' },
  { label: 'كحلي — Bleu marine',        value: 'كحلي' },
  { label: 'أزرق جينز — Jean',          value: 'أزرق جينز' },
  { label: 'خزامي — Lavande',           value: 'خزامي' },
  { label: 'بنفسجي — Violet',           value: 'بنفسجي' },
  { label: 'بنفسجي غامق — Prune',       value: 'بنفسجي غامق' },
  { label: 'متعدد الألوان — Multicolore', value: 'متعدد الألوان' },
  { label: 'مطبوع — Imprimé',           value: 'مطبوع' },
]

const SIZE_OPTIONS = [
  { label: 'XS  (36-38)', value: 'XS(36-38)' },
  { label: 'S   (38-40)', value: 'S(38-40)' },
  { label: 'M   (40-42)', value: 'M(40-42)' },
  { label: 'L   (42-44)', value: 'L(42-44)' },
  { label: 'XL  (44-46)', value: 'XL(44-46)' },
  { label: 'XXL (46-48)', value: 'XXL(46-48)' },
  { label: 'XXXL (48-50)', value: 'XXXL(48-50)' },
  { label: 'Taille unique', value: 'unique' },
  { label: '34', value: '34' }, { label: '36', value: '36' },
  { label: '38', value: '38' }, { label: '40', value: '40' },
  { label: '42', value: '42' }, { label: '44', value: '44' },
  { label: '46', value: '46' }, { label: '48', value: '48' },
  { label: '50', value: '50' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductTab = 'general' | 'inventory' | 'attributes' | 'variations' | 'advanced'

interface Variation {
  _key: string; id?: string
  colorAr?: string; size?: string
  regularPrice: number; salePrice?: number | ''
  stock: number; inStock: boolean
}

interface UploadedImage {
  _key: string; mediaId?: string; url?: string; file?: File; uploading: boolean
}

interface Category { id: string; nameAr?: string; name?: string }

export interface InitialProduct {
  id: string; nameAr: string; nameFr?: string
  descriptionAr?: string; shortDescriptionAr?: string
  purchaseNote?: string; status: 'published' | 'draft' | 'archived'; sku?: string
  category?: Array<{ id: string } | string>
  variations?: Array<{ id?: string; colorAr?: string; size?: string; regularPrice?: number; salePrice?: number; stock?: number; inStock?: boolean }>
  images?: Array<{ id?: string; image?: { id?: string; url?: string; thumbnailURL?: string } }>
}

function uid() { return Math.random().toString(36).slice(2) }

async function uploadFile(file: File): Promise<{ id: string; url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/media', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Échec upload')
  const data = await res.json()
  return { id: data.doc.id, url: data.doc.url }
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function ProductForm({ productId, initial }: { productId?: string; initial?: InitialProduct }) {
  const router = useRouter()
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef  = useRef<HTMLInputElement>(null)
  const isEdit = !!productId

  // Champs de base
  const [nameAr,    setNameAr]    = useState(initial?.nameAr ?? '')
  const [nameFr,    setNameFr]    = useState(initial?.nameFr ?? '')
  const [desc,      setDesc]      = useState(initial?.descriptionAr ?? '')
  const [shortDesc, setShortDesc] = useState(initial?.shortDescriptionAr ?? '')
  const [purchNote, setPurchNote] = useState(initial?.purchaseNote ?? '')
  const [status,    setStatus]    = useState<'published' | 'draft' | 'archived'>(initial?.status ?? 'draft')
  const [sku,       setSku]       = useState(initial?.sku ?? '')
  const [manageStock, setManageStock] = useState(true)
  const [stockStatus, setStockStatus] = useState<'instock' | 'outofstock' | 'onbackorder'>('instock')

  // Onglet actif
  const [tab, setTab] = useState<ProductTab>('general')

  // Catégories
  const [categories, setCategories]   = useState<Category[]>([])
  const [selCats,    setSelCats]       = useState<string[]>((initial?.category ?? []).map(c => typeof c === 'string' ? c : c.id))
  const [newCatOpen, setNewCatOpen]   = useState(false)
  const [newCatName, setNewCatName]   = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  // Attributs (pour générer les variations)
  const [attrColors, setAttrColors] = useState<string[]>([])
  const [attrSizes,  setAttrSizes]  = useState<string[]>([])

  // Variations
  const [variations, setVariations] = useState<Variation[]>(
    (initial?.variations ?? []).map(v => ({
      _key: uid(), id: v.id,
      colorAr: v.colorAr ?? '', size: v.size ?? '',
      regularPrice: v.regularPrice ?? 0,
      salePrice: v.salePrice ?? '',
      stock: v.stock ?? 0, inStock: v.inStock ?? true,
    }))
  )
  const [expandedVar, setExpandedVar] = useState<string | null>(null)

  // Images — images[0] = image à la une
  const [images, setImages] = useState<UploadedImage[]>(
    (initial?.images ?? []).map(img => ({
      _key: uid(), mediaId: img.image?.id,
      url: img.image?.thumbnailURL ?? img.image?.url,
      uploading: false,
    }))
  )

  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // Charger les catégories
  useEffect(() => {
    fetch('/api/categories?limit=100&sort=nameAr&depth=0')
      .then(r => r.json())
      .then(data => setCategories(data.docs ?? []))
      .catch(() => setCategories([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Déduire les attributs depuis les variations existantes (mode édition)
  useEffect(() => {
    if (initial?.variations?.length) {
      const colors = [...new Set(initial.variations.map(v => v.colorAr).filter(Boolean))] as string[]
      const sizes  = [...new Set(initial.variations.map(v => v.size).filter(Boolean))] as string[]
      setAttrColors(colors)
      setAttrSizes(sizes)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Catégories ───────────────────────────────────────────────────────────────
  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingCat(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameAr: newCatName.trim(), name: newCatName.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const created: Category = data.doc
      setCategories(prev => [...prev, created])
      setSelCats(prev => [...prev, created.id])
      setNewCatName(''); setNewCatOpen(false)
      showToast('Catégorie créée ✓', true)
    } catch { showToast('Erreur création catégorie', false) }
    finally { setCreatingCat(false) }
  }

  // ── Génération variations depuis attributs ────────────────────────────────
  function generateVariations() {
    if (attrColors.length === 0 && attrSizes.length === 0) {
      showToast('Ajoutez des couleurs ou des tailles dans l\'onglet Attributs', false)
      return
    }

    const colors = attrColors.length > 0 ? attrColors : ['']
    const sizes  = attrSizes.length  > 0 ? attrSizes  : ['']

    const generated: Variation[] = []
    for (const color of colors) {
      for (const size of sizes) {
        // Ne pas créer de doublon
        const exists = variations.some(v =>
          (v.colorAr ?? '') === color && (v.size ?? '') === size
        )
        if (!exists) {
          generated.push({ _key: uid(), colorAr: color, size, regularPrice: 0, salePrice: '', stock: 0, inStock: true })
        }
      }
    }

    if (generated.length === 0) {
      showToast('Toutes ces variations existent déjà', false)
      return
    }

    setVariations(prev => [...prev, ...generated])
    showToast(`${generated.length} variation${generated.length > 1 ? 's' : ''} générée${generated.length > 1 ? 's' : ''} ✓`, true)
    setTab('variations')
  }

  function addVariation() {
    setVariations(v => [...v, { _key: uid(), colorAr: '', size: '', regularPrice: 0, salePrice: '', stock: 0, inStock: true }])
  }

  function removeVariation(key: string) { setVariations(v => v.filter(x => x._key !== key)) }

  function updateVariation(key: string, patch: Partial<Variation>) {
    setVariations(v => v.map(x => x._key === key ? { ...x, ...patch } : x))
  }

  // ── Images ────────────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null, featured: boolean) {
    if (!files?.length) return
    const newImgs: UploadedImage[] = Array.from(files).map(f => ({
      _key: uid(), file: f, url: URL.createObjectURL(f), uploading: true,
    }))
    // Image à la une : remplace la première / Galerie : ajoute à la suite
    if (featured) {
      setImages(prev => [newImgs[0], ...prev.slice(1)])
    } else {
      setImages(prev => [...prev, ...newImgs])
    }
    for (const img of newImgs) {
      try {
        const { id, url } = await uploadFile(img.file!)
        setImages(prev => prev.map(x => x._key === img._key ? { ...x, mediaId: id, url, uploading: false, file: undefined } : x))
      } catch {
        setImages(prev => prev.filter(x => x._key !== img._key))
        showToast('Échec upload image', false)
      }
    }
  }

  function removeImage(key: string) { setImages(prev => prev.filter(x => x._key !== key)) }

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  async function handleSave(targetStatus?: 'published' | 'draft') {
    if (!nameAr.trim()) { showToast('Le nom du produit est requis', false); return }
    if (images.some(i => i.uploading)) { showToast('Images en cours d\'upload, patientez…', false); return }
    const finalStatus = targetStatus ?? status
    setSaving(true)
    try {
      const body = {
        nameAr: nameAr.trim(),
        ...(nameFr.trim()    ? { nameFr: nameFr.trim() }              : {}),
        ...(desc.trim()      ? { descriptionAr: desc.trim() }         : {}),
        ...(shortDesc.trim() ? { shortDescriptionAr: shortDesc.trim() } : {}),
        ...(purchNote.trim() ? { purchaseNote: purchNote.trim() }     : {}),
        status: finalStatus,
        sku: sku.trim() || undefined,
        category: selCats,
        variations: variations.map(({ colorAr, size, regularPrice, salePrice, stock, inStock, id }) => ({
          ...(id ? { id } : {}),
          colorAr: colorAr || '', size: size || '',
          regularPrice: Number(regularPrice) || 0,
          ...(salePrice !== '' && salePrice != null ? { salePrice: Number(salePrice) } : {}),
          stock: Number(stock) || 0, inStock,
        })),
        images: images.filter(i => i.mediaId).map(i => ({ image: i.mediaId })),
      }
      const res = await fetch(isEdit ? `/api/products/${productId}` : '/api/products', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        showToast(`Erreur : ${errData?.errors?.[0]?.message ?? errData?.message ?? res.status}`, false)
        return
      }
      setStatus(finalStatus)
      showToast(isEdit ? 'Produit mis à jour ✓' : 'Produit créé ✓', true)
      setTimeout(() => router.push('/boutique-admin/products'), 900)
    } catch { showToast('Erreur réseau', false) }
    finally { setSaving(false) }
  }

  // ── Styles ────────────────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 4,
    border: '1px solid #ddd', background: '#fff', color: '#1A1A1A',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#23282d', marginBottom: 5,
  }
  const metabox: React.CSSProperties = {
    background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, marginBottom: 16,
  }
  const metaboxTitle: React.CSSProperties = {
    padding: '8px 12px', borderBottom: '1px solid #c3c4c7',
    fontSize: 14, fontWeight: 600, color: '#1d2327', background: '#f6f7f7',
  }
  const metaboxBody: React.CSSProperties = { padding: '12px 14px' }
  const wooRow: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8,
    alignItems: 'start', padding: '8px 0', borderBottom: '1px solid #f0f0f1',
  }
  const wooLabel: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#444', paddingTop: 6,
  }

  const TABS: { id: ProductTab; label: string }[] = [
    { id: 'general',    label: 'Général'    },
    { id: 'inventory',  label: 'Inventaire' },
    { id: 'attributes', label: 'Attributs'  },
    { id: 'variations', label: `Variations${variations.length > 0 ? ` (${variations.length})` : ''}` },
    { id: 'advanced',   label: 'Avancé'     },
  ]

  const featuredImage = images[0]
  const galleryImages = images.slice(1)

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 1200 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 4,
          background: toast.ok ? '#d1e7dd' : '#f8d7da', border: `1px solid ${toast.ok ? '#badbcc' : '#f5c2c7'}`,
          color: toast.ok ? '#0f5132' : '#842029', fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb + titre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12, color: '#646970' }}>
        <Link href="/boutique-admin/products" style={{ color: '#2271b1', textDecoration: 'none' }}>Produits</Link>
        <span>›</span>
        <span>{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</span>
      </div>
      <h1 style={{ fontSize: 23, fontWeight: 400, color: '#1d2327', margin: '0 0 16px' }}>
        {isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
      </h1>

      {/* Champ Nom — pleine largeur */}
      <div style={{ ...metabox, marginBottom: 16 }}>
        <div style={metaboxBody}>
          <label style={{ ...label, fontSize: 14, fontWeight: 600 }}>Nom du produit</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)}
            placeholder="مثال: فستان صيفي أنيق" dir="rtl"
            style={{ ...input, fontSize: 22, fontWeight: 500, padding: '11px 14px', borderColor: '#8c8f94' }} />
          <input value={nameFr} onChange={e => setNameFr(e.target.value)}
            placeholder="Nom en français (optionnel)"
            style={{ ...input, marginTop: 8, fontSize: 14 }} />
        </div>
      </div>

      {/* Layout deux colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div>

          {/* ── Données du produit (metabox tabulée WooCommerce) ──────────────── */}
          <div style={metabox}>
            <div style={{ ...metaboxTitle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📦</span> Données du produit —
              <span style={{ fontSize: 12, color: '#646970', fontWeight: 400 }}>Produit variable</span>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '9px 14px', border: 'none', borderRight: '1px solid #c3c4c7',
                    background: tab === t.id ? '#fff' : 'transparent',
                    fontWeight: tab === t.id ? 700 : 400,
                    color: tab === t.id ? '#2271b1' : '#50575e',
                    fontSize: 12, cursor: 'pointer',
                    borderBottom: tab === t.id ? '1px solid #fff' : 'none',
                    marginBottom: tab === t.id ? -1 : 0,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contenu des onglets */}
            <div style={{ padding: '14px 16px', minHeight: 220 }}>

              {/* ── GÉNÉRAL ─────────────────────────────────────────────────── */}
              {tab === 'general' && (
                <div>
                  <p style={{ fontSize: 12, color: '#646970', margin: '0 0 14px', padding: '8px 10px', background: '#f0f6fc', borderLeft: '3px solid #2271b1', borderRadius: 2 }}>
                    Les prix sont gérés <strong>par variation</strong> dans l&apos;onglet Variations. Définissez d&apos;abord vos attributs puis générez les variations.
                  </p>
                  <div style={wooRow}>
                    <span style={wooLabel}>Prix de base</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#646970' }}>Défini par variation</span>
                    </div>
                  </div>
                  <div style={{ ...wooRow, borderBottom: 'none' }}>
                    <span style={wooLabel}>Référence (SKU)</span>
                    <input value={sku} onChange={e => setSku(e.target.value)}
                      placeholder="SHE-001" style={{ ...input, maxWidth: 200, fontFamily: 'monospace' }} />
                  </div>
                </div>
              )}

              {/* ── INVENTAIRE ──────────────────────────────────────────────── */}
              {tab === 'inventory' && (
                <div>
                  <div style={wooRow}>
                    <span style={wooLabel}>UGS (SKU)</span>
                    <input value={sku} onChange={e => setSku(e.target.value)}
                      placeholder="SHE-001" style={{ ...input, maxWidth: 200, fontFamily: 'monospace' }} />
                  </div>
                  <div style={wooRow}>
                    <span style={wooLabel}>Gérer le stock ?</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={manageStock} onChange={e => setManageStock(e.target.checked)}
                        style={{ accentColor: '#2271b1', width: 14, height: 14 }} />
                      Activer la gestion de stock
                    </label>
                  </div>
                  <div style={wooRow}>
                    <span style={wooLabel}>État du stock</span>
                    <select value={stockStatus} onChange={e => setStockStatus(e.target.value as typeof stockStatus)}
                      style={{ ...input, maxWidth: 220 }}>
                      <option value="instock">En stock</option>
                      <option value="outofstock">En rupture de stock</option>
                      <option value="onbackorder">Sur commande</option>
                    </select>
                  </div>
                  <div style={{ ...wooRow, borderBottom: 'none' }}>
                    <span style={wooLabel}>Vente individuelle</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" style={{ accentColor: '#2271b1', width: 14, height: 14 }} />
                      Limiter les achats à 1 article par commande
                    </label>
                  </div>
                </div>
              )}

              {/* ── ATTRIBUTS ───────────────────────────────────────────────── */}
              {tab === 'attributes' && (
                <div>
                  <p style={{ fontSize: 12, color: '#646970', margin: '0 0 14px' }}>
                    Définissez les valeurs de chaque attribut, puis cliquez sur <strong>Générer les variations</strong> dans l&apos;onglet Variations.
                  </p>

                  {/* Attribut Couleur */}
                  <div style={{ border: '1px solid #c3c4c7', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', fontWeight: 600, fontSize: 13, color: '#1d2327' }}>
                      الألوان — Couleurs
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#646970', marginRight: 8 }}>Utilisé pour les variations</span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <label style={{ ...label, fontSize: 12 }}>Valeurs — sélectionnez les couleurs disponibles</label>
                      {/* Tags des couleurs sélectionnées */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 32, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}>
                        {attrColors.map(c => (
                          <span key={c} style={{ background: '#e5f0fa', border: '1px solid #a8c7e8', borderRadius: 3, padding: '3px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span dir="rtl">{c}</span>
                            <button onClick={() => setAttrColors(p => p.filter(x => x !== c))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                          </span>
                        ))}
                        {attrColors.length === 0 && <span style={{ fontSize: 12, color: '#aaa' }}>Aucune couleur — utilisez le menu ci-dessous</span>}
                      </div>
                      <select onChange={e => { if (e.target.value && !attrColors.includes(e.target.value)) { setAttrColors(p => [...p, e.target.value]) } e.target.value = '' }}
                        style={{ ...input, maxWidth: 280 }} defaultValue="">
                        <option value="">Sélectionner une couleur…</option>
                        {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value} disabled={attrColors.includes(c.value)}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Attribut Taille */}
                  <div style={{ border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', fontWeight: 600, fontSize: 13, color: '#1d2327' }}>
                      المقاس — Tailles
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#646970', marginRight: 8 }}>Utilisé pour les variations</span>
                    </div>
                    <div style={{ padding: 12 }}>
                      <label style={{ ...label, fontSize: 12 }}>Valeurs — sélectionnez les tailles disponibles</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 32, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}>
                        {attrSizes.map(s => (
                          <span key={s} style={{ background: '#f0f6e6', border: '1px solid #9dc16a', borderRadius: 3, padding: '3px 8px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {s}
                            <button onClick={() => setAttrSizes(p => p.filter(x => x !== s))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                          </span>
                        ))}
                        {attrSizes.length === 0 && <span style={{ fontSize: 12, color: '#aaa' }}>Aucune taille — utilisez le menu ci-dessous</span>}
                      </div>
                      <select onChange={e => { if (e.target.value && !attrSizes.includes(e.target.value)) { setAttrSizes(p => [...p, e.target.value]) } e.target.value = '' }}
                        style={{ ...input, maxWidth: 280 }} defaultValue="">
                        <option value="">Sélectionner une taille…</option>
                        {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value} disabled={attrSizes.includes(s.value)}>{s.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => { generateVariations() }}
                      style={{ padding: '8px 16px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      Enregistrer les attributs &amp; aller aux Variations ›
                    </button>
                  </div>
                </div>
              )}

              {/* ── VARIATIONS ──────────────────────────────────────────────── */}
              {tab === 'variations' && (
                <div>
                  {/* Barre d'actions */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={generateVariations}
                      style={{ padding: '7px 14px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      ⚡ Générer toutes les variations
                    </button>
                    <button onClick={addVariation}
                      style={{ padding: '7px 14px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, color: '#1d2327', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      + Ajouter une variation
                    </button>
                    <span style={{ fontSize: 12, color: '#646970', marginLeft: 4 }}>
                      {variations.length} variation{variations.length > 1 ? 's' : ''}
                    </span>
                    {variations.length > 0 && (
                      <button onClick={() => { if (confirm('Supprimer toutes les variations ?')) setVariations([]) }}
                        style={{ padding: '5px 12px', background: '#fff', border: '1px solid #c3c4c7', borderRadius: 3, color: '#b32d2e', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
                        Tout supprimer
                      </button>
                    )}
                  </div>

                  {variations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed #c3c4c7', borderRadius: 4, color: '#646970', fontSize: 13 }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>🎨</div>
                      <div>Aucune variation. Définissez des attributs dans l&apos;onglet <strong>Attributs</strong> puis cliquez sur &quot;Générer toutes les variations&quot;.</div>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
                      {/* En-tête tableau */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px 70px 50px 36px', gap: 0, background: '#f6f7f7', padding: '7px 10px', borderBottom: '1px solid #c3c4c7' }}>
                        {['Couleur', 'Taille', 'Prix (DA)', 'Promo (DA)', 'Stock', '✓', ''].map((h, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#646970', textTransform: 'uppercase' }}>{h}</span>
                        ))}
                      </div>
                      {/* Lignes variations */}
                      {variations.map((v, idx) => (
                        <div key={v._key} style={{ borderBottom: idx < variations.length - 1 ? '1px solid #f0f0f1' : 'none', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                          {/* Ligne compacte */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 100px 70px 50px 36px', gap: 0, padding: '6px 10px', alignItems: 'center' }}>
                            <select value={v.colorAr ?? ''} onChange={e => updateVariation(v._key, { colorAr: e.target.value })}
                              style={{ ...input, padding: '5px 6px', fontSize: 12, border: '1px solid #ddd' }}>
                              <option value="">— Couleur</option>
                              {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label.split(' — ')[0]}</option>)}
                            </select>
                            <select value={v.size ?? ''} onChange={e => updateVariation(v._key, { size: e.target.value })}
                              style={{ ...input, padding: '5px 6px', fontSize: 12, border: '1px solid #ddd' }}>
                              <option value="">— Taille</option>
                              {SIZE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <input type="number" min="0" value={v.regularPrice}
                              onChange={e => updateVariation(v._key, { regularPrice: Number(e.target.value) })}
                              style={{ ...input, padding: '5px 7px', fontSize: 12 }} />
                            <input type="number" min="0" value={v.salePrice ?? ''} placeholder="—"
                              onChange={e => updateVariation(v._key, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                              style={{ ...input, padding: '5px 7px', fontSize: 12, color: v.salePrice ? '#e93d91' : undefined }} />
                            <input type="number" min="0" value={v.stock}
                              onChange={e => updateVariation(v._key, { stock: Number(e.target.value) })}
                              style={{ ...input, padding: '5px 7px', fontSize: 12 }} />
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <input type="checkbox" checked={v.inStock}
                                onChange={e => updateVariation(v._key, { inStock: e.target.checked })}
                                title="En stock ?"
                                style={{ accentColor: '#2271b1', width: 15, height: 15, cursor: 'pointer' }} />
                            </div>
                            <button onClick={() => removeVariation(v._key)}
                              style={{ padding: '4px 8px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, color: '#b32d2e', fontSize: 12, cursor: 'pointer' }}>✕</button>
                          </div>

                          {/* Ligne détail étendue (optionnel) */}
                          {expandedVar === v._key && (
                            <div style={{ padding: '8px 12px 12px', background: '#f0f6fc', borderTop: '1px solid #c3c4c7' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                  <label style={{ ...label, fontSize: 11 }}>Prix promo — date début</label>
                                  <input type="date" style={{ ...input }} />
                                </div>
                                <div>
                                  <label style={{ ...label, fontSize: 11 }}>Prix promo — date fin</label>
                                  <input type="date" style={{ ...input }} />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Toggle détail */}
                          <button onClick={() => setExpandedVar(expandedVar === v._key ? null : v._key)}
                            style={{ width: '100%', padding: '3px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#2271b1', textAlign: 'center' }}>
                            {expandedVar === v._key ? '▲ Réduire' : '▼ Dates promo'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── AVANCÉ ──────────────────────────────────────────────────── */}
              {tab === 'advanced' && (
                <div>
                  <div style={wooRow}>
                    <span style={wooLabel}>Note d&apos;achat</span>
                    <textarea value={purchNote} onChange={e => setPurchNote(e.target.value)}
                      placeholder="Message envoyé au client après la commande…"
                      rows={3} style={{ ...input, resize: 'vertical' }} />
                  </div>
                  <div style={{ ...wooRow, borderBottom: 'none' }}>
                    <span style={wooLabel}>Activer les avis</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" style={{ accentColor: '#2271b1', width: 14, height: 14 }} />
                      Autoriser les avis clients
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Description ──────────────────────────────────────────────────── */}
          <div style={metabox}>
            <div style={metaboxTitle}>Description du produit</div>
            <div style={metaboxBody}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="وصف تفصيلي للمنتج بالعربية — الخامة، القصة، التفاصيل…"
                dir="rtl" rows={6}
                style={{ ...input, resize: 'vertical', lineHeight: 1.8 }} />
            </div>
          </div>

          {/* ── Description courte ───────────────────────────────────────────── */}
          <div style={metabox}>
            <div style={metaboxTitle}>Description courte du produit</div>
            <div style={metaboxBody}>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)}
                placeholder="وصف قصير يظهر أسفل عنوان المنتج…"
                dir="rtl" rows={3}
                style={{ ...input, resize: 'vertical', lineHeight: 1.7 }} />
            </div>
          </div>
        </div>

        {/* ── Colonne droite (sidebar) ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Publier */}
          <div style={metabox}>
            <div style={metaboxTitle}>Publier</div>
            <div style={{ ...metaboxBody, padding: '12px 14px 8px' }}>
              {/* Statut */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#1d2327' }}>État :</span>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
                  style={{ ...input, maxWidth: 160, padding: '4px 8px', fontSize: 12 }}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
              {/* Visibilité */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingTop: 6, borderTop: '1px solid #f0f0f1' }}>
                <span style={{ fontSize: 13, color: '#1d2327' }}>Visibilité :</span>
                <span style={{ fontSize: 12, color: '#646970' }}>Public</span>
              </div>
              {/* Boutons */}
              <div style={{ borderTop: '1px solid #f0f0f1', paddingTop: 10, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                <button onClick={() => handleSave('draft')} disabled={saving}
                  style={{ padding: '6px 12px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, color: '#1d2327', cursor: 'pointer' }}>
                  Sauver brouillon
                </button>
                <button onClick={() => handleSave('published')} disabled={saving}
                  style={{ padding: '7px 14px', background: saving ? '#ccc' : '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : status === 'published' ? 'Mettre à jour' : 'Publier'}
                </button>
              </div>
              {/* Lien produit si édition */}
              {isEdit && (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f0f0f1' }}>
                  <a href={`/products/${productId}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: '#2271b1' }}>
                    Voir le produit ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Catégories produit */}
          <div style={metabox}>
            <div style={{ ...metaboxTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Catégories du produit</span>
              <button onClick={() => setNewCatOpen(o => !o)}
                style={{ background: 'none', border: 'none', color: '#2271b1', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                + Ajouter
              </button>
            </div>
            <div style={metaboxBody}>
              {/* Formulaire nouvelle catégorie */}
              {newCatOpen && (
                <div style={{ marginBottom: 10, padding: '10px', background: '#f0f6fc', border: '1px solid #b3d1ea', borderRadius: 3 }}>
                  <label style={{ ...label, fontSize: 12 }}>Nom</label>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    placeholder="Nouvelle catégorie"
                    onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                    style={{ ...input, marginBottom: 7, fontSize: 12 }} autoFocus />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}
                      style={{ flex: 1, padding: '6px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: (!newCatName.trim()) ? 0.5 : 1 }}>
                      {creatingCat ? 'Création…' : 'Ajouter'}
                    </button>
                    <button onClick={() => { setNewCatOpen(false); setNewCatName('') }}
                      style={{ padding: '6px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {/* Liste catégories */}
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categories.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#646970' }}>Aucune catégorie</span>
                ) : categories.map(cat => {
                  const lbl = cat.nameAr ?? cat.name ?? cat.id
                  const checked = selCats.includes(cat.id)
                  return (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
                      <input type="checkbox" checked={checked}
                        onChange={e => setSelCats(p => e.target.checked ? [...p, cat.id] : p.filter(id => id !== cat.id))}
                        style={{ accentColor: '#2271b1', cursor: 'pointer' }} />
                      <span style={{ fontWeight: checked ? 600 : 400, color: checked ? '#1d2327' : '#50575e' }}>{lbl}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Image à la une */}
          <div style={metabox}>
            <div style={metaboxTitle}>Image à la une</div>
            <div style={metaboxBody}>
              <input ref={featuredInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files, true)} />
              {featuredImage ? (
                <div style={{ position: 'relative' }}>
                  <img src={featuredImage.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 3, border: '1px solid #ddd', display: 'block' }} />
                  {featuredImage.uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#444' }}>Envoi…</div>
                  )}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button onClick={() => featuredInputRef.current?.click()}
                      style={{ flex: 1, padding: '6px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer', color: '#2271b1' }}>
                      Modifier
                    </button>
                    <button onClick={() => removeImage(featuredImage._key)}
                      style={{ padding: '6px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer', color: '#b32d2e' }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => featuredInputRef.current?.click()}
                  style={{ width: '100%', padding: '20px', background: '#f6f7f7', border: '2px dashed #c3c4c7', borderRadius: 3, cursor: 'pointer', color: '#2271b1', fontSize: 12 }}>
                  + Définir l&apos;image à la une
                </button>
              )}
            </div>
          </div>

          {/* Galerie produit */}
          <div style={metabox}>
            <div style={metaboxTitle}>Galerie du produit</div>
            <div style={metaboxBody}>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files, false)} />
              {galleryImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {galleryImages.map(img => (
                    <div key={img._key} style={{ position: 'relative', aspectRatio: '1' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3, border: '1px solid #ddd', display: 'block' }} />
                      {img.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>…</div>
                      )}
                      <button onClick={() => removeImage(img._key)}
                        style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => galleryInputRef.current?.click()}
                style={{ width: '100%', padding: '8px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, cursor: 'pointer', color: '#2271b1', fontSize: 12 }}>
                + Ajouter des images à la galerie
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
