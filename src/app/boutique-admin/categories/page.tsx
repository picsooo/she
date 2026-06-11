'use client'
/**
 * Page Catégories — Style WooCommerce
 * Formulaire ajout à gauche + tableau des catégories à droite
 */
import React, { useEffect, useState } from 'react'

interface Category { id: string | number; nameAr: string; name?: string; description?: string; parent?: { id: string | number; nameAr?: string } | null }

const input: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 3,
  border: '1px solid #8c8f94', background: '#fff', color: '#1d2327',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}
const label: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#1d2327', marginBottom: 4,
}
const hint: React.CSSProperties = { fontSize: 11, color: '#646970', marginTop: 3 }

export default function CategoriesPage() {
  const [cats,        setCats]        = useState<Category[]>([])
  const [loading,     setLoading]     = useState(true)
  const [deletingId,  setDeletingId]  = useState<string | number | null>(null)
  const [editingId,   setEditingId]   = useState<string | number | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  // Champs du formulaire
  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [parentId,    setParentId]    = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function toSlug(s: string) {
    return s.toLowerCase().trim().replace(/[\s\u0600-\u06FF]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/boutique-admin/categories?limit=200&sort=nameAr&depth=1')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCats(data.docs ?? [])
    } catch (err) {
      console.error('[categories load]', err)
      showToast('Erreur chargement catégories', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setName(''); setSlug(''); setParentId(''); setDescription(''); setEditingId(null)
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const body = {
        nameAr: name.trim(),
        nameFr: name.trim(),   // nameFr est required dans la collection
        ...(parentId ? { parent: parentId } : {}),
      }

      if (editingId) {
        // Mise à jour
        const res = await fetch(`/api/boutique-admin/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        showToast('Catégorie mise à jour ✓', true)
      } else {
        // Création
        const res = await fetch('/api/boutique-admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        showToast('Catégorie ajoutée ✓', true)
      }
      resetForm()
      await load()
    } catch { showToast('Erreur lors de la sauvegarde', false) }
    finally { setSaving(false) }
  }

  async function del(id: string | number) {
    if (!confirm('Supprimer cette catégorie définitivement ?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/boutique-admin/categories/${id}`, { method: 'DELETE' })
      showToast('Catégorie supprimée', true)
      await load()
    } catch { showToast('Erreur suppression', false) }
    finally { setDeletingId(null) }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setName(cat.nameAr)
    setSlug('')
    setParentId(cat.parent?.id != null ? String(cat.parent.id) : '')
    setDescription(cat.description ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Catégories parentes disponibles (exclure soi-même en mode édition)
  const parentOptions = cats.filter(c => String(c.id) !== String(editingId))

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxWidth: 1100 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, padding: '12px 20px', borderRadius: 4,
          background: toast.ok ? '#d1e7dd' : '#f8d7da', border: `1px solid ${toast.ok ? '#badbcc' : '#f5c2c7'}`,
          color: toast.ok ? '#0f5132' : '#842029', fontWeight: 600, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.msg}
        </div>
      )}

      <h1 style={{ fontSize: 23, fontWeight: 400, color: '#1d2327', margin: '0 0 16px' }}>Catégories de produits</h1>

      {/* Layout deux colonnes */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Formulaire gauche ──────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', fontSize: 14, fontWeight: 600, color: '#1d2327' }}>
            {editingId ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
          </div>
          <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Nom */}
            <div>
              <label style={label}>Nom <span style={{ color: '#b32d2e' }}>*</span></label>
              <input value={name} onChange={e => { setName(e.target.value); if (!editingId) setSlug(toSlug(e.target.value)) }}
                placeholder="Ex: Robes / فساتين" style={input} />
              <p style={hint}>Le nom est la façon dont la catégorie apparaît sur le site.</p>
            </div>

            {/* Slug */}
            <div>
              <label style={label}>Identifiant (slug)</label>
              <input value={slug} onChange={e => setSlug(e.target.value)}
                placeholder="robes-femmes" style={{ ...input, fontFamily: 'monospace', fontSize: 12 }} />
              <p style={hint}>Auto-généré depuis le nom. URL-friendly.</p>
            </div>

            {/* Catégorie parente */}
            <div>
              <label style={label}>Catégorie parente</label>
              <select value={parentId} onChange={e => setParentId(e.target.value)} style={input}>
                <option value="">— Aucune —</option>
                {parentOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.nameAr}</option>
                ))}
              </select>
              <p style={hint}>Les catégories, contrairement aux tags, peuvent avoir une hiérarchie.</p>
            </div>

            {/* Description */}
            <div>
              <label style={label}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={4} placeholder="Description optionnelle de la catégorie…"
                style={{ ...input, resize: 'vertical', lineHeight: 1.6 }} />
              <p style={hint}>La description peut apparaître sur la page de catégorie.</p>
            </div>

            {/* Image de la catégorie */}
            <div>
              <label style={label}>Image</label>
              <div style={{ border: '1px dashed #c3c4c7', borderRadius: 3, padding: '20px', textAlign: 'center', background: '#f6f7f7', cursor: 'pointer', color: '#2271b1', fontSize: 12 }}
                onClick={() => {}}>
                + Téléverser / Choisir une image
              </div>
              <p style={hint}>Optionnel — image représentant la catégorie.</p>
            </div>

            {/* Boutons */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button onClick={save} disabled={saving || !name.trim()}
                style={{ flex: 1, padding: '8px 16px', background: saving || !name.trim() ? '#ccc' : '#2271b1', border: '1px solid #0a4b78', borderRadius: 3, color: '#fff', fontWeight: 700, fontSize: 13, cursor: !name.trim() ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Ajouter une catégorie'}
              </button>
              {editingId && (
                <button onClick={resetForm}
                  style={{ padding: '8px 12px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 13, cursor: 'pointer', color: '#50575e' }}>
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tableau droite ─────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '1px solid #c3c4c7', borderRadius: 4, overflow: 'hidden' }}>
          {/* Barre titre */}
          <div style={{ padding: '8px 12px 8px 14px', background: '#f6f7f7', borderBottom: '1px solid #c3c4c7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1d2327' }}>Catégories de produits</span>
            <span style={{ fontSize: 12, color: '#646970' }}>{cats.length} catégorie{cats.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#646970', fontSize: 13 }}>Chargement…</div>
          ) : cats.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#646970', fontSize: 13 }}>
              Aucune catégorie. Ajoutez-en une avec le formulaire à gauche.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f6f7f7' }}>
                  {['Nom', 'Description', 'Identifiant', 'Catégorie parente', 'Produits', ''].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#50575e', borderBottom: '1px solid #c3c4c7', borderRight: h ? '1px solid #f0f0f1' : 'none' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: i < cats.length - 1 ? '1px solid #f0f0f1' : 'none', background: String(editingId) === String(c.id) ? '#f0f6fc' : i % 2 === 0 ? '#fff' : '#fafafa', opacity: String(deletingId) === String(c.id) ? 0.4 : 1 }}>
                    <td style={{ padding: '10px 12px', borderRight: '1px solid #f0f0f1' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1d2327' }}>{c.nameAr}</div>
                      {c.name && c.name !== c.nameAr && <div style={{ fontSize: 11, color: '#646970' }}>{c.name}</div>}
                      {/* Actions inline au survol */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button onClick={() => startEdit(c)}
                          style={{ background: 'none', border: 'none', color: '#2271b1', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                          Modifier
                        </button>
                        <span style={{ color: '#ddd' }}>|</span>
                        <button onClick={() => del(c.id)} disabled={deletingId === c.id}
                          style={{ background: 'none', border: 'none', color: '#b32d2e', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#646970', borderRight: '1px solid #f0f0f1', maxWidth: 200 }}>
                      {c.description ? <span style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</span> : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#646970', fontFamily: 'monospace', borderRight: '1px solid #f0f0f1' }}>
                      {String(c.id).slice(-8)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#646970', borderRight: '1px solid #f0f0f1' }}>
                      {c.parent?.nameAr ? <span>{c.parent.nameAr}</span> : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: '#646970', textAlign: 'center', borderRight: '1px solid #f0f0f1' }}>
                      —
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => startEdit(c)}
                        style={{ padding: '5px 10px', background: '#f6f7f7', border: '1px solid #c3c4c7', borderRadius: 3, fontSize: 11, cursor: 'pointer', color: '#2271b1' }}>
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
