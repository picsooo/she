'use client'
/**
 * Page d'édition d'un produit — charge les données via l'API Payload
 * puis affiche le formulaire ProductForm pré-rempli.
 */
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductForm, { type InitialProduct } from '@/components/boutique-admin/ProductForm'

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<InitialProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/products/${id}?depth=2`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => setProduct(data))
      .catch(err => { if (err === 404) setNotFound(true) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(233,61,145,0.2)',
        borderTopColor: '#E93D91',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  if (notFound || !product) return (
    <div style={{ textAlign: 'center', padding: 64, color: 'rgba(255,255,255,0.3)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 16 }}>Produit introuvable</div>
    </div>
  )

  return <ProductForm productId={id} initial={product} />
}
