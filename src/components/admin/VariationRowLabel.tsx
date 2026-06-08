'use client'
import React from 'react'
import { useRowLabel } from '@payloadcms/ui'

// Affiche un résumé lisible dans chaque ligne de variation : "Rose · M (40-42) — 3 500 DZD"
const VariationRowLabel: React.FC = () => {
  const { data, rowNumber } = useRowLabel<{
    colorAr?: string
    size?: string
    regularPrice?: number
    salePrice?: number
    inStock?: boolean
  }>()

  const parts: string[] = []
  if (data.colorAr) parts.push(data.colorAr)
  if (data.size)    parts.push(data.size)

  const price = data.salePrice ?? data.regularPrice
  const priceStr = price ? new Intl.NumberFormat('fr-DZ').format(price) + ' DZD' : ''

  const stock = data.inStock ? '✅' : '❌'
  const num = (rowNumber ?? 0)

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600 }}>
      <span style={{
        background: '#F4F2F7', borderRadius: '6px',
        padding: '2px 8px', fontSize: '11px', color: '#6B7280', fontWeight: 700,
      }}>
        #{num + 1}
      </span>
      {parts.length > 0
        ? <span style={{ color: '#111827' }}>{parts.join(' · ')}</span>
        : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Nouvelle variation</span>
      }
      {priceStr && <span style={{ color: '#E93D91', fontWeight: 700 }}>{priceStr}</span>}
      <span style={{ fontSize: '12px' }}>{stock}</span>
    </span>
  )
}

export default VariationRowLabel
