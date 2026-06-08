'use client'
/**
 * Formulaire produit premium — She's Fit & Beauty Admin
 * Créer ET modifier un produit via l'API REST Payload.
 */
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ── Options couleurs (liste complète) ─────────────────────────────────────────
const COLOR_OPTIONS = [
  // Basiques
  { label: 'أبيض — Blanc',              value: 'أبيض' },
  { label: 'أسود — Noir',               value: 'أسود' },
  { label: 'رمادي — Gris',              value: 'رمادي' },
  { label: 'رمادي فاتح — Gris clair',   value: 'رمادي فاتح' },
  { label: 'رمادي غامق — Gris foncé',   value: 'رمادي غامق' },
  { label: 'رمادي ثلجي — Gris perle',   value: 'رمادي ثلجي' },
  // Blancs & crèmes
  { label: 'أبيض مكسور — Blanc cassé',  value: 'أبيض مكسور' },
  { label: 'إيكرو — Ecru',              value: 'إيكرو' },
  { label: 'كريمي — Crème',             value: 'كريمي' },
  { label: 'بشرة — Nude',               value: 'بشرة' },
  // Beige & brun
  { label: 'بيج — Beige',               value: 'بيج' },
  { label: 'بيج فاتح — Beige clair',    value: 'بيج فاتح' },
  { label: 'توب — Taupe',               value: 'توب' },
  { label: 'جملي — Camel',              value: 'جملي' },
  { label: 'بني فاتح — Marron clair',   value: 'بني فاتح' },
  { label: 'بني — Marron',              value: 'بني' },
  { label: 'بني غامق — Marron foncé',   value: 'بني غامق' },
  { label: 'شوكولاتة — Chocolat',       value: 'شوكولاتة' },
  // Roses
  { label: 'وردي ناعم — Rose poudré',   value: 'وردي ناعم' },
  { label: 'وردي — Rose',               value: 'وردي' },
  { label: 'وردي فاتح — Rose clair',    value: 'وردي فاتح' },
  { label: 'وردي فوشيا — Rose fuchsia', value: 'وردي فوشيا' },
  { label: 'فوشيا — Fuchsia',           value: 'فوشيا' },
  { label: 'وردي صارخ — Rose vif',      value: 'وردي صارخ' },
  // Rouges
  { label: 'أحمر فاتح — Rouge clair',   value: 'أحمر فاتح' },
  { label: 'أحمر — Rouge',              value: 'أحمر' },
  { label: 'أحمر غامق — Rouge foncé',   value: 'أحمر غامق' },
  { label: 'عنابي — Bordeaux',          value: 'عنابي' },
  { label: 'كرزي — Cerise',             value: 'كرزي' },
  { label: 'مرجاني — Corail',           value: 'مرجاني' },
  { label: 'سلموني — Saumon',           value: 'سلموني' },
  // Oranges & jaunes
  { label: 'برتقالي — Orange',          value: 'برتقالي' },
  { label: 'برتقالي فاتح — Pêche',      value: 'برتقالي فاتح' },
  { label: 'أصفر — Jaune',              value: 'أصفر' },
  { label: 'أصفر فاتح — Jaune clair',   value: 'أصفر فاتح' },
  { label: 'خردلي — Moutarde',          value: 'خردلي' },
  { label: 'ذهبي — Or',                 value: 'ذهبي' },
  { label: 'فضي — Argent',              value: 'فضي' },
  // Verts
  { label: 'أخضر فاتح — Vert clair',    value: 'أخضر فاتح' },
  { label: 'أخضر — Vert',               value: 'أخضر' },
  { label: 'أخضر زيتوني — Kaki',        value: 'أخضر زيتوني' },
  { label: 'أخضر غامق — Vert foncé',    value: 'أخضر غامق' },
  { label: 'أخضر زمردي — Emeraude',     value: 'أخضر زمردي' },
  { label: 'تركواز — Turquoise',        value: 'تركواز' },
  { label: 'نعناعي — Menthe',           value: 'نعناعي' },
  { label: 'كاكي — Kaki militaire',     value: 'كاكي' },
  // Bleus
  { label: 'أزرق سماوي — Bleu ciel',    value: 'أزرق سماوي' },
  { label: 'أزرق فاتح — Bleu clair',    value: 'أزرق فاتح' },
  { label: 'أزرق — Bleu',               value: 'أزرق' },
  { label: 'أزرق ملكي — Bleu roi',      value: 'أزرق ملكي' },
  { label: 'أزرق غامق — Bleu foncé',    value: 'أزرق غامق' },
  { label: 'كحلي — Bleu marine',        value: 'كحلي' },
  { label: 'أزرق جينز — Jean',          value: 'أزرق جينز' },
  // Violets
  { label: 'خزامي — Lavande',           value: 'خزامي' },
  { label: 'ليلكي — Lilas',             value: 'ليلكي' },
  { label: 'بنفسجي فاتح — Mauve',       value: 'بنفسجي فاتح' },
  { label: 'بنفسجي — Violet',           value: 'بنفسجي' },
  { label: 'بنفسجي غامق — Prune',       value: 'بنفسجي غامق' },
  // Multi
  { label: 'متعدد الألوان — Multicolore', value: 'متعدد الألوان' },
  { label: 'مطبوع — Imprimé',           value: 'مطبوع' },
]

// ── Options tailles (par lettre + par numéro) ─────────────────────────────────
const SIZE_LETTERS = [
  { label: 'XS  (36-38)', value: 'XS(36-38)' },
  { label: 'S   (38-40)', value: 'S(38-40)' },
  { label: 'M   (40-42)', value: 'M(40-42)' },
  { label: 'L   (42-44)', value: 'L(42-44)' },
  { label: 'XL  (44-46)', value: 'XL(44-46)' },
  { label: 'XXL (46-48)', value: 'XXL(46-48)' },
  { label: 'XXXL (48-50)', value: 'XXXL(48-50)' },
  { label: 'Taille unique', value: 'unique' },
]

const SIZE_NUMBERS = [
  { label: '34', value: '34' },
  { label: '36', value: '36' },
  { label: '38', value: '38' },
  { label: '40', value: '40' },
  { label: '42', value: '42' },
  { label: '44', value: '44' },
  { label: '46', value: '46' },
  { label: '48', value: '48' },
  { label: '50', value: '50' },
  { label: '52', value: '52' },
  { label: '54', value: '54' },
  { label: '56', value: '56' },
]

// ── Types ─────────────────────────────────────────────────────────────────────
interface Variation {
  _key: string
  id?: string
  colorAr?: string
  size?: string
  regularPrice: number
  salePrice?: number | ''
  stock: number
  inStock: boolean
}

interface UploadedImage {
  _key: string
  mediaId?: string
  url?: string
  file?: File
  uploading: boolean
}

interface Category { id: string; nameAr?: string; name?: string }

interface VariationSuggestion { colorAr: string; size: string; count: number }

export interface InitialProduct {
  id: string
  nameAr: string
  nameFr?: string
  descriptionAr?: string
  status: 'published' | 'draft' | 'archived'
  sku?: string
  category?: Array<{ id: string } | string>
  variations?: Array<{
    id?: string; colorAr?: string; size?: string
    regularPrice?: number; salePrice?: number; stock?: number; inStock?: boolean
  }>
  images?: Array<{ id?: string; image?: { id?: string; url?: string; thumbnailURL?: string } }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!productId

  // Form state
  const [nameAr, setNameAr] = useState(initial?.nameAr ?? '')
  const [nameFr, setNameFr] = useState(initial?.nameFr ?? '')
  const [desc, setDesc] = useState(initial?.descriptionAr ?? '')
  const [status, setStatus] = useState<'published' | 'draft' | 'archived'>(initial?.status ?? 'published')
  const [sku, setSku] = useState(initial?.sku ?? '')

  // Catégories
  const [categories, setCategories] = useState<Category[]>([])
  const [selCats, setSelCats] = useState<string[]>(
    (initial?.category ?? []).map(c => typeof c === 'string' ? c : c.id)
  )
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

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
  const [suggestions, setSuggestions] = useState<VariationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // Images
  const [images, setImages] = useState<UploadedImage[]>(
    (initial?.images ?? []).map(img => ({
      _key: uid(),
      mediaId: img.image?.id,
      url: img.image?.thumbnailURL ?? img.image?.url,
      uploading: false,
    }))
  )

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Charger toutes les catégories ───────────────────────────────────────────
  useEffect(() => {
    fetch('/api/categories?limit=100&sort=nameAr&depth=0')
      .then(r => r.json())
      .then(data => setCategories(data.docs ?? []))
      .catch(() => setCategories([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Créer une nouvelle catégorie ─────────────────────────────────────────────
  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setCreatingCat(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameAr: newCatName.trim(), name: newCatName.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const created: Category = data.doc
      setCategories(prev => [...prev, created])
      setSelCats(prev => [...prev, created.id])
      setNewCatName('')
      setNewCatOpen(false)
      showToast('Catégorie créée ✓', true)
    } catch { showToast('Erreur création catégorie', false) }
    finally { setCreatingCat(false) }
  }

  // ── Charger les suggestions de variations depuis les produits existants ───────
  async function loadSuggestions() {
    if (suggestions.length > 0) { setShowSuggestions(true); return }
    setSuggestionsLoading(true)
    setShowSuggestions(true)
    try {
      const res = await fetch('/api/products?limit=200&depth=0')
      const data = await res.json()
      const counts = new Map<string, number>()
      for (const p of data.docs ?? []) {
        for (const v of p.variations ?? []) {
          if (!v.colorAr && !v.size) continue
          const key = `${v.colorAr ?? ''}|${v.size ?? ''}`
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }
      const sorted: VariationSuggestion[] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 60)
        .map(([key, count]) => {
          const [colorAr, size] = key.split('|')
          return { colorAr, size, count }
        })
      setSuggestions(sorted)
    } catch { showToast('Erreur chargement suggestions', false) }
    finally { setSuggestionsLoading(false) }
  }

  function addSuggestion(s: VariationSuggestion) {
    setVariations(prev => [...prev, {
      _key: uid(), colorAr: s.colorAr, size: s.size,
      regularPrice: 0, salePrice: '', stock: 0, inStock: true,
    }])
  }

  // ── Gestion variations ────────────────────────────────────────────────────────
  function addVariation() {
    setVariations(v => [...v, { _key: uid(), colorAr: '', size: '', regularPrice: 0, salePrice: '', stock: 0, inStock: true }])
  }
  function removeVariation(key: string) { setVariations(v => v.filter(x => x._key !== key)) }
  function updateVariation(key: string, patch: Partial<Variation>) {
    setVariations(v => v.map(x => x._key === key ? { ...x, ...patch } : x))
  }

  // ── Gestion images ────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const newImgs: UploadedImage[] = Array.from(files).map(f => ({
      _key: uid(), file: f, url: URL.createObjectURL(f), uploading: true,
    }))
    setImages(prev => [...prev, ...newImgs])
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

  // Définir une image comme "à la une" (la déplacer en première position)
  function setFeatured(key: string) {
    setImages(prev => {
      const idx = prev.findIndex(i => i._key === key)
      if (idx <= 0) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      return [item, ...next]
    })
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!nameAr.trim()) { showToast('Le nom du produit est requis', false); return }
    if (images.some(i => i.uploading)) { showToast('Images en cours d\'upload, patientez…', false); return }
    setSaving(true)
    try {
      const body = {
        nameAr: nameAr.trim(),
        ...(nameFr.trim() ? { nameFr: nameFr.trim() } : {}),
        ...(desc.trim() ? { descriptionAr: desc.trim() } : {}),
        status, sku: sku.trim() || undefined,
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
      if (!res.ok) throw new Error()
      showToast(isEdit ? 'Produit mis à jour ✓' : 'Produit créé ✓', true)
      setTimeout(() => router.push('/boutique-admin/products'), 900)
    } catch { showToast('Erreur lors de la sauvegarde', false) }
    finally { setSaving(false) }
  }

  // ── Styles (thème clair) ──────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 8,
    border: '1px solid #E3E5E7',
    background: '#fff', color: '#1A1A1A', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#9A9A9A',
    letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
  }
  const cardStyle: React.CSSProperties = {
    background: '#fff', border: '1px solid #E3E5E7',
    borderRadius: 12, padding: '20px 22px', marginBottom: 14,
  }
  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = '#4A3DBC')
  const focusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = '#E3E5E7')

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, animation: 'fadeUp 0.4s ease forwards' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '14px 22px', borderRadius: 12,
          background: toast.ok ? '#D1FAE5' : '#FEE2E2',
          border: `1px solid ${toast.ok ? '#6EE7B7' : '#FCA5A5'}`,
          color: toast.ok ? '#065F46' : '#991B1B', fontWeight: 700, fontSize: 13,
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)', animation: 'fadeIn 0.2s ease',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/boutique-admin/products" style={{ color: '#9A9A9A', fontSize: 12 }}>Produits</Link>
            <span style={{ color: '#D0D0D0', fontSize: 12 }}>›</span>
            <span style={{ color: '#1A1A1A', fontSize: 12 }}>{isEdit ? 'Modifier' : 'Nouveau produit'}</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1A1A1A' }}>
            {isEdit ? (initial?.nameAr || 'Modifier le produit') : '+ Nouveau produit'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/boutique-admin/products" className="admin-btn admin-btn-secondary" style={{ textDecoration: 'none' }}>
            Annuler
          </Link>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: saving ? '#ccc' : '#E93D91',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {saving
              ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Enregistrement…</>
              : '💾 Enregistrer'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div>

          {/* Identité */}
          <div style={cardStyle}>
            <SectionTitle icon="🏷️" title="Identité du produit" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nom du produit (arabe) *</label>
                <input value={nameAr} onChange={e => setNameAr(e.target.value)}
                  placeholder="مثال: فستان صيفي أنيق" dir="rtl"
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 600 }}
                  onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>Nom français (optionnel)</label>
                <input value={nameFr} onChange={e => setNameFr(e.target.value)}
                  placeholder="Ex: Robe d'été" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={labelStyle}>SKU / Référence</label>
                <input value={sku} onChange={e => setSku(e.target.value)}
                  placeholder="SHE-001" style={{ ...inputStyle, fontFamily: 'monospace' }}
                  onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={cardStyle}>
            <SectionTitle icon="📝" title="Description" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="وصف المنتج بالعربية — المقاس، الخامة، طريقة الاستخدام…"
              dir="rtl" rows={5}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7, minHeight: 100 }}
              onFocus={focusIn} onBlur={focusOut} />
          </div>

          {/* Photos */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <SectionTitle icon="📷" title="Photos du produit" count={images.length} countColor="#60A5FA" />
              <button onClick={() => fileInputRef.current?.click()} style={{
                padding: '7px 14px', borderRadius: 8,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>+ Ajouter des photos</button>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*"
              style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

            {images.length === 0 ? (
              <DropZone onClick={() => fileInputRef.current?.click()} />
            ) : (
              <>
                {/* Indication */}
                <p style={{ fontSize: 11, color: '#9A9A9A', margin: '0 0 12px', textAlign: 'center' }}>
                  Cliquez sur ⭐ pour définir la photo à la une · La première image est la principale
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                  {images.map((img, idx) => (
                    <div key={img._key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: idx === 0 ? '2px solid #E93D91' : '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                      {img.url && <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      {img.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                        </div>
                      )}
                      {/* Badge à la une */}
                      {idx === 0
                        ? <div style={{ position: 'absolute', top: 5, left: 5, background: 'linear-gradient(135deg,#E93D91,#C4197A)', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 6, padding: '2px 6px' }}>⭐ À LA UNE</div>
                        : (
                          <button onClick={() => setFeatured(img._key)} title="Définir comme photo à la une" style={{
                            position: 'absolute', top: 5, left: 5,
                            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.7)', fontSize: 12, borderRadius: 6,
                            padding: '2px 7px', cursor: 'pointer', fontWeight: 700,
                          }}>⭐</button>
                        )
                      }
                      {/* Supprimer */}
                      <button onClick={() => removeImage(img._key)} style={{
                        position: 'absolute', top: 5, right: 5,
                        width: 22, height: 22, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                        fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>✕</button>
                    </div>
                  ))}
                  {/* Bouton ajouter en grille */}
                  <div onClick={() => fileInputRef.current?.click()} style={{
                    aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(233,61,145,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
                    <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.15)' }}>+</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Variations */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionTitle icon="🎨" title="Variations" count={variations.length} countColor="#E93D91" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadSuggestions} style={{
                  padding: '7px 14px', borderRadius: 8,
                  background: '#EDE9FE', border: '1px solid #DDD6FE',
                  color: '#7C3AED', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>⚡ Suggestions du site</button>
                <button onClick={addVariation} style={{
                  padding: '7px 14px', borderRadius: 8,
                  background: '#FCE7F3', border: '1px solid #F9A8D4',
                  color: '#E93D91', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>+ Nouvelle</button>
              </div>
            </div>

            {/* Panel suggestions */}
            {showSuggestions && (
              <div style={{
                marginBottom: 14, padding: '14px 16px', borderRadius: 10,
                background: '#F5F3FF', border: '1px solid #DDD6FE',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>
                    ⚡ Variations existantes sur le site — cliquez pour ajouter
                  </span>
                  <button onClick={() => setShowSuggestions(false)} style={{ background: 'none', border: 'none', color: '#9A9A9A', fontSize: 16, cursor: 'pointer' }}>✕</button>
                </div>
                {suggestionsLoading ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#9A9A9A', fontSize: 12 }}>Chargement…</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {suggestions.map((s, i) => {
                      const alreadyAdded = variations.some(v => v.colorAr === s.colorAr && v.size === s.size)
                      return (
                        <button key={i} onClick={() => !alreadyAdded && addSuggestion(s)}
                          disabled={alreadyAdded}
                          style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            cursor: alreadyAdded ? 'default' : 'pointer',
                            border: alreadyAdded ? '1px solid #E3E5E7' : '1px solid #DDD6FE',
                            background: alreadyAdded ? '#F5F5F5' : '#EDE9FE',
                            color: alreadyAdded ? '#B0B0B0' : '#7C3AED',
                            transition: 'all 0.15s',
                          }}>
                          {s.colorAr || '—'} · {s.size || '—'}
                          {alreadyAdded ? ' ✓' : ` (×${s.count})`}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Table variations */}
            {variations.length === 0 ? (
              <div style={{
                padding: '32px', textAlign: 'center', color: '#B0B0B0',
                border: '1px dashed #E3E5E7', borderRadius: 10, fontSize: 13,
              }}>
                Aucune variation. Utilisez &quot;Suggestions du site&quot; ou &quot;+ Nouvelle&quot;.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      {['Couleur', 'Taille', 'Prix (DZD)', 'Promo (DZD)', 'Stock', 'Dispo', ''].map(h => (
                        <th key={h} style={{
                          padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                          fontSize: 10, color: '#9A9A9A',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          borderBottom: '1px solid #E3E5E7',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variations.map(v => (
                      <tr key={v._key} style={{ borderBottom: '1px solid #F1F1F1' }}>
                        <td style={{ padding: '7px 8px' }}>
                          <select value={v.colorAr ?? ''} onChange={e => updateVariation(v._key, { colorAr: e.target.value })}
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, minWidth: 150 }}
                            onFocus={focusIn} onBlur={focusOut}>
                            <option value="">— Couleur</option>
                            {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <select value={v.size ?? ''} onChange={e => updateVariation(v._key, { size: e.target.value })}
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, minWidth: 120 }}
                            onFocus={focusIn} onBlur={focusOut}>
                            <option value="">— Taille</option>
                            <optgroup label="── Par lettre ──">
                              {SIZE_LETTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </optgroup>
                            <optgroup label="── Par numéro ──">
                              {SIZE_NUMBERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </optgroup>
                          </select>
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <input type="number" min="0" value={v.regularPrice}
                            onChange={e => updateVariation(v._key, { regularPrice: Number(e.target.value) })}
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, width: 100 }}
                            onFocus={focusIn} onBlur={focusOut} />
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <input type="number" min="0" value={v.salePrice ?? ''} placeholder="—"
                            onChange={e => updateVariation(v._key, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, width: 100 }}
                            onFocus={focusIn} onBlur={focusOut} />
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <input type="number" min="0" value={v.stock}
                            onChange={e => updateVariation(v._key, { stock: Number(e.target.value) })}
                            style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, width: 70 }}
                            onFocus={focusIn} onBlur={focusOut} />
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={v.inStock}
                            onChange={e => updateVariation(v._key, { inStock: e.target.checked })}
                            style={{ accentColor: '#E93D91', width: 16, height: 16, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '7px 8px' }}>
                          <button onClick={() => removeVariation(v._key)} style={{
                            padding: '5px 10px', borderRadius: 8,
                            background: '#FEE2E2', border: '1px solid #FCA5A5',
                            color: '#991B1B', fontSize: 14, cursor: 'pointer',
                          }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne droite ─────────────────────────────────────────────────── */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Statut */}
          <div style={cardStyle}>
            <label style={labelStyle}>Statut de publication</label>
            {[
              { value: 'published', label: '✅ Publié',    color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
              { value: 'draft',     label: '📝 Brouillon', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
              { value: 'archived',  label: '📦 Archivé',   color: '#6D7175', bg: '#F1F1F1', border: '#E3E5E7' },
            ].map(opt => (
              <label key={opt.value} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 5,
                background: status === opt.value ? opt.bg : 'transparent',
                border: `1px solid ${status === opt.value ? opt.border : '#E3E5E7'}`,
                transition: 'all 0.15s',
              }}>
                <input type="radio" name="status" value={opt.value} checked={status === opt.value}
                  onChange={() => setStatus(opt.value as 'published' | 'draft' | 'archived')}
                  style={{ accentColor: '#E93D91', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: status === opt.value ? opt.color : '#6D7175' }}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>

          {/* Catégories */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>Catégories</label>
              <button onClick={() => setNewCatOpen(o => !o)} style={{
                padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                background: newCatOpen ? '#FCE7F3' : '#F5F5F5',
                border: `1px solid ${newCatOpen ? '#F9A8D4' : '#E3E5E7'}`,
                color: newCatOpen ? '#E93D91' : '#6D7175', cursor: 'pointer',
              }}>+ Nouvelle</button>
            </div>

            {/* Mini-formulaire nouvelle catégorie */}
            {newCatOpen && (
              <div style={{
                marginBottom: 12, padding: '12px', borderRadius: 8,
                background: '#FFF5FA', border: '1px solid #F9A8D4',
              }}>
                <label style={{ ...labelStyle, fontSize: 10, marginBottom: 6 }}>Nom de la catégorie</label>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Ex: Robes d'été / فساتين صيفية"
                  onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
                  style={{ ...inputStyle, marginBottom: 8, fontSize: 12 }}
                  onFocus={focusIn} onBlur={focusOut} autoFocus />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()} style={{
                    flex: 1, padding: '7px', borderRadius: 8, border: 'none',
                    background: '#E93D91', color: '#fff', fontSize: 11, fontWeight: 700,
                    cursor: (creatingCat || !newCatName.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (creatingCat || !newCatName.trim()) ? 0.5 : 1,
                  }}>{creatingCat ? 'Création…' : '✓ Créer'}</button>
                  <button onClick={() => { setNewCatOpen(false); setNewCatName('') }} style={{
                    padding: '7px 12px', borderRadius: 8,
                    background: '#fff', border: '1px solid #E3E5E7',
                    color: '#6D7175', fontSize: 11, cursor: 'pointer',
                  }}>Annuler</button>
                </div>
              </div>
            )}

            {/* Liste catégories */}
            {categories.length === 0 ? (
              <div style={{ fontSize: 12, color: '#B0B0B0', textAlign: 'center', padding: '16px 0' }}>
                Aucune catégorie — créez-en une avec &quot;+ Nouvelle&quot;
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
                {categories.map(cat => {
                  const label = cat.nameAr ?? cat.name ?? cat.id
                  const checked = selCats.includes(cat.id)
                  return (
                    <label key={cat.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                      background: checked ? '#FFF0F7' : 'transparent',
                      border: `1px solid ${checked ? '#F9A8D4' : 'transparent'}`,
                      transition: 'all 0.15s',
                    }}>
                      <input type="checkbox" checked={checked}
                        onChange={e => setSelCats(prev => e.target.checked ? [...prev, cat.id] : prev.filter(id => id !== cat.id))}
                        style={{ accentColor: '#E93D91', cursor: 'pointer' }} />
                      <span style={{ fontSize: 12, color: checked ? '#E93D91' : '#3D3D3D', fontWeight: checked ? 600 : 400 }}>
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bouton Save */}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: saving ? '#ccc' : '#E93D91',
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Enregistrement…' : '💾 Enregistrer le produit'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Sous-composants ────────────────────────────────────────────────────────────
function SectionTitle({ icon, title, count, countColor }: { icon: string; title: string; count?: number; countColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 700, color: '#1A1A1A', fontSize: 14 }}>{title}</span>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px',
          background: '#F1F1F1', border: '1px solid #E3E5E7',
          color: countColor ?? '#6D7175',
        }}>{count}</span>
      )}
    </div>
  )
}

function DropZone({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      padding: '40px', textAlign: 'center',
      border: '2px dashed #E3E5E7', borderRadius: 12,
      cursor: 'pointer', transition: 'border-color 0.2s', background: '#FAFAFA',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#E93D91')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#E3E5E7')}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
      <div style={{ color: '#6D7175', fontSize: 13 }}>Cliquez pour ajouter des photos</div>
      <div style={{ color: '#B0B0B0', fontSize: 11, marginTop: 4 }}>JPG, PNG, WebP — max 10 Mo · La première image sera à la une</div>
    </div>
  )
}
