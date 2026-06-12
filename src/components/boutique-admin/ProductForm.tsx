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
// Tailles regroupées par système — chips toujours visibles
const SIZE_GROUPS = [
  { label: 'Standard', sizes: ['XS(36-38)','S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)','XXXL(48-50)'] },
  { label: 'Grande taille', sizes: ['L(38/40)','XL(42)','XXL(44)','3XL(46)','4XL(48)','5XL(50)','6XL(52)','7XL(54)'] },
  { label: 'Pointures / Numéros', sizes: ['34','35','36','37','38','39','40','41','42','43','44','45','46'] },
  { label: 'Spécial', sizes: ['Taille unique','Réglable'] },
]
const SIZE_SUGGESTIONS = SIZE_GROUPS.flatMap(g => g.sizes)

// Suggestions de tailles par catégorie de produit
const CATEGORY_SIZE_SUGGESTIONS: Record<string, { label: string; sizes: string[] }[]> = {
  burkini:   [{ label: 'Burkini (numéros)', sizes: ['36','38','40','42','44','46','48','50','52'] }, { label: 'Burkini (lettres)', sizes: ['S','M','L','XL','XXL','3XL','4XL'] }],
  robes:     [{ label: 'Robes hidjab', sizes: ['XS(36-38)','S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)','XXXL(48-50)'] }],
  manteaux:  [{ label: 'Manteaux', sizes: ['S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)','3XL(48-50)'] }],
  ensembles: [{ label: 'Ensembles', sizes: ['S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)'] }],
  jupes:     [{ label: 'Jupes / Pantalons', sizes: ['34','36','38','40','42','44','46','48'] }],
  chaussures:[{ label: 'Pointures femmes', sizes: ['35','36','37','38','39','40','41','42'] }],
  sacs:      [{ label: 'Tailles sacs', sizes: ['Petit','Moyen','Grand','Taille unique'] }],
  chapeaux:  [{ label: 'Tour de tête', sizes: ['54cm','56cm','58cm','60cm','Taille unique','Réglable'] }],
  pareos:    [{ label: 'Pareos', sizes: ['Taille unique','S/M','L/XL'] }],
  chemises:  [{ label: 'Chemises', sizes: ['S(38-40)','M(40-42)','L(42-44)','XL(44-46)','XXL(46-48)'] }],
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductTab = 'general' | 'inventory' | 'attributes' | 'variations' | 'advanced'

interface CustomAttr {
  _key: string
  name: string      // label FR (ex: "Matière")
  nameAr: string    // label AR (ex: "المادة")
  valuesRaw: string // valeurs pipe-séparées
  visible: boolean
  forVariations: boolean
  attrType?: 'couleur' | 'taille' | 'autre'  // type choisi à la création
}
type VariationAction = 'generate' | 'add_manual' | 'set_regular' | 'set_sale' | 'toggle_enabled' | 'delete_all'

interface Variation {
  _key: string; id?: string
  colorAr: string; size: string
  customValues?: Record<string, string>  // nameAr → selected value for each custom attr
  regularPrice: number; salePrice?: number | ''
  saleDateFrom?: string; saleDateTo?: string
  stock: number; inStock: boolean
  variationSku?: string; variationDescription?: string
  variationImageId?: string; variationImageUrl?: string
  variationImageUploading?: boolean
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
    customValues?: Record<string, string>
    regularPrice?: number; salePrice?: number
    saleDateFrom?: string; saleDateTo?: string
    stock?: number; inStock?: boolean
    variationSku?: string; variationDescription?: string
    variationImageId?: string; variationImageUrl?: string
  }>
  visibility?: 'public' | 'private'
  images?: Array<{ id?: string; image?: { id?: string; url?: string; thumbnailURL?: string } }>
  customAttributes?: Array<{
    name?: string; nameAr?: string; values?: string
    visible?: boolean; forVariations?: boolean
  }>
}

function uid() { return Math.random().toString(36).slice(2) }

function makeSlug(text: string): string {
  const ascii = text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (ascii || 'product') + '-' + Date.now()
}

// Payload retourne /api/media/file/... (403 sans auth) → convertir en /media/... (statique public)
function toPublicUrl(u?: string | null): string {
  if (!u) return ''
  return u.replace(/^https?:\/\/[^/]+\/api\/media\/file\//, '/media/')
          .replace(/^\/api\/media\/file\//, '/media/')
}

async function uploadFile(file: File): Promise<{ id: string; url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  // Route dédiée avec overrideAccess — /api/media Payload exige une auth Payload
  const res = await fetch('/api/boutique-admin/upload-media', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Échec upload')
  // Notre route renvoie { id, url } directement (pas le format Payload REST { doc: { id, url } })
  return { id: data.id, url: data.url }
}

// Sépare une chaîne "val1 | val2 | val3" en tableau propre
function parsePipe(s: string): string[] {
  return s.split('|').map(v => v.trim()).filter(Boolean)
}

const VARS_PER_PAGE = 10

// ── Composant principal ───────────────────────────────────────────────────────
export default function ProductForm({ productId, initial }: { productId?: string; initial?: InitialProduct }) {
  const router = useRouter()
  const featuredInputRef    = useRef<HTMLInputElement>(null)
  const galleryInputRef     = useRef<HTMLInputElement>(null)
  // Ref pour l'upload d'image de variation — un seul input caché, clé de variation en ref
  const varImageInputRef    = useRef<HTMLInputElement>(null)
  const varImageTargetKey   = useRef<string | null>(null)
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
  const [attrSaved,     setAttrSaved]     = useState(false)
  // Inputs pour ajouter une couleur/taille personnalisée
  const [customColorInput, setCustomColorInput] = useState('')
  const [customSizeInput,  setCustomSizeInput]  = useState('')
  // Inputs par attribut personnalisé (keyed par _key) pour l'ajout de tags
  const [attrTagInputs, setAttrTagInputs] = useState<Record<string, string>>({})

  // ── Couleurs/tailles personnalisées persistées (localStorage) ───────────────
  // Quand la confirmatrice ajoute "Autre couleur/taille", ça reste pour toujours dans la liste
  const SAVED_CUSTOM_COLORS_KEY = 'she_custom_colors_v1'
  const SAVED_CUSTOM_SIZES_KEY  = 'she_custom_sizes_v1'
  const [savedCustomColors, setSavedCustomColors] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(SAVED_CUSTOM_COLORS_KEY) ?? '[]') } catch { return [] }
  })
  const [savedCustomSizes, setSavedCustomSizes] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(SAVED_CUSTOM_SIZES_KEY) ?? '[]') } catch { return [] }
  })
  // Picker de catégorie dans la section tailles (pour suggestions)
  const [catSizePicker, setCatSizePicker] = useState<string>('')

  // Ajouter une couleur perso + la persister
  function addCustomColor(val: string) {
    const v = val.trim(); if (!v) return
    const curr = parsePipe(colorsRaw)
    if (!curr.includes(v)) { setColorsRaw(curr.length ? v + ' | ' + curr.join(' | ') : v); setAttrSaved(true) }
    setSavedCustomColors(prev => {
      if (prev.includes(v)) return prev
      const next = [v, ...prev]
      try { localStorage.setItem(SAVED_CUSTOM_COLORS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setCustomColorInput('')
  }

  // Ajouter une taille perso + la persister
  function addCustomSize(val: string) {
    const v = val.trim(); if (!v) return
    const curr = parsePipe(sizesRaw)
    if (!curr.includes(v)) { setSizesRaw(curr.length ? v + ' | ' + curr.join(' | ') : v); setAttrSaved(true) }
    setSavedCustomSizes(prev => {
      if (prev.includes(v)) return prev
      const next = [v, ...prev]
      try { localStorage.setItem(SAVED_CUSTOM_SIZES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setCustomSizeInput('')
  }

  // ── Attributs personnalisés ─────────────────────────────────────────────────
  const [customAttrs, setCustomAttrs] = useState<CustomAttr[]>(
    (initial?.customAttributes ?? []).map(a => ({
      _key: uid(), name: a.name ?? '', nameAr: a.nameAr ?? '',
      valuesRaw: a.values ?? '', visible: a.visible ?? true, forVariations: a.forVariations ?? false,
      attrType: 'autre' as const,
    }))
  )
  // Picker de type affiché avant d'ajouter un attribut manuel
  const [addAttrPickerOpen, setAddAttrPickerOpen] = useState(false)

  // ── Suggestions d'attributs personnalisés (persistées en localStorage) ───────
  // Clé : { nameAr: string; name: string; categoryIds: string[] } — sauvegardé à chaque "Enregistrer les attributs"
  type SavedAttrEntry = { nameAr: string; name: string; categoryIds: string[] }
  const SAVED_ATTRS_KEY = 'she_saved_custom_attrs_v2'
  const [savedAttrSuggestions, setSavedAttrSuggestions] = useState<SavedAttrEntry[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(SAVED_ATTRS_KEY) ?? '[]') } catch { return [] }
  })

  // ── Visibilité (public / privé) ─────────────────────────────────────────────
  const [visibility, setVisibility] = useState<'public' | 'private'>(initial?.visibility ?? 'public')

  // ── Variations ──────────────────────────────────────────────────────────────
  const [variations,   setVariations]   = useState<Variation[]>(
    (initial?.variations ?? []).map(v => ({
      _key: uid(), id: v.id,
      colorAr: v.colorAr ?? '', size: v.size ?? '',
      customValues: v.customValues ?? {},
      regularPrice: v.regularPrice ?? 0,
      salePrice: v.salePrice ?? '',
      saleDateFrom: v.saleDateFrom ?? '', saleDateTo: v.saleDateTo ?? '',
      stock: v.stock ?? 0, inStock: v.inStock ?? true,
      variationSku: v.variationSku ?? '', variationDescription: v.variationDescription ?? '',
      variationImageId: v.variationImageId ?? '', variationImageUrl: toPublicUrl(v.variationImageUrl) || '',
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
      url: toPublicUrl(img.image?.thumbnailURL ?? img.image?.url),
      uploading: false,
    }))
  )

  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Auto-save serveur (uniquement en mode création — comme WordPress) ────────
  // Toutes les 30s si le nom est rempli → crée/met à jour un vrai brouillon serveur
  // La confirmatrice retrouve le brouillon dans la liste produits si elle quitte
  const draftIdRef    = useRef<string | null>(null)  // ID serveur du brouillon créé
  const autoSavingRef = useRef(false)
  const [autoSaveLabel, setAutoSaveLabel] = useState<string>('')

  // Ref vers l'état courant du formulaire — permet d'accéder aux valeurs à jour dans beforeunload
  const formStateRef = useRef({
    nameAr, nameFr, desc, shortDesc, purchNote, sku, visibility,
    selCats, colorsRaw, sizesRaw, attrSaved, customAttrs, variations, images,
  })
  useEffect(() => {
    formStateRef.current = {
      nameAr, nameFr, desc, shortDesc, purchNote, sku, visibility,
      selCats, colorsRaw, sizesRaw, attrSaved, customAttrs, variations, images,
    }
  }, [nameAr, nameFr, desc, shortDesc, purchNote, sku, visibility,
      selCats, colorsRaw, sizesRaw, attrSaved, customAttrs, variations, images])

  // Construit le body de sauvegarde (partagé entre auto-save et handleSave)
  function buildBody(targetStatus: 'published' | 'draft' = 'draft', s = formStateRef.current) {
    return {
      nameAr: s.nameAr.trim() || 'Brouillon',
      ...(!draftIdRef.current && !productId ? { slug: makeSlug(s.nameAr.trim() || String(Date.now())) } : {}),
      ...(s.nameFr.trim()    ? { nameFr: s.nameFr.trim() }              : {}),
      ...(s.desc.trim()      ? { descriptionAr: s.desc.trim() }         : {}),
      ...(s.shortDesc.trim() ? { shortDescriptionAr: s.shortDesc.trim() } : {}),
      ...(s.purchNote.trim() ? { purchaseNote: s.purchNote.trim() }     : {}),
      status: targetStatus, sku: s.sku.trim() || undefined,
      visibility: s.visibility,
      category: s.selCats,
      customAttributes: s.customAttrs.map(a => ({
        name: a.name, nameAr: a.nameAr, values: a.valuesRaw,
        visible: a.visible, forVariations: a.forVariations,
      })),
      variations: s.variations.map(v => ({
        ...(v.id ? { id: v.id } : {}),
        colorAr: v.colorAr || '', size: v.size || '',
        ...(v.customValues && Object.keys(v.customValues).length ? { customValues: v.customValues } : {}),
        regularPrice: Number(v.regularPrice) || 0,
        ...(v.salePrice !== '' && v.salePrice != null ? { salePrice: Number(v.salePrice) } : {}),
        ...(v.saleDateFrom ? { saleDateFrom: v.saleDateFrom } : {}),
        ...(v.saleDateTo   ? { saleDateTo:   v.saleDateTo   } : {}),
        stock: Number(v.stock) || 0, inStock: v.inStock,
        ...(v.variationSku         ? { variationSku: v.variationSku }               : {}),
        ...(v.variationDescription ? { variationDescription: v.variationDescription } : {}),
        ...(v.variationImageId     ? { variationImageId: v.variationImageId }         : {}),
        ...(v.variationImageUrl    ? { variationImageUrl: v.variationImageUrl }       : {}),
      })),
      images: s.images.filter(i => i.mediaId).map(i => ({ image: Number(i.mediaId) })),
    }
  }

  async function serverAutoSave() {
    if (isEdit) return
    if (autoSavingRef.current) return
    const name = formStateRef.current.nameAr.trim()
    if (!name) return  // Ne pas créer de brouillon si pas encore de nom
    autoSavingRef.current = true
    setAutoSaveLabel('Sauvegarde…')
    try {
      const body = buildBody('draft')
      if (draftIdRef.current) {
        // Mettre à jour le brouillon existant
        await fetch(`/api/boutique-admin/products/${draftIdRef.current}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        // Créer le brouillon pour la première fois
        const res = await fetch('/api/boutique-admin/products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) {
          const data = await res.json()
          draftIdRef.current = data.doc?.id ?? data.id ?? null
        }
      }
      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      setAutoSaveLabel(`Brouillon sauvegardé à ${now}`)
    } catch {
      setAutoSaveLabel('')
    } finally {
      autoSavingRef.current = false
    }
  }

  // Auto-save déclenché 5s après chaque modification (debounce)
  // Plus réactif que l'interval 30s — sauvegarde avant que l'utilisateur ne quitte
  useEffect(() => {
    if (isEdit) return
    const t = setTimeout(() => { serverAutoSave() }, 5000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameAr, nameFr, desc, shortDesc, purchNote, sku, visibility,
      selCats, colorsRaw, sizesRaw, attrSaved, customAttrs, variations, images])

  // Sauvegarde keepalive + alerte "Voulez-vous vraiment quitter ?" quand la page se ferme
  useEffect(() => {
    if (isEdit) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const name = formStateRef.current.nameAr.trim()
      if (!name) return  // Formulaire vierge → pas d'alerte, rien à sauvegarder
      // Déclencher le dialogue natif "Quitter le site ?" (texte personnalisé ignoré par les navigateurs modernes)
      e.preventDefault()
      // keepalive: true → le navigateur complète la requête même après fermeture de la page
      const body = buildBody('draft')
      const url = draftIdRef.current
        ? `/api/boutique-admin/products/${draftIdRef.current}`
        : '/api/boutique-admin/products'
      fetch(url, {
        method: draftIdRef.current ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  // Charger les catégories (route boutique-admin → overrideAccess, pas besoin d'auth)
  useEffect(() => {
    fetch('/api/boutique-admin/categories?limit=100&sort=nameAr&depth=0')
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
      const res = await fetch('/api/boutique-admin/categories', {
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
    setAttrSaved(true)
    const parts = []
    if (colors.length) parts.push(`${colors.length} couleur(s)`)
    if (sizes.length)  parts.push(`${sizes.length} taille(s)`)
    showToast(parts.length ? `Attributs enregistrés — ${parts.join(', ')}` : 'Attributs enregistrés', true)

    // Sauvegarder les noms des attributs personnalisés dans localStorage
    const newEntries = customAttrs
      .filter(a => a.nameAr.trim())
      .map(a => ({ nameAr: a.nameAr.trim(), name: a.name.trim(), categoryIds: selCats }))
    if (newEntries.length > 0) {
      setSavedAttrSuggestions(prev => {
        const merged = [...prev]
        for (const entry of newEntries) {
          const existing = merged.find(s => s.nameAr === entry.nameAr)
          if (existing) {
            existing.categoryIds = [...new Set([...existing.categoryIds, ...entry.categoryIds])]
          } else {
            merged.push(entry)
          }
        }
        try { localStorage.setItem(SAVED_ATTRS_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
        return merged
      })
    }
  }

  // ── Générer les variations (Step 2 WooCommerce — "Generate variations") ─────
  function generateVariations() {
    const colors = parsePipe(colorsRaw)
    const sizes  = parsePipe(sizesRaw)
    // Inclure les attributs manuels uniquement si : forVariations=true, nameAr rempli, et valeurs présentes
    const varCustomAttrs = customAttrs.filter(a => a.forVariations && a.nameAr.trim() && parsePipe(a.valuesRaw).length > 0)
    // Attributs manuels avec des valeurs mais sans nom → avertir
    const attrsMissingName = customAttrs.filter(a => a.forVariations && !a.nameAr.trim() && parsePipe(a.valuesRaw).length > 0)
    if (attrsMissingName.length > 0) {
      showToast(`⚠ ${attrsMissingName.length} attribut(s) manuel(s) ignoré(s) : remplissez leur nom arabe dans l'onglet Attributs`, false)
    }

    if (colors.length === 0 && sizes.length === 0 && varCustomAttrs.length === 0) {
      showToast('Ajoutez au moins une couleur, taille ou attribut dans l\'onglet Attributs', false)
      setTab('attributes')
      return
    }

    // Produit cartésien : couleurs × tailles × attributs personnalisés
    type Combo = { colorAr: string; size: string; customValues: Record<string, string> }
    let combos: Combo[] = [{ colorAr: '', size: '', customValues: {} }]

    if (colors.length > 0) {
      combos = colors.flatMap(c => combos.map(co => ({ ...co, colorAr: c })))
    }
    if (sizes.length > 0) {
      combos = sizes.flatMap(s => combos.map(co => ({ ...co, size: s })))
    }
    for (const attr of varCustomAttrs) {
      const vals = parsePipe(attr.valuesRaw)
      combos = vals.flatMap(v => combos.map(co => ({ ...co, customValues: { ...co.customValues, [attr.nameAr]: v } })))
    }

    const generated: Variation[] = []
    for (const combo of combos) {
      const exists = variations.some(v =>
        v.colorAr === combo.colorAr && v.size === combo.size &&
        varCustomAttrs.every(a => (v.customValues?.[a.nameAr] ?? '') === (combo.customValues[a.nameAr] ?? ''))
      )
      if (!exists) {
        generated.push({ _key: uid(), ...combo, regularPrice: 0, salePrice: '', stock: 0, inStock: true })
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
      } catch (err) {
        setImages(p => p.filter(x => x._key !== img._key))
        showToast('Échec upload: ' + (err instanceof Error ? err.message : String(err)), false)
      }
    }
  }

  // ── Upload image de variation ────────────────────────────────────────────
  // Propage automatiquement l'image à TOUTES les variations de la même couleur
  async function handleVarImageFile(files: FileList | null) {
    const key = varImageTargetKey.current
    if (!files?.length || !key) return
    const file = files[0]
    const localUrl = URL.createObjectURL(file)
    // Marquer l'upload en cours sur la variation cible
    updateVar(key, { variationImageUrl: localUrl, variationImageUploading: true })
    try {
      const { id, url } = await uploadFile(file)
      // Récupérer la couleur de la variation cible
      const targetColorAr = variations.find(v => v._key === key)?.colorAr ?? ''
      // Propager à toutes les variations de la même couleur
      setVariations(prev => prev.map(v => {
        if ((v.colorAr ?? '') === targetColorAr) {
          return { ...v, variationImageId: id, variationImageUrl: url, variationImageUploading: false }
        }
        return v
      }))
    } catch (err) {
      updateVar(key, { variationImageUploading: false })
      showToast('Échec upload: ' + (err instanceof Error ? err.message : String(err)), false)
    }
    if (varImageInputRef.current) varImageInputRef.current.value = ''
  }

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  async function handleSave(targetStatus?: 'published' | 'draft') {
    if (!nameAr.trim()) { showToast('Le nom du produit est requis', false); return }
    if (images.some(i => i.uploading)) { showToast('Images en cours d\'upload, patientez…', false); return }
    const finalStatus = targetStatus ?? status
    setSaving(true)
    try {
      // buildBody utilise formStateRef mais nameAr vient d'être validé ci-dessus
      // On reconstruit le body avec les valeurs React actuelles (état React = valeurs UI)
      const body = {
        nameAr: nameAr.trim(),
        // Si un brouillon serveur existe déjà → on PATCH le même doc, pas de nouveau slug
        ...(!productId && !draftIdRef.current ? { slug: makeSlug(nameAr.trim() || nameFr.trim() || String(Date.now())) } : {}),
        ...(nameFr.trim()    ? { nameFr: nameFr.trim() }              : {}),
        ...(desc.trim()      ? { descriptionAr: desc.trim() }         : {}),
        ...(shortDesc.trim() ? { shortDescriptionAr: shortDesc.trim() } : {}),
        ...(purchNote.trim() ? { purchaseNote: purchNote.trim() }     : {}),
        status: finalStatus, sku: sku.trim() || undefined,
        visibility,
        category: selCats,
        customAttributes: customAttrs.map(a => ({
          name: a.name, nameAr: a.nameAr, values: a.valuesRaw,
          visible: a.visible, forVariations: a.forVariations,
        })),
        variations: variations.map(v => ({
          ...(v.id ? { id: v.id } : {}),
          colorAr: v.colorAr || '', size: v.size || '',
          ...(v.customValues && Object.keys(v.customValues).length ? { customValues: v.customValues } : {}),
          regularPrice: Number(v.regularPrice) || 0,
          ...(v.salePrice !== '' && v.salePrice != null ? { salePrice: Number(v.salePrice) } : {}),
          ...(v.saleDateFrom ? { saleDateFrom: v.saleDateFrom } : {}),
          ...(v.saleDateTo   ? { saleDateTo:   v.saleDateTo   } : {}),
          stock: Number(v.stock) || 0, inStock: v.inStock,
          ...(v.variationSku         ? { variationSku: v.variationSku }               : {}),
          ...(v.variationDescription ? { variationDescription: v.variationDescription } : {}),
          ...(v.variationImageId     ? { variationImageId: v.variationImageId }         : {}),
          ...(v.variationImageUrl    ? { variationImageUrl: v.variationImageUrl }       : {}),
        })),
        images: images.filter(i => i.mediaId).map(i => ({ image: Number(i.mediaId) })),
      }
      // Si un brouillon auto-sauvé existe → PATCH ce brouillon (évite les doublons)
      // Sinon : édition normale (productId) ou nouvelle création
      const effectiveId = productId ?? draftIdRef.current
      const url = effectiveId
        ? `/api/boutique-admin/products/${effectiveId}`
        : '/api/boutique-admin/products'
      const res = await fetch(url, {
        method: effectiveId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(`Erreur : ${err?.errors?.[0]?.message ?? err?.message ?? res.status}`, false)
        return
      }
      setStatus(finalStatus)
      setAutoSaveLabel('')  // Effacer le label auto-save après sauvegarde manuelle
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

      {/* Breadcrumb + indicateur auto-save */}
      <div style={{ marginBottom: 6, fontSize: 12, color: '#646970', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <Link href="/boutique-admin/products" style={{ color: '#2271b1', textDecoration: 'none' }}>Produits</Link>
          {' › '}
          <span>{isEdit ? 'Modifier le produit' : 'Ajouter un produit'}</span>
        </div>
        {/* Indicateur auto-save serveur (mode création uniquement) */}
        {!isEdit && autoSaveLabel && (
          <span style={{ fontSize: 11, color: '#646970', fontStyle: 'italic' }}>{autoSaveLabel}</span>
        )}
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
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: '#646970' }}>
                    Cliquez sur une valeur pour l&apos;ajouter. Cliquez à nouveau pour la retirer.
                  </p>

                  {/* ── DEUX COLONNES : Couleurs + Tailles ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

                    {/* ── COULEURS ── */}
                    <div style={{ border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>الألوان — Couleurs</span>
                        <span style={{ fontSize: 11, color: '#888', background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '1px 7px' }}>optionnel</span>
                      </div>
                      <div style={{ padding: 12 }}>
                        {parsePipe(colorsRaw).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, padding: '8px', background: '#f0f7ff', borderRadius: 4, border: '1px solid #bde0ff' }}>
                            {parsePipe(colorsRaw).map(c => (
                              <button key={c}
                                onClick={() => { setColorsRaw(parsePipe(colorsRaw).filter(x => x !== c).join(' | ')); setAttrSaved(false) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#2271b1', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                                title="Cliquer pour retirer">
                                {c} ✕
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 170, overflowY: 'auto' }}>
                          {COLOR_SUGGESTIONS.filter(c => !parsePipe(colorsRaw).includes(c)).map(c => (
                            <button key={c}
                              onClick={() => { const curr = parsePipe(colorsRaw); setColorsRaw(curr.length ? c + ' | ' + curr.join(' | ') : c); setAttrSaved(true) }}
                              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: 'pointer', border: '1px solid #c3c4c7', background: '#fff', color: '#1d2327', fontFamily: 'inherit' }}>
                              {c}
                            </button>
                          ))}
                        </div>
                        {/* ── Ajoutés par vous (couleurs custom persistées) ── */}
                        {savedCustomColors.filter(c => !COLOR_SUGGESTIONS.includes(c)).length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ajoutés par vous</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {savedCustomColors.filter(c => !COLOR_SUGGESTIONS.includes(c)).map(c => (
                                <button key={c}
                                  onClick={() => { const curr = parsePipe(colorsRaw); if (!curr.includes(c)) { setColorsRaw(curr.length ? c + ' | ' + curr.join(' | ') : c); setAttrSaved(true) } }}
                                  disabled={parsePipe(colorsRaw).includes(c)}
                                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: parsePipe(colorsRaw).includes(c) ? 'default' : 'pointer', border: '1px solid #2271b1', background: parsePipe(colorsRaw).includes(c) ? '#e8f0fe' : '#fff', color: '#2271b1', fontFamily: 'inherit', opacity: parsePipe(colorsRaw).includes(c) ? 0.5 : 1 }}>
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input dir="rtl" value={customColorInput} onChange={e => setCustomColorInput(e.target.value)}
                            placeholder="Autre couleur (بالعربية)…"
                            onKeyDown={e => { if (e.key === 'Enter') addCustomColor(customColorInput) }}
                            style={{ flex: 1, padding: '5px 8px', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, fontFamily: 'inherit' }} />
                          <button onClick={() => addCustomColor(customColorInput)}
                            style={{ padding: '5px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>
                            + Ajouter
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── TAILLES ── */}
                    <div style={{ border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', padding: '8px 12px' }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>المقاس — Tailles</span>
                      </div>
                      <div style={{ padding: 12 }}>
                        {parsePipe(sizesRaw).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, padding: '8px', background: '#f0fff4', borderRadius: 4, border: '1px solid #b9f2c9' }}>
                            {parsePipe(sizesRaw).map(s => (
                              <button key={s}
                                onClick={() => { setSizesRaw(parsePipe(sizesRaw).filter(x => x !== s).join(' | ')); setAttrSaved(false) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#00a32a', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                                title="Cliquer pour retirer">
                                {s} ✕
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{ maxHeight: 170, overflowY: 'auto' }}>
                          {SIZE_GROUPS.map(group => {
                            const available = group.sizes.filter(s => !parsePipe(sizesRaw).includes(s))
                            if (!available.length) return null
                            return (
                              <div key={group.label} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group.label}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {available.map(s => (
                                    <button key={s}
                                      onClick={() => { const curr = parsePipe(sizesRaw); setSizesRaw(curr.length ? s + ' | ' + curr.join(' | ') : s); setAttrSaved(true) }}
                                      style={{ padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: 'pointer', border: '1px solid #c3c4c7', background: '#fff', color: '#1d2327', fontFamily: 'inherit' }}>
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* ── Ajoutés par vous (tailles custom persistées) ── */}
                        {savedCustomSizes.filter(s => !SIZE_SUGGESTIONS.includes(s)).length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ajoutés par vous</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {savedCustomSizes.filter(s => !SIZE_SUGGESTIONS.includes(s)).map(s => (
                                <button key={s}
                                  onClick={() => { const curr = parsePipe(sizesRaw); if (!curr.includes(s)) { setSizesRaw(curr.length ? s + ' | ' + curr.join(' | ') : s); setAttrSaved(true) } }}
                                  disabled={parsePipe(sizesRaw).includes(s)}
                                  style={{ padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: parsePipe(sizesRaw).includes(s) ? 'default' : 'pointer', border: '1px solid #00a32a', background: parsePipe(sizesRaw).includes(s) ? '#f0fff4' : '#fff', color: '#00a32a', fontFamily: 'inherit', opacity: parsePipe(sizesRaw).includes(s) ? 0.5 : 1 }}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* ── Suggestions par catégorie ── */}
                        <div style={{ marginTop: 10, borderTop: '1px solid #e5e5e5', paddingTop: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: catSizePicker ? 8 : 0 }}>
                            <span style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Suggestions :</span>
                            <select value={catSizePicker} onChange={e => setCatSizePicker(e.target.value)}
                              style={{ flex: 1, padding: '3px 6px', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 11, background: '#fff', color: '#1d2327' }}>
                              <option value="">— Choisir une catégorie…</option>
                              <option value="burkini">Burkini</option>
                              <option value="robes">Robes / Hidjab</option>
                              <option value="manteaux">Manteaux &amp; Vestes</option>
                              <option value="ensembles">Ensembles</option>
                              <option value="jupes">Jupes / Pantalons</option>
                              <option value="chaussures">Chaussures</option>
                              <option value="sacs">Sacs</option>
                              <option value="chapeaux">Chapeaux</option>
                              <option value="pareos">Paréos</option>
                              <option value="chemises">Chemises</option>
                            </select>
                          </div>
                          {catSizePicker && CATEGORY_SIZE_SUGGESTIONS[catSizePicker] && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {CATEGORY_SIZE_SUGGESTIONS[catSizePicker].map(group => {
                                const available = group.sizes.filter(s => !parsePipe(sizesRaw).includes(s))
                                if (!available.length) return null
                                return (
                                  <div key={group.label}>
                                    <div style={{ fontSize: 10, color: '#00a32a', fontWeight: 600, marginBottom: 3 }}>{group.label}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {available.map(s => (
                                        <button key={s}
                                          onClick={() => { const curr = parsePipe(sizesRaw); setSizesRaw(curr.length ? s + ' | ' + curr.join(' | ') : s); setAttrSaved(true) }}
                                          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: 'pointer', border: '1px solid #00a32a', background: '#f0fff4', color: '#00a32a', fontFamily: 'inherit' }}>
                                          {s}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input value={customSizeInput} onChange={e => setCustomSizeInput(e.target.value)}
                            placeholder="Autre taille…"
                            onKeyDown={e => { if (e.key === 'Enter') addCustomSize(customSizeInput) }}
                            style={{ flex: 1, padding: '5px 8px', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, fontFamily: 'inherit' }} />
                          <button onClick={() => addCustomSize(customSizeInput)}
                            style={{ padding: '5px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 12, cursor: 'pointer' }}>
                            + Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bouton Enregistrer */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={saveAttributes}
                      style={{ padding: '8px 16px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      ✓ Enregistrer — aller aux Variations
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

                  {/* ── Récapitulatif des attributs pour la génération ── */}
                  {varAction === 'generate' && (() => {
                    const colors = parsePipe(colorsRaw)
                    const sizes  = parsePipe(sizesRaw)
                    const manualAttrs = customAttrs.filter(a => a.forVariations && a.nameAr.trim() && parsePipe(a.valuesRaw).length > 0)
                    const missingName = customAttrs.filter(a => a.forVariations && !a.nameAr.trim() && parsePipe(a.valuesRaw).length > 0)
                    if (colors.length === 0 && sizes.length === 0 && manualAttrs.length === 0 && missingName.length === 0) return null
                    const total = Math.max(1, colors.length || 1) * Math.max(1, sizes.length || 1) * manualAttrs.reduce((acc, a) => acc * parsePipe(a.valuesRaw).length, 1)
                    return (
                      <div style={{ marginBottom: 12, padding: '10px 12px', background: '#f0f6fc', border: '1px solid #c3d4f7', borderRadius: 4, fontSize: 12, color: '#1d2327' }}>
                        <div style={{ fontWeight: 700, marginBottom: 6, color: '#2271b1' }}>Attributs qui seront utilisés pour générer les variations :</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: missingName.length > 0 ? 8 : 0 }}>
                          {colors.length > 0 && (
                            <span style={{ padding: '3px 10px', background: '#2271b1', color: '#fff', borderRadius: 20, fontSize: 11 }}>
                              🎨 Couleurs ({colors.length})
                            </span>
                          )}
                          {sizes.length > 0 && (
                            <span style={{ padding: '3px 10px', background: '#00a32a', color: '#fff', borderRadius: 20, fontSize: 11 }}>
                              📐 Tailles ({sizes.length})
                            </span>
                          )}
                          {manualAttrs.map(a => (
                            <span key={a._key} style={{ padding: '3px 10px', background: a.attrType === 'couleur' ? '#2271b1' : a.attrType === 'taille' ? '#00a32a' : '#92400e', color: '#fff', borderRadius: 20, fontSize: 11 }}>
                              ✏️ {a.nameAr} ({parsePipe(a.valuesRaw).length})
                            </span>
                          ))}
                          {(colors.length > 0 || sizes.length > 0 || manualAttrs.length > 0) && (
                            <span style={{ padding: '3px 10px', background: '#f0f0f0', color: '#50575e', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              = {total} variation{total > 1 ? 's' : ''} max
                            </span>
                          )}
                        </div>
                        {missingName.length > 0 && (
                          <div style={{ fontSize: 11, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 3, padding: '4px 8px' }}>
                            ⚠ {missingName.length} attribut(s) ignoré(s) : retournez dans Attributs et remplissez le nom arabe
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Prix rapide pour toutes les variations ──────────── */}
                  {variations.length > 0 && (
                    <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 3, padding: '10px 14px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6d4c0f' }}>
                        💰 Définir un prix pour toutes les variations :
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="number" min="0" placeholder="Prix régulier (DA)"
                          id="bulk-regular"
                          style={{ ...inp, maxWidth: 160, fontSize: 13 }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById('bulk-regular') as HTMLInputElement
                            const v = parseFloat(el?.value ?? '')
                            if (!isNaN(v) && v > 0) {
                              setVariations(p => p.map(x => ({ ...x, regularPrice: v })))
                              if (el) el.value = ''
                              showToast(`Prix régulier ${v} DA appliqué à ${variations.length} variation(s) ✓`, true)
                            }
                          }}
                          style={{ padding: '6px 14px', background: '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Appliquer à tous
                        </button>
                        <span style={{ fontSize: 12, color: '#9a7a00' }}>ou</span>
                        <input
                          type="number" min="0" placeholder="Prix promo (DA)"
                          id="bulk-sale"
                          style={{ ...inp, maxWidth: 160, fontSize: 13 }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById('bulk-sale') as HTMLInputElement
                            const v = parseFloat(el?.value ?? '')
                            if (!isNaN(v) && v > 0) {
                              setVariations(p => p.map(x => ({ ...x, salePrice: v })))
                              if (el) el.value = ''
                              showToast(`Prix promo ${v} DA appliqué à ${variations.length} variation(s) ✓`, true)
                            }
                          }}
                          style={{ padding: '6px 14px', background: '#e93d91', border: '1px solid #c4197a', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Appliquer promo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Quantité rapide pour toutes les variations ──────────── */}
                  {variations.length > 0 && (
                    <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 3, padding: '10px 14px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#2e7d32' }}>
                        📦 Définir une quantité pour toutes les variations :
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="number" min="0" placeholder="Quantité en stock"
                          id="bulk-stock"
                          style={{ ...inp, maxWidth: 160, fontSize: 13 }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById('bulk-stock') as HTMLInputElement
                            const v = parseInt(el?.value ?? '', 10)
                            if (!isNaN(v) && v >= 0) {
                              setVariations(p => p.map(x => ({ ...x, stock: v, inStock: v > 0 })))
                              if (el) el.value = ''
                              showToast(`Stock ${v} appliqué à ${variations.length} variation(s) ✓`, true)
                            }
                          }}
                          style={{ padding: '6px 14px', background: '#388e3c', border: '1px solid #1b5e20', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Appliquer à tous
                        </button>
                      </div>
                    </div>
                  )}

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
                          const varCustomAttrsCurrent = customAttrs.filter(a => a.forVariations && parsePipe(a.valuesRaw).length > 0)
                          const label = [v.colorAr, v.size, ...varCustomAttrsCurrent.map(a => v.customValues?.[a.nameAr]).filter((x): x is string => Boolean(x))].filter(Boolean).join(' / ') || `Variation ${(varPage - 1) * VARS_PER_PAGE + idx + 1}`
                          const hasPrice = v.regularPrice > 0
                          return (
                            <div key={v._key} style={{ borderBottom: idx < pagedVars.length - 1 ? '1px solid #e5e5e5' : 'none' }}>
                              {/* ─── En-tête variation (collapsed) ─────────── */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: isOpen ? '#f0f6fc' : idx % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                                onClick={() => toggleExpand(v._key)}>
                                {/* Indicateur ouvert/fermé */}
                                <span style={{ fontSize: 12, color: '#646970', width: 14, flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
                                {/* Miniature — image de variation ou placeholder */}
                                <div style={{ width: 30, height: 30, borderRadius: 3, background: '#f0f0f0', border: '1px solid #ddd', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa' }}>
                                  {v.variationImageUrl
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={v.variationImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : 'IMG'
                                  }
                                </div>
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
                                      <div
                                        onClick={() => {
                                          varImageTargetKey.current = v._key
                                          varImageInputRef.current?.click()
                                        }}
                                        style={{
                                          width: 70, height: 70, border: '1px solid #c3c4c7', borderRadius: 3,
                                          background: '#f9f9f9', cursor: 'pointer', overflow: 'hidden',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: 10, color: '#2271b1', textAlign: 'center', position: 'relative',
                                        }}
                                        title="Cliquer pour choisir une image"
                                      >
                                        {v.variationImageUploading ? (
                                          <div style={{ width: 20, height: 20, border: '2px solid #c3c4c7', borderTopColor: '#2271b1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        ) : v.variationImageUrl ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={v.variationImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <span style={{ lineHeight: 1.2 }}>📷<br/>Photo</span>
                                        )}
                                      </div>
                                      {v.variationImageUrl && !v.variationImageUploading && (
                                        <button
                                          onClick={e => { e.stopPropagation(); updateVar(v._key, { variationImageId: '', variationImageUrl: '' }) }}
                                          style={{ marginTop: 3, width: 70, padding: '2px 0', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 3, color: '#991b1b', fontSize: 10, cursor: 'pointer' }}
                                        >
                                          Retirer
                                        </button>
                                      )}
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
                                      {/* Attributs personnalisés pour cette variation */}
                                      {customAttrs.filter(a => a.forVariations && parsePipe(a.valuesRaw).length > 0).map(attr => (
                                        <div key={attr._key}>
                                          <label style={{ ...lbl, fontSize: 12 }}>{attr.nameAr || attr.name}</label>
                                          <select
                                            value={v.customValues?.[attr.nameAr] ?? ''}
                                            onChange={e => updateVar(v._key, { customValues: { ...v.customValues, [attr.nameAr]: e.target.value } })}
                                            style={{ ...inp, fontSize: 12 }}>
                                            <option value="">— Aucune —</option>
                                            {parsePipe(attr.valuesRaw).map(val => <option key={val} value={val}>{val}</option>)}
                                          </select>
                                        </div>
                                      ))}
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
                <select value={visibility} onChange={e => setVisibility(e.target.value as 'public' | 'private')}
                  style={{ padding: '4px 6px', border: '1px solid #8c8f94', borderRadius: 3, fontSize: 12, background: '#fff', color: visibility === 'private' ? '#b45309' : '#1d2327', cursor: 'pointer' }}>
                  <option value="public">Public</option>
                  <option value="private">Privé 🔒</option>
                </select>
              </div>
              {visibility === 'private' && (
                <p style={{ fontSize: 11, color: '#b45309', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 3, padding: '5px 8px', marginBottom: 8, lineHeight: 1.4 }}>
                  🔒 Produit privé — non visible sur la boutique, accessible seulement via son lien direct.
                </p>
              )}
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
              {/* Input caché partagé pour toutes les images de variations */}
              <input ref={varImageInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleVarImageFile(e.target.files)} />
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
