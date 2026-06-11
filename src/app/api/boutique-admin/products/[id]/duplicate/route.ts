import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

function makeSlug(text: string): string {
  const ascii = text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (ascii || 'product') + '-copie-' + Date.now()
}

/**
 * POST /api/boutique-admin/products/:id/duplicate
 * Duplique un produit en brouillon — copie toutes ses données sauf l'ID et le slug.
 * Le nom est préfixé "[Copie]" pour que le client sache que c'est une copie.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    // Charger le produit original avec ses relations (depth 2 pour les images)
    const original = await payload.findByID({
      collection: 'products',
      id,
      depth: 2,
      overrideAccess: true,
    })

    if (!original) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    // Nom de la copie
    const copyNameAr = `[نسخة] ${original.nameAr}`

    // Nettoyer les variations — retirer l'ID pour que Payload génère de nouveaux IDs
    const variations = (original.variations ?? []).map((v: Record<string, unknown>) => {
      const { id: _id, legacyVariationId: _lvid, ...rest } = v
      return rest
    })

    // Nettoyer les images — garder uniquement la référence mediaId (relation upload)
    const images = (original.images ?? []).map((img: Record<string, unknown>) => {
      const { id: _iid, ...rest } = img
      // Si l'image est populée (objet), réduire à son ID
      const imageField = rest.image
      if (imageField && typeof imageField === 'object' && 'id' in imageField) {
        return { image: (imageField as { id: string }).id }
      }
      return rest
    })

    // Nettoyer les attributs personnalisés
    const customAttributes = (original.customAttributes ?? []).map((a: Record<string, unknown>) => {
      const { id: _id, ...rest } = a
      return rest
    })

    // Construire les données de la copie
    const copyData = {
      nameAr: copyNameAr,
      nameFr: original.nameFr ? `[Copie] ${original.nameFr}` : undefined,
      slug: makeSlug(original.nameAr ?? ''),
      descriptionAr: original.descriptionAr,
      shortDescriptionAr: original.shortDescriptionAr,
      purchaseNote: original.purchaseNote,
      status: 'draft' as const,         // toujours brouillon pour ne pas publier accidentellement
      visibility: original.visibility ?? 'public',
      sku: original.sku ? `${original.sku}-copie` : undefined,
      category: (original.category ?? []).map((c: Record<string, unknown>) =>
        typeof c === 'string' ? c : c.id
      ),
      variations,
      images,
      customAttributes,
      aiGenerated: original.aiGenerated ?? false,
    }

    const doc = await payload.create({
      collection: 'products',
      data: copyData,
      overrideAccess: true,
    })

    return NextResponse.json({ doc }, { status: 201 })
  } catch (err) {
    console.error('[boutique-admin/products/:id/duplicate POST]', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
