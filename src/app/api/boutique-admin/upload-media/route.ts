import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Upload d'image vers la collection Media sans authentification Payload
// Utilisé par le formulaire produit (boutique-admin) qui n'a pas de session Payload
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    // Lire le fichier en buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await payload.create({
      collection: 'media',
      overrideAccess: true,
      data: { alt: file.name },
      file: {
        data:     buffer,
        mimetype: file.type,
        name:     file.name,
        size:     file.size,
      },
    })

    // Convertir l'URL Payload (/api/media/file/...) en URL publique (/media/...)
    const rawUrl = (result as { url?: string }).url ?? ''
    const publicUrl = rawUrl
      .replace(/^https?:\/\/[^/]+\/api\/media\/file\//, '/media/')
      .replace(/^\/api\/media\/file\//, '/media/')

    return NextResponse.json({ id: String(result.id), url: publicUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload-media] ERREUR:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
