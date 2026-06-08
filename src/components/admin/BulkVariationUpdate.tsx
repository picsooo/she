'use client'

/**
 * Composant admin — Mise à jour groupée des variations
 * Permet de définir le même prix et/ou stock pour TOUTES les variations en un clic.
 * Affiché au-dessus du tableau des variations dans la fiche produit.
 */

import { useState } from 'react'
import { useFormFields, useForm } from '@payloadcms/ui'

export function BulkVariationUpdate() {
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkSalePrice, setBulkSalePrice] = useState('')
  const [bulkStock, setBulkStock] = useState('')
  const [applied, setApplied] = useState(false)

  const { dispatchFields } = useForm()
  const variationsField = useFormFields(([fields]) => fields['variations'])
  const variations = (variationsField?.value as unknown[]) ?? []

  const applyToAll = () => {
    if (!variations.length) return

    const updated = (variations as Record<string, unknown>[]).map((v) => ({
      ...v,
      ...(bulkPrice !== '' ? { regularPrice: Number(bulkPrice) } : {}),
      ...(bulkSalePrice !== '' ? { salePrice: Number(bulkSalePrice) } : {}),
      ...(bulkStock !== '' ? {
        stock: Number(bulkStock),
        inStock: Number(bulkStock) > 0,
      } : {}),
    }))

    dispatchFields({
      type: 'UPDATE',
      path: 'variations',
      value: updated,
    })

    setApplied(true)
    setTimeout(() => setApplied(false), 2000)

    // Réinitialiser les champs
    setBulkPrice('')
    setBulkSalePrice('')
    setBulkStock('')
  }

  if (!variations.length) return null

  return (
    <div
      style={{
        background: '#FFF0F7',
        border: '1px solid #E93D91',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <p style={{ fontWeight: 700, color: '#E93D91', marginBottom: '12px', fontSize: '13px' }}>
        ⚡ تعديل جماعي — Mise à jour groupée ({variations.length} variations)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Prix (DZD) — tous
          </label>
          <input
            type="number"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            placeholder="ex: 3500"
            style={{
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Prix promo (DZD) — tous
          </label>
          <input
            type="number"
            value={bulkSalePrice}
            onChange={(e) => setBulkSalePrice(e.target.value)}
            placeholder="ex: 2800"
            style={{
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: '#666', display: 'block', marginBottom: '4px' }}>
            Stock — toutes les variations
          </label>
          <input
            type="number"
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value)}
            placeholder="ex: 10"
            style={{
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={applyToAll}
        disabled={!bulkPrice && !bulkSalePrice && !bulkStock}
        style={{
          background: applied ? '#22c55e' : '#E93D91',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 20px',
          fontWeight: 700,
          fontSize: '12px',
          cursor: bulkPrice || bulkSalePrice || bulkStock ? 'pointer' : 'not-allowed',
          opacity: bulkPrice || bulkSalePrice || bulkStock ? 1 : 0.5,
          transition: 'background 0.2s',
        }}
      >
        {applied ? '✓ تم التطبيق على الكل!' : '⚡ تطبيق على جميع الـ variations'}
      </button>

      <p style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
        * اترك الحقل فارغاً إذا لا تريد تغيير هذه القيمة. لا يؤثر إلا على الحقول المملوءة.
      </p>
    </div>
  )
}
