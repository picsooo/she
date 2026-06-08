'use client'
import React, { useEffect, useState } from 'react'

interface Category { id: string; nameAr: string; name?: string; parent?: { nameAr?: string } }

export default function CategoriesPage() {
  const [cats,       setCats]       = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [newName,    setNewName]    = useState('')
  const [saving,     setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/categories?limit=100&sort=nameAr&depth=1').then(r => r.json())
    setCats(data.docs ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!newName.trim()) return
    setSaving(true)
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nameAr: newName, name: newName }),
    })
    setNewName('')
    setSaving(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette catégorie ?')) return
    setDeletingId(id)
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  return (
    <div style={{ maxWidth: 680, animation: 'fadeIn 0.25s ease' }}>

      {/* Titre */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Catégories</h1>
        <p style={{ fontSize: 13, color: '#6D7175', margin: '3px 0 0' }}>{cats.length} catégorie{cats.length > 1 ? 's' : ''}</p>
      </div>

      {/* Ajouter une catégorie */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: '#FCE7F3', border: '1px solid #F9A8D4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>+</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A' }}>Ajouter une catégorie</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Nom de la catégorie (arabe ou français)"
            className="admin-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={save}
            disabled={saving || !newName.trim()}
            className="admin-btn admin-btn-primary"
            style={{ opacity: !newName.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}
          >
            {saving ? '…' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {/* Liste */}
      <div className="admin-card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #F1F1F1',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#FAFAFA',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🗂️</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#1A1A1A' }}>Toutes les catégories</span>
          </div>
          <span style={{
            fontSize: 11, color: '#6D7175', background: '#F1F1F1',
            borderRadius: 20, padding: '3px 10px', fontWeight: 600,
          }}>{cats.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid #E3E5E7', borderTopColor: '#4A3DBC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : cats.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#9A9A9A' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
            Aucune catégorie — ajoutez-en une !
          </div>
        ) : (
          cats.map((c, i) => (
            <div
              key={c.id}
              className="admin-row-hover"
              style={{
                display: 'flex', alignItems: 'center', padding: '13px 20px',
                borderBottom: i < cats.length - 1 ? '1px solid #F7F7F7' : 'none',
                opacity: deletingId === c.id ? 0.4 : 1,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, marginRight: 14, flexShrink: 0,
                background: '#FEF3C7', border: '1px solid #FDE68A',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>🗂️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1A1A1A', fontSize: 14 }}>{c.nameAr}</div>
                {c.parent?.nameAr && (
                  <div style={{ fontSize: 11, color: '#9A9A9A', marginTop: 2 }}>
                    Sous-catégorie de : {c.parent.nameAr}
                  </div>
                )}
              </div>
              <button
                onClick={() => del(c.id)}
                disabled={deletingId === c.id}
                style={{
                  padding: '6px 14px', background: '#FEE2E2',
                  border: '1px solid #FCA5A5', color: '#991B1B',
                  borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
