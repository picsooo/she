'use client'
/**
 * Formulaire produit — Identique WooCommerce
 * - Nom pleine largeur
 * - Metabox "Données du produit" : Général | Inventaire | Attributs | Variations | Avancé
 * - Attributs : saisie valeurs séparées par | (pipe), checkboxes Visible + Utilisé pour variations
 * - Variations : dropdown action + Go, lignes collapsibles, champs complets
 * - Sidebar : Publier | Catégories | Image à la une | Galerie
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Listes de référence ────────────────────────────────────────────────────────
const COLOR_SUGGESTIONS = [
  'أبيض','أسود','رمادي','رمادي فاتح','رمادي غامق','أبيض مكسور','إيكرو','كريمي','بشرة',
  'بيج','جملي','بني فاتح','بني','شوكولاتة','وردي ناعم','وردي','وردي فوشيا','فوشيا',
  'أحمر فاتح','أحمر','عنابي','مرجاني','سلموني','برتقالي','أصفر','خردلي','ذهبي','فضي',
  'أخضر فاتح','أخضر','أخضر زيتوني','تركواز','نعناعي','أزرق سماوي','أزرق','أزرق ملكي',
  'كحلي','أزرق جينز','خزامي','بنفسجي','بنفسجي غامق','متعدد الألوان','مطبوع',
]
const SIZE_SUGGESTIONS = [
  'XS(36-38)','S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)','XXXL(48-50)',
  'Taille unique','34','36','38','40','42','44','46','48','50',
]

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductTab = 'general' | 'inventory' | 'attributes' | 'variations' | 'advanced'
type VariationAction = 'generate' | 'add_manual' | 'set_regular' | 'set_sale' | 'toggle_enabled' | 'delete_all'

interface Variation {
  _key: string; id?: string
  colorAr: string; size: string
  regularPrice: number; salePrice?: number | ''
  saleDateFrom?: string; saleDateTo?: string
  stock: number; inStock: boolean
  variationSku?: string; variationDescription?: string
}

interface UploadedImage {
  _key: string; mediaId?: string; url?: string; file?: File; uploading: boolean
}

interface Category { id: string; nameAr?: string; name?: string }

export interface InitialProduct {
  id: string; nameAr: string; nameFr?: string
  descriptionAr?: string; shortDescriptionAr?: string; purchaseNote?: string
  status: 'published' | 'draft' | 'archived'; sku?: string
  category?: Array<{ id: string } | string>
  variations?: Array<{
    id?: string; colorAr?: string; size?: string
    regularPrice?: number; salePrice?: number
    saleDateFrom?: string; saleDateTo?: string
    stock?: number; inStock?: boolean
    variationSku?: string; variationDescription?: string
  }>
  images?: Array<{ id?: string; image?: { id?: string; url?: string; thumbnailURL?: string } }>
}

function uid() { return Math.random().toString(36).slice(2) }

function makeSlug(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
    || String(Date.now())
}

async function uploadFile(file: File): Promise<{ id: string; url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/media', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('Échec upload')
  const data = await res.json()
  return { id: data.doc.id, url: data.doc.url }
}

// Sépare une chaîne "val1 | val2 | val3" en tableau propre
function parsePipe(s: string): string[] {
  return s.split('|').map(v => v.trim()).filter(Boolean)
}

const VARS_PER_PAGE = 10

// ── Composant principal ───────────────────────────────────────────────────────
export default function ProductForm({ productId, initial }: { productId?: string; initial?: InitialProduct }) {
  const router = useRouter()
  const featuredInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef  = useRef<HTMLInputElement>(null)
  const isEdit = !!productId

  // ── Champs principaux ───────────────────────────────────────────────────────
  const [nameAr,    setNameAr]    = useState(initial?.nameAr ?? '')
  const [nameFr,    setNameFr]    = useState(initial?.nameFr ?? '')
  const [desc,      setDesc]      = useState(initial?.descriptionAr ?? '')
  const [shortDesc, setShortDesc] = useState(initial?.shortDescriptionAr ?? '')
  const [purchNote, setPurchNote] = useState(initial?.purchaseNote ?? '')
  const [status,    setStatus]    = useState<'published' | 'draft' | 'archived'>(initial?.status ?? 'draft')
  const [sku,       setSku]       = useState(initial?.sku ?? '')
  const [manageStock, setManageStock] = useState(true)

  // ── Navigation onglets ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<ProductTab>('general')

  // ── Catégories ──────────────────────────────────────────────────────────────
  const [categories,  setCategories]  = useState<Category[]>([])
  const [selCats,     setSelCats]     = useState<string[]>((initial?.category ?? []).map(c => typeof c === 'string' ? c : c.id))
  const [newCatOpen,  setNewCatOpen]  = useState(false)
  const [newCatName,  setNewCatName]  = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  // ── Attributs — valeurs en texte pipe-séparé (style WooCommerce) ────────────
  // colorsRaw = "أحمر | أزرق | أسود" exactement comme WooCommerce
  const [colorsRaw,     setColorsRaw]     = useState<string>('')
  const [sizesRaw,      setSizesRaw]      = useState<string>('')
  const [colorsVisible, setColorsVisible] = useState(true)
  const [sizesVisible,  setSizesVisible]  = useState(true)
  const [attrSaved,     setAttrSaved]     = useState(false) // Attributs sauvegardés ?
  const [showColorSugg, setShowColorSugg] = useState(false)
  const [showSizeSugg,  setShowSizeSugg]  = useState(false)

  // ── Variations ──────────────────────────────────────────────────────────────
  const [variations,   setVariations]   = useState<Variation[]>(
    (initial?.variations ?? []).map(v => ({
      _key: uid(), id: v.id,
      colorAr: v.colorAr ?? '', size: v.size ?? '',
      regularPrice: v.regularPrice ?? 0,
      salePrice: v.salePrice ?? '',
      saleDateFrom: v.saleDateFrom ?? '', saleDateTo: v.saleDateTo ?? '',
      stock: v.stock ?? 0, inStock: v.inStock ?? true,
      variationSku: v.variationSku ?? '', variationDescription: v.variationDescription ?? '',
    }))
  )
  const [expandedVars,  setExpandedVars]  = useState<Set<string>>(new Set())
  const [varAction,     setVarAction]     = useState<VariationAction>('generate')
  const [bulkValue,     setBulkValue]     = useState('')
  const [varPage,       setVarPage]       = useState(1)

  // ── Images ──────────────────────────────────────────────────────────────────
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
    setTimeout(() => setToast(null), 4000)
  }

  // Charger les catégories
  useEffect(() => {
    fetch('/api/categories?limit=100&sort=nameAr&depth=0')
      .then(r => r.json()).then(d => setCategories(d.docs ?? [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // En mode édition : reconstruire colorsRaw / sizesRaw depuis les variations
  useEffect(() => {
    if (initial?.variations?.length) {
      const colors = [...new Set(initial.variations.map(v => v.colorAr).filter(Boolean))]
      const sizes  = [...new Set(initial.variations.map(v => v.size).filter(Boolean))]
      setColorsRaw(colors.join(' | '))
      setSizesRaw(sizes.join(' | '))
      if (colors.length || sizes.length) setAttrSaved(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Catégories ──────────────────────────────────────────────────────────────
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
      setCategories(p => [...p, data.doc])
      setSelCats(p => [...p, data.doc.id])
      setNewCatName(''); setNewCatOpen(false)
      showToast('Catégorie créée ✓', true)
    } catch { showToast('Erreur création catégorie', false) }
    finally { setCreatingCat(false) }
  }

  // ── Enregistrer les attributs (Step 1 WooCommerce) ──────────────────────────
  function saveAttributes() {
    const colors = parsePipe(colorsRaw)
    const sizes  = parsePipe(sizesRaw)
    if (colors.length === 0 && sizes.length === 0) {
      showToast('Saisissez au moins une couleur ou une taille', false)
      return
    }
    setAttrSaved(true)
    showToast(`Attributs enregistrés — ${colors.length} couleur(s), ${sizes.length} taille(s)`, true)
  }

  // ── Générer les variations (Step 2 WooCommerce — "Generate variations") ─────
  function generateVariations() {
    const colors = parsePipe(colorsRaw)
    const sizes  = parsePipe(sizesRaw)

    if (colors.length === 0 && sizes.length === 0) {
      showToast('Enregistrez d\'abord les attributs (onglet Attributs)', false)
      setTab('attributes')
      return
    }

    const colorsList = colors.length > 0 ? colors : ['']
    const sizesList  = sizes.length  > 0 ? sizes  : ['']
    const generated: Variation[] = []

    for (const color of colorsList) {
      for (const size of sizesList) {
        const exists = variations.some(v => v.colorAr === color && v.size === size)
        if (!exists) {
          generated.push({ _key: uid(), colorAr: color, size, regularPrice: 0, salePrice: '', stock: 0, inStock: true })
        }
      }
    }

    if (generated.length === 0) {
      showToast('Toutes ces variations existent déjà', false)
      return
    }
    setVariations(p => [...p, ...generated])
    setVarPage(1)
    showToast(`${generated.length} variation${generated.length > 1 ? 's' : ''} générée${generated.length > 1 ? 's' : ''} ✓`, true)
  }

  // ── Action Go (dropdown variations WooCommerce) ───────────────────────────
  function handleGo() {
    switch (varAction) {
      case 'generate':
        generateVariations()
        break
      case 'add_manual':
        setVariations(p => [...p, { _key: uid(), colorAr: '', size: '', regularPrice: 0, salePrice: '', stock: 0, inStock: true }])
        break
      case 'set_regular': {
        const v = parseFloat(bulkValue)
        if (!isNaN(v)) { setVariations(p => p.map(x => ({ ...x, regularPrice: v }))); setBulkValue('') }
        break
      }
      case 'set_sale': {
        const v = parseFloat(bulkValue)
        if (!isNaN(v)) { setVariations(p => p.map(x => ({ ...x, salePrice: v }))); setBulkValue('') }
        break
      }
      case 'toggle_enabled':
        setVariations(p => p.map(x => ({ ...x, inStock: !x.inStock })))
        break
      case 'delete_all':
        if (confirm('Supprimer TOUTES les variations ?')) { setVariations([]); setExpandedVars(new Set()) }
        break
    }
  }

  // ── Variations CRUD ──────────────────────────────────────────────────────
  const updateVar = useCallback((key: string, patch: Partial<Variation>) => {
    setVariations(p => p.map(v => v._key === key ? { ...v, ...patch } : v))
  }, [])

  function removeVar(key: string) {
    setVariations(p => p.filter(v => v._key !== key))
    setExpandedVars(p => { const s = new Set(p); s.delete(key); return s })
  }

  function toggleExpand(key: string) {
    setExpandedVars(p => { const s = new Set(p); s.has(key) ? s.delete(key) : s.add(key); return s })
  }

  // ── Images ───────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null, featured: boolean) {
    if (!files?.length) return
    const newImgs = Array.from(files).map(f => ({ _key: uid(), file: f, url: URL.createObjectURL(f), uploading: true }))
    if (featured) setImages(p => [newImgs[0], ...p.slice(1)])
    else          setImages(p => [...p, ...newImgs])
    for (const img of newImgs) {
      try {
        const { id, url } = await uploadFile(img.file!)
        setImages(p => p.map(x => x._key === img._key ? { ...x, mediaId: id, url, uploading: false, file: undefined } : x))
      } catch {
        setImages(p => p.filter(x => x._key !== img._key))
        showToast('Échec upload image', false)
      }
    }
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  async function handleSave(targetStatus?: 'published' | 'draft') {
    if (!nameAr.trim()) { showToast('Le nom du produit est requis', false); return }
    if (images.some(i => i.uploading)) { showToast('Images en cours d\'upload, patientez…', false); return }
    const finalStatus = targetStatus ?? status
    setSaving(true)
    try {
      const body = {
        nameAr: nameAr.trim(),
        // Payload valide "required" avant le hook beforeChange → on génère le slug côté client
        ...(!isEdit ? { slug: makeSlug(nameAr.trim() || nameFr.trim() || String(Date.now())) } : {}),
        ...(nameFr.trim()    ? { nameFr: nameFr.trim() }                    : {}),
        ...(desc.trim()      ? { descriptionAr: desc.trim() }               : {}),
        ...(shortDesc.trim() ? { shortDescriptionAr: shortDesc.trim() }     : {}),
        ...(purchNote.trim() ? { purchaseNote: purchNote.trim() }           : {}),
        status: finalStatus, sku: sku.trim() || undefined,
        category: selCats,
        variations: variations.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          colorAr: v.colorAr || '', size: v.size || '',
          regularPrice: Number(v.regularPrice) || 0,
          ...(v.salePrice !== '' && v.salePrice != null ? { salePrice: Number(v.salePrice) } : {}),
          ...(v.saleDateFrom ? { saleDateFrom: v.saleDateFrom } : {}),
          ...(v.saleDateTo   ? { saleDateTo:   v.saleDateTo   } : {}),
          stock: Number(v.stock) || 0, inStock: v.inStock,
          ...(v.variationSku         ? { variationSku: v.variationSku }               : {}),
          ...(v.variationDescription ? { variationDescription: v.variationDescription } : {}),
        })),
        images: images.filter(i => i.mediaId).map(i => ({ image: i.mediaId })),
      }
      // Création → route boutique-admin (overrideAccess, slug auto)
      // Édition  → route boutique-admin/:id (PATCH avec overrideAccess)
      const url = isEdit
        ? `/api/boutique-admin/products/${productId}`
        : '/api/boutique-admin/products'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(`Erreur : ${err?.errors?.[0]?.message ?? err?.message ?? res.status}`, false)
        return
      }
      setStatus(finalStatus)
      showToast(isEdit ? 'Produit mis à jour ✓' : 'Produit créé ✓', true)
      setTimeout(() => router.push('/boutique-admin/products'), 900)
    } catch { showToast('Erreur réseau', false) }
    finally { setSaving(false) }
  }

  // ── Styles (inspiré WooCommerce admin) ────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '6px 8px', border: '1px solid #8c8f94',
    borderRadius: 3, background: '#fff', color: '#1d2327',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#1d2327', marginBottom: 4, display: 'block' }
  const box: React.CSSProperties = { background: '#fff', border: '1px solid #c3c4c7', borderRadius: 3, marginBottom: 16 }
  const boxHead: React.CSSProperties = { padding: '8px 12px', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', fontSize: 14, fontWeight: 600, color: '#1d2327' }
  const boxBody: React.CSSProperties = { padding: '14px' }
  const wooGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, alignItems: 'start', padding: '10px 0', borderBottom: '1px solid #f0f0f1' }
  const wooLbl: React.CSSProperties = { fontSize: 13, color: '#23282d', fontWeight: 600, paddingTop: 4 }
  const hint: React.CSSProperties = { fontSize: 11, color: '#646970', marginTop: 3, lineHeight: 1.4 }

  // Pagination variations
  const totalVarPages = Math.ceil(variations.length / VARS_PER_PAGE)
  const pagedVars     = variations.slice((varPage - 1) * VARS_PER_PAGE, varPage * VARS_PER_PAGE)

  const TABS: { id: ProductTab; label: string }[] = [
    { id: 'general',    label: 'Général'    },
    { id: 'inventory',  label: 'Inventaire' },
    { id: 'attributes', label: 'Attributs'  },
    { id: 'variations', label: `Variations${variations.length > 0 ? ` (${variations.length})` : ''}` },
    { id: 'advanced',   label: 'Avancé'     },
  ]

  const featuredImage = images[0]
  const galleryImages = images.slice(1)

  const ACTIONS: { value: VariationAction; label: string; needsInput?: boolean }[] = [
    { value: 'generate',       label: 'Créer les variations depuis tous les attributs' },
    { value: 'add_manual',     label: 'Ajouter une variation manuellement' },
    { value: 'set_regular',    label: 'Définir les prix réguliers', needsInput: true },
    { value: 'set_sale',       label: 'Définir les prix promo', needsInput: true },
    { value: 'toggle_enabled', label: 'Activer / désactiver toutes les variations' },
    { value: 'delete_all',     label: 'Supprimer toutes les variations' },
  ]

  const needsInput = ACTIONS.find(a => a.value === varAction)?.needsInput

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 1200 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 18px', borderRadius: 3,
          background: toast.ok ? '#d1e7dd' : '#f8d7da', border: `1px solid ${toast.ok ? '#badbcc' : '#f5c2c7'}`,
          color: toast.ok ? '#0f5132' : '#842029', fontWeight: 600, fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 6, fontSize: 12, color: '#646970' }}>
        <Link href="/boutique-admin/products" style={{ color: '#2271b1', textDecoration: 'none' }}>Produits</Link>
        {' › '}
        <span>{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</span>
      </div>
      <h1 style={{ fontSize: 23, fontWeight: 400, color: '#1d2327', margin: '0 0 16px' }}>
        {isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
      </h1>

      {/* Nom du produit — pleine largeur */}
      <div style={{ ...box, marginBottom: 16 }}>
        <div style={boxBody}>
          <label style={{ ...lbl, fontSize: 14 }}>Nom du produit</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)}
            placeholder="مثال: فستان صيفي أنيق" dir="rtl"
            style={{ ...inp, fontSize: 22, fontWeight: 500, padding: '10px 12px', border: '1px solid #8c8f94' }} />
          <input value={nameFr} onChange={e => setNameFr(e.target.value)}
            placeholder="Nom en français (optionnel)"
            style={{ ...inp, marginTop: 8, fontSize: 14 }} />
        </div>
      </div>

      {/* Deux colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* ── Colonne principale ────────────────────────────────────────────── */}
        <div>

          {/* ╔══════════════════════════════════════════════════════════════╗
              ║  METABOX "DONNÉES DU PRODUIT" — style WooCommerce           ║
              ╚══════════════════════════════════════════════════════════════╝ */}
          <div style={box}>
            {/* Type produit */}
            <div style={{ ...boxHead, display: 'flex', alignItems: 'center', gap: 10 }}>
              Données du produit —
              <span style={{ fontWeight: 700, color: '#2271b1', fontSize: 13 }}>Produit variable</span>
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', borderBottom: '1px solid #c3c4c7', background: '#f6f7f7', flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '9px 14px', border: 'none', borderRight: '1px solid #c3c4c7',
                    background: tab === t.id ? '#fff' : 'transparent',
                    fontWeight: tab === t.id ? 700 : 400,
                    color: tab === t.id ? '#2271b1' : '#50575e',
                    fontSize: 12, cursor: 'pointer',
                    borderBottom: tab === t.id ? '2px solid #2271b1' : '2px solid transparent',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '16px', minHeight: 200 }}>

              {/* ── GÉNÉRAL ─────────────────────────────────────────────── */}
              {tab === 'general' && (
                <div>
                  <p style={{ margin: '0 0 14px', padding: '8px 12px', background: '#f0f6fc', borderLeft: '3px solid #2271b1', borderRadius: 2, fontSize: 13, color: '#1d2327' }}>
                    Les prix sont définis <strong>par variation</strong> dans l&apos;onglet <button onClick={() => setTab('variations')} style={{ background: 'none', border: 'none', color: '#2271b1', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: 0 }}>Variations</button>.
                  </p>
                  <div style={wooGrid}>
                    <span style={wooLbl}>SKU global</span>
                    <div>
                      <input value={sku} onChange={e => setSku(e.target.value)}
                        placeholder="Référence produit (optionnel)"
                        style={{ ...inp, maxWidth: 220, fontFamily: 'monospace' }} />
                      <p style={hint}>Identifiant unique pour la gestion des stocks</p>
                    </div>
                  </div>
                  <div style={{ ...wooGrid, borderBottom: 'none' }}>
                    <span style={wooLbl}>Type de produit</span>
                    <span style={{ fontSize: 13, color: '#646970' }}>Produit variable (couleur × taille)</span>
                  </div>
                </div>
              )}

              {/* ── INVENTAIRE ──────────────────────────────────────────── */}
              {tab === 'inventory' && (
                <div>
                  <div style={wooGrid}>
                    <span style={wooLbl}>UGS (SKU)</span>
                    <div>
                      <input value={sku} onChange={e => setSku(e.target.value)}
                        placeholder="SHE-001" style={{ ...inp, maxWidth: 220, fontFamily: 'monospace' }} />
                      <p style={hint}>Référence unique du produit</p>
                    </div>
                  </div>
                  <div style={wooGrid}>
                    <span style={wooLbl}>Gérer le stock ?</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={manageStock} onChange={e => setManageStock(e.target.checked)}
                        style={{ accentColor: '#2271b1', width: 15, height: 15 }} />
                      Activer la gestion des stocks pour ce produit
                    </label>
                  </div>
                  {manageStock && (
                    <div style={{ ...wooGrid, borderBottom: 'none' }}>
                      <span style={wooLbl}>État du stock</span>
                      <div>
                        <select style={{ ...inp, maxWidth: 220 }}>
                          <option value="instock">En stock</option>
                          <option value="outofstock">En rupture de stock</option>
                          <option value="onbackorder">Sur commande</option>
                        </select>
                        <p style={hint}>Stock géré par variation dans l&apos;onglet Variations</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── ATTRIBUTS ───────────────────────────────────────────── */}
              {tab === 'attributes' && (
                <div>
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: '#646970' }}>
                    Saisissez les valeurs de chaque attribut séparées par <code style={{ background: '#f0f0f1', padding: '1px 5px', borderRadius: 3 }}>|</code> (barre verticale).
                    Cochez <strong>Utilisé pour les variations</strong> puis cliquez sur <strong>Enregistrer les attributs</strong>.
                  </p>

                  {/* Tableau attributs */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f6f7f7' }}>
                        {['Nom', 'Valeurs', 'Visible', 'Pour variations'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#50575e', borderBottom: '1px solid #c3c4c7', borderRight: '1px solid #e5e5e5' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Attribut Couleurs */}
                      <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
                        <td style={{ padding: '10px', borderRight: '1px solid #e5e5e5', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 13 }}>
                          الألوان<br /><span style={{ fontSize: 11, fontWeight: 400, color: '#646970' }}>Couleurs</span>
                        </td>
                        <td style={{ padding: '10px', borderRight: '1px solid #e5e5e5' }}>
                          <textarea
                            value={colorsRaw}
                            onChange={e => setColorsRaw(e.target.value)}
                            placeholder="أحمر | أزرق | أسود | وردي"
                            dir="rtl"
                            rows={3}
                            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                          />
                          <p style={hint}>Séparez chaque valeur avec | (ex: أحمر | أزرق | أسود)</p>
                          {/* Suggestions couleurs */}
                          <button onClick={() => setShowColorSugg(s => !s)}
                            style={{ marginTop: 6, background: 'none', border: 'none', color: '#2271b1', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                            {showColorSugg ? '▲ Masquer les suggestions' : '▼ Sélectionner des valeurs prédéfinies'}
                          </button>
                          {showColorSugg && (
                            <div style={{ marginTop: 6, padding: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 3, maxHeight: 180, overflowY: 'auto' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {COLOR_SUGGESTIONS.map(c => {
                                  const already = parsePipe(colorsRaw).includes(c)
                                  return (
                                    <button key={c} disabled={already}
                                      onClick={() => { const curr = parsePipe(colorsRaw); if (!curr.includes(c)) { setColorsRaw(curr.length ? curr.join(' | ') + ' | ' + c : c) } }}
                                      style={{ padding: '3px 8px', fontSize: 11, borderRadius: 3, cursor: already ? 'default' : 'pointer', border: '1px solid', borderColor: already ? '#ddd' : '#2271b1', background: already ? '#f0f0f0' : '#e5f0fa', color: already ? '#aaa' : '#2271b1', fontFamily: 'inherit' }}>
                                      {c}{already ? ' ✓' : ''}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #e5e5e5' }}>
                          <input type="checkbox" checked={colorsVisible} onChange={e => setColorsVisible(e.target.checked)}
                            style={{ accentColor: '#2271b1', width: 15, height: 15, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input type="checkbox" checked={true} readOnly
                            style={{ accentColor: '#2271b1', width: 15, height: 15, cursor: 'default' }} title="Toujours utilisé pour les variations" />
                        </td>
                      </tr>

                      {/* Attribut Tailles */}
                      <tr>
                        <td style={{ padding: '10px', borderRight: '1px solid #e5e5e5', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 13 }}>
                          المقاس<br /><span style={{ fontSize: 11, fontWeight: 400, color: '#646970' }}>Tailles</span>
                        </td>
                        <td style={{ padding: '10px', borderRight: '1px solid #e5e5e5' }}>
                          <textarea
                            value={sizesRaw}
                            onChange={e => setSizesRaw(e.target.value)}
                            placeholder="S(38-40) | M(40-42) | L(42-44) | XL(44-46)"
                            rows={2}
                            style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                          />
                          <p style={hint}>Séparez chaque taille avec | (ex: S(38-40) | M(40-42) | L(42-44))</p>
                          {/* Suggestions tailles */}
                          <button onClick={() => setShowSizeSugg(s => !s)}
                            style={{ marginTop: 6, background: 'none', border: 'none', color: '#2271b1', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                            {showSizeSugg ? '▲ Masquer les suggestions' : '▼ Sélectionner des valeurs prédéfinies'}
                          </button>
                          {showSizeSugg && (
                            <div style={{ marginTop: 6, padding: '8px', background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: 3 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {SIZE_SUGGESTIONS.map(s => {
                                  const already = parsePipe(sizesRaw).includes(s)
                                  return (
                                    <button key={s} disabled={already}
                                      onClick={() => { const curr = parsePipe(sizesRaw); if (!curr.includes(s)) { setSizesRaw(curr.length ? curr.join(' | ') + ' | ' + s : s) } }}
                                      style={{ padding: '3px 8px', fontSize: 11, borderRadius: 3, cursor: already ? 'default' : 'pointer', border: '1px solid', borderColor: already ? '#ddd' : '#2271b1', background: already ? '#f0f0f0' : '#e5f0fa', color: already ? '#aaa' : '#2271b1', fontFamily: 'inherit' }}>
                                      {s}{already ? ' ✓' : ''}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', borderRight: '1px solid #e5e5e5' }}>
                          <input type="checkbox" checked={sizesVisible} onChange={e => setSizesVisible(e.target.checked)}
                            style={{ accentColor: '#2271b1', width: 15, height: 15, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <input type="checkbox" checked={true} readOnly
                            style={{ accentColor: '#2271b1', width: 15, height: 15, cursor: 'default' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Bouton Enregistrer les attributs */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={saveAttributes}
                      style={{ padding: '8px 16px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      Enregistrer les attributs
                    </button>
                  </div>

                  {attrSaved && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#d1e7dd', border: '1px solid #badbcc', borderRadius: 3, fontSize: 12, color: '#0f5132' }}>
                      ✓ Attributs enregistrés. Allez dans l&apos;onglet <button onClick={() => setTab('variations')} style={{ background: 'none', border: 'none', color: '#0f5132', fontWeight: 700, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 }}>Variations</button> pour générer les combinaisons.
                    </div>
                  )}
                </div>
              )}

              {/* ── VARIATIONS ──────────────────────────────────────────── */}
              {tab === 'variations' && (
                <div>
                  {/* ── Barre d'actions WooCommerce (dropdown + Go) ─────── */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start', flexWrap: 'wrap', background: '#f6f7f7', padding: '10px 12px', border: '1px solid #c3c4c7', borderRadius: 3 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <select value={varAction} onChange={e => setVarAction(e.target.value as VariationAction)}
                        style={{ ...inp, fontSize: 13 }}>
                        {ACTIONS.map(a => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                    {needsInput && (
                      <input type="number" min="0" placeholder="Montant (DA)" value={bulkValue}
                        onChange={e => setBulkValue(e.target.value)}
                        style={{ ...inp, maxWidth: 150 }} />
                    )}
                    <button onClick={handleGo}
                      style={{ padding: '7px 18px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      OK
                    </button>
                  </div>

                  {variations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed #c3c4c7', borderRadius: 3, color: '#646970', fontSize: 13 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🎨</div>
                      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Aucune variation</p>
                      <p style={{ margin: 0 }}>
                        Définissez les attributs (onglet <button onClick={() => setTab('attributes')} style={{ background: 'none', border: 'none', color: '#2271b1', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', fontSize: 13, padding: 0 }}>Attributs</button>) puis choisissez &quot;Créer les variations depuis tous les attributs&quot; ci-dessus.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Variation rows */}
                      <div style={{ border: '1px solid #c3c4c7', borderRadius: 3, overflow: 'hidden' }}>
                        {pagedVars.map((v, idx) => {
                          const isOpen = expandedVars.has(v._key)
                          const label  = [v.colorAr, v.size].filter(Boolean).join(' / ') || `Variation ${(varPage - 1) * VARS_PER_PAGE + idx + 1}`
                          const hasPrice = v.regularPrice > 0
                          return (
                            <div key={v._key} style={{ borderBottom: idx < pagedVars.length - 1 ? '1px solid #e5e5e5' : 'none' }}>
                              {/* ─── En-tête variation (collapsed) ─────────── */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: isOpen ? '#f0f6fc' : idx % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                                onClick={() => toggleExpand(v._key)}>
                                {/* Indicateur ouvert/fermé */}
                                <span style={{ fontSize: 12, color: '#646970', width: 14, flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
                                {/* Miniature placeholder */}
                                <div style={{ width: 30, height: 30, borderRadius: 3, background: '#f0f0f0', border: '1px solid #ddd', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa' }}>IMG</div>
                                {/* Label attributs */}
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1d2327' }}>{label}</span>
                                {/* Prix */}
                                {hasPrice && (
                                  <span style={{ fontSize: 12, color: v.salePrice ? '#e93d91' : '#646970', marginRight: 8 }}>
                                    {v.salePrice ? <><s style={{ color: '#aaa' }}>{v.regularPrice} DA</s> {v.salePrice} DA</> : `${v.regularPrice} DA`}
                                  </span>
                                )}
                                {!hasPrice && <span style={{ fontSize: 11, color: '#b32d2e', marginRight: 8 }}>⚠ Prix manquant</span>}
                                {/* Enabled toggle */}
                                <label onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                                  <input type="checkbox" checked={v.inStock} onChange={e => updateVar(v._key, { inStock: e.target.checked })}
                                    style={{ accentColor: '#2271b1', width: 13, height: 13 }} />
                                  <span style={{ color: v.inStock ? '#0f5132' : '#646970' }}>Activée</span>
                                </label>
                                {/* Supprimer */}
                                <button onClick={e => { e.stopPropagation(); removeVar(v._key) }}
                                  style={{ padding: '3px 8px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, color: '#b32d2e', fontSize: 12, cursor: 'pointer' }}>✕</button>
                              </div>

                              {/* ─── Contenu étendu WooCommerce ─────────── */}
                              {isOpen && (
                                <div style={{ padding: '14px 16px', borderTop: '1px solid #c3c4c7', background: '#fff' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16 }}>
                                    {/* Image variation */}
                                    <div>
                                      <label style={{ ...lbl, fontSize: 11 }}>Image</label>
                                      <div style={{ width: 70, height: 70, border: '1px solid #ddd', borderRadius: 3, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10, color: '#aaa', textAlign: 'center' }}>
                                        + Photo
                                      </div>
                                    </div>

                                    {/* Champs principaux */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                      {/* Couleur */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>الألوان — Couleur</label>
                                        <select value={v.colorAr} onChange={e => updateVar(v._key, { colorAr: e.target.value })}
                                          style={{ ...inp, fontSize: 12 }}>
                                          <option value="">— Aucune —</option>
                                          {parsePipe(colorsRaw).map(c => <option key={c} value={c}>{c}</option>)}
                                          {/* Aussi permettre toutes les couleurs si pas dans les attrs */}
                                          {!parsePipe(colorsRaw).includes(v.colorAr) && v.colorAr && (
                                            <option value={v.colorAr}>{v.colorAr}</option>
                                          )}
                                        </select>
                                      </div>
                                      {/* Taille */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>المقاس — Taille</label>
                                        <select value={v.size} onChange={e => updateVar(v._key, { size: e.target.value })}
                                          style={{ ...inp, fontSize: 12 }}>
                                          <option value="">— Aucune —</option>
                                          {parsePipe(sizesRaw).map(s => <option key={s} value={s}>{s}</option>)}
                                          {!parsePipe(sizesRaw).includes(v.size) && v.size && (
                                            <option value={v.size}>{v.size}</option>
                                          )}
                                        </select>
                                      </div>
                                      {/* SKU variation */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>UGS (SKU)</label>
                                        <input value={v.variationSku ?? ''} onChange={e => updateVar(v._key, { variationSku: e.target.value })}
                                          placeholder="Ex: SHE-001-R-M" style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }} />
                                        <p style={hint}>Facultatif. Par défaut identique au produit parent</p>
                                      </div>
                                      {/* Stock */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>Quantité en stock</label>
                                        <input type="number" min="0" value={v.stock} onChange={e => updateVar(v._key, { stock: Number(e.target.value) })}
                                          style={{ ...inp, fontSize: 12 }} />
                                      </div>
                                      {/* Prix régulier */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>Prix régulier (DA) <span style={{ color: '#b32d2e' }}>*</span></label>
                                        <input type="number" min="0" value={v.regularPrice || ''} onChange={e => updateVar(v._key, { regularPrice: Number(e.target.value) })}
                                          placeholder="0"
                                          style={{ ...inp, fontSize: 12, borderColor: !v.regularPrice ? '#b32d2e' : '#8c8f94' }} />
                                      </div>
                                      {/* Prix promo */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>Prix promo (DA)</label>
                                        <input type="number" min="0" value={v.salePrice ?? ''} onChange={e => updateVar(v._key, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                                          placeholder="Laisser vide si pas de promo"
                                          style={{ ...inp, fontSize: 12, color: v.salePrice ? '#e93d91' : undefined }} />
                                      </div>
                                      {/* Dates promo */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>Promo — date de début</label>
                                        <input type="date" value={v.saleDateFrom ?? ''} onChange={e => updateVar(v._key, { saleDateFrom: e.target.value })}
                                          style={{ ...inp, fontSize: 12 }} />
                                      </div>
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>Promo — date de fin</label>
                                        <input type="date" value={v.saleDateTo ?? ''} onChange={e => updateVar(v._key, { saleDateTo: e.target.value })}
                                          style={{ ...inp, fontSize: 12 }} />
                                      </div>
                                      {/* État stock */}
                                      <div>
                                        <label style={{ ...lbl, fontSize: 12 }}>État du stock</label>
                                        <select value={v.inStock ? 'instock' : 'outofstock'}
                                          onChange={e => updateVar(v._key, { inStock: e.target.value === 'instock', stock: e.target.value === 'outofstock' ? 0 : v.stock })}
                                          style={{ ...inp, fontSize: 12 }}>
                                          <option value="instock">En stock</option>
                                          <option value="outofstock">En rupture de stock</option>
                                        </select>
                                      </div>
                                      {/* Description variation */}
                                      <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ ...lbl, fontSize: 12 }}>Description de la variation</label>
                                        <textarea value={v.variationDescription ?? ''} onChange={e => updateVar(v._key, { variationDescription: e.target.value })}
                                          rows={2} placeholder="Description spécifique à cette variation (optionnel)"
                                          dir="rtl" style={{ ...inp, resize: 'vertical', lineHeight: 1.6, fontSize: 12 }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Pagination */}
                      {totalVarPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                          <button disabled={varPage === 1} onClick={() => setVarPage(p => p - 1)}
                            style={{ padding: '4px 10px', border: '1px solid #c3c4c7', borderRadius: 3, background: varPage === 1 ? '#f0f0f0' : '#fff', cursor: varPage === 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}>‹</button>
                          <span style={{ fontSize: 12, color: '#50575e' }}>Page {varPage} / {totalVarPages} — {variations.length} variation{variations.length > 1 ? 's' : ''}</span>
                          <button disabled={varPage === totalVarPages} onClick={() => setVarPage(p => p + 1)}
                            style={{ padding: '4px 10px', border: '1px solid #c3c4c7', borderRadius: 3, background: varPage === totalVarPages ? '#f0f0f0' : '#fff', cursor: varPage === totalVarPages ? 'not-allowed' : 'pointer', fontSize: 12 }}>›</button>
                        </div>
                      )}

                      {/* Bouton Enregistrer les modifications */}
                      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleSave()}
                          style={{ padding: '8px 18px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                          Enregistrer les modifications
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── AVANCÉ ──────────────────────────────────────────────── */}
              {tab === 'advanced' && (
                <div>
                  <div style={wooGrid}>
                    <span style={wooLbl}>Note d&apos;achat</span>
                    <div>
                      <textarea value={purchNote} onChange={e => setPurchNote(e.target.value)}
                        rows={3} placeholder="Message envoyé au client après achat (optionnel)"
                        style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                      <p style={hint}>Ce message sera inclus dans l&apos;e-mail de confirmation</p>
                    </div>
                  </div>
                  <div style={{ ...wooGrid, borderBottom: 'none' }}>
                    <span style={wooLbl}>Activer les avis</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" style={{ accentColor: '#2271b1', width: 15, height: 15 }} />
                      Autoriser les avis clients sur ce produit
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Description ──────────────────────────────────────────────── */}
          <div style={box}>
            <div style={boxHead}>Description du produit</div>
            <div style={boxBody}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="وصف تفصيلي للمنتج بالعربية…" dir="rtl" rows={6}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.8 }} />
            </div>
          </div>

          {/* ── Description courte ───────────────────────────────────────── */}
          <div style={box}>
            <div style={boxHead}>Description courte du produit</div>
            <div style={boxBody}>
              <textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)}
                placeholder="وصف قصير يظهر أسفل عنوان المنتج…" dir="rtl" rows={3}
                style={{ ...inp, resize: 'vertical', lineHeight: 1.7 }} />
            </div>
          </div>
        </div>

        {/* ── SIDEBAR DROITE ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Publier */}
          <div style={box}>
            <div style={boxHead}>Publier</div>
            <div style={{ ...boxBody, padding: '10px 14px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#1d2327' }}>État :</span>
                <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
                  style={{ ...inp, maxWidth: 160, padding: '4px 6px', fontSize: 12 }}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingTop: 6, borderTop: '1px solid #f0f0f1' }}>
                <span style={{ fontSize: 13, color: '#1d2327' }}>Visibilité :</span>
                <span style={{ fontSize: 12, color: '#646970' }}>Public</span>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', borderTop: '1px solid #f0f0f1', paddingTop: 10 }}>
                <button onClick={() => handleSave('draft')} disabled={saving}
                  style={{ padding: '6px 12px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, color: '#1d2327', cursor: 'pointer' }}>
                  Sauver brouillon
                </button>
                <button onClick={() => handleSave('published')} disabled={saving}
                  style={{ padding: '7px 14px', background: saving ? '#ccc' : '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : status === 'published' ? 'Mettre à jour' : 'Publier'}
                </button>
              </div>
              {isEdit && (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f0f0f1' }}>
                  <a href={`/products/${productId}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2271b1' }}>Aperçu ↗</a>
                </div>
              )}
            </div>
          </div>

          {/* Catégories */}
          <div style={box}>
            <div style={{ ...boxHead, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Catégories du produit</span>
              <button onClick={() => setNewCatOpen(o => !o)}
                style={{ background: 'none', border: 'none', color: '#2271b1', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                + Ajouter une catégorie
              </button>
            </div>
            <div style={boxBody}>
              {newCatOpen && (
                <div style={{ marginBottom: 10, padding: '10px', background: '#f0f6fc', border: '1px solid #b3d1ea', borderRadius: 3 }}>
                  <label style={{ ...lbl, fontSize: 12 }}>Nouveau nom</label>
                  <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                    style={{ ...inp, marginBottom: 7, fontSize: 12 }} autoFocus />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}
                      style={{ flex: 1, padding: '6px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: !newCatName.trim() ? 0.5 : 1 }}>
                      {creatingCat ? '…' : 'Ajouter'}
                    </button>
                    <button onClick={() => { setNewCatOpen(false); setNewCatName('') }}
                      style={{ padding: '6px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {categories.map(cat => {
                  const lbl2 = cat.nameAr ?? cat.name ?? cat.id
                  const checked = selCats.includes(cat.id)
                  return (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
                      <input type="checkbox" checked={checked}
                        onChange={e => setSelCats(p => e.target.checked ? [...p, cat.id] : p.filter(id => id !== cat.id))}
                        style={{ accentColor: '#2271b1', cursor: 'pointer' }} />
                      <span style={{ fontWeight: checked ? 600 : 400 }}>{lbl2}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Image à la une */}
          <div style={box}>
            <div style={boxHead}>Image à la une</div>
            <div style={boxBody}>
              <input ref={featuredInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files, true)} />
              {featuredImage ? (
                <div>
                  <img src={featuredImage.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 3, border: '1px solid #ddd', display: 'block' }} />
                  {featuredImage.uploading && <div style={{ textAlign: 'center', fontSize: 12, color: '#646970', marginTop: 4 }}>Envoi en cours…</div>}
                  <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                    <button onClick={() => featuredInputRef.current?.click()}
                      style={{ flex: 1, padding: '5px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer', color: '#2271b1' }}>Modifier</button>
                    <button onClick={() => setImages(p => p.slice(1))}
                      style={{ padding: '5px 8px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer', color: '#b32d2e' }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => featuredInputRef.current?.click()}
                  style={{ width: '100%', padding: '20px', background: '#f6f7f7', border: '2px dashed #c3c4c7', borderRadius: 3, cursor: 'pointer', color: '#2271b1', fontSize: 12 }}>
                  Définir l&apos;image à la une
                </button>
              )}
            </div>
          </div>

          {/* Galerie produit */}
          <div style={box}>
            <div style={boxHead}>Galerie du produit</div>
            <div style={boxBody}>
              <input ref={galleryInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files, false)} />
              {galleryImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 8 }}>
                  {galleryImages.map(img => (
                    <div key={img._key} style={{ position: 'relative', aspectRatio: '1' }}>
                      <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 3, border: '1px solid #ddd', display: 'block' }} />
                      <button onClick={() => setImages(p => p.filter(x => x._key !== img._key))}
                        style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => galleryInputRef.current?.click()}
                style={{ width: '100%', padding: '7px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, cursor: 'pointer', color: '#2271b1', fontSize: 12 }}>
                + Ajouter des images à la galerie
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
