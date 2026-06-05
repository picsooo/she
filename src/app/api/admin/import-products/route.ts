import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'

// Sécurité : clé secrète obligatoire dans l'en-tête X-Import-Key
const IMPORT_KEY = process.env.PAYLOAD_SECRET ?? 'dev-import'

// Tables de traduction (identiques au script d'import)
// Traduction FR→AR des couleurs (insensible à la casse dans le lookup)
const COLOR_MAP_RAW: Record<string, string> = {
  'blanc': 'أبيض', 'blanc cassé': 'أبيض مكسور', 'crème': 'كريمي', 'creme': 'كريمي',
  'noir': 'أسود', 'denim noir': 'جينز أسود',
  'rose': 'وردي', 'rose poudré': 'وردي ناعم', 'rose poudrée': 'وردي ناعم',
  'rose fushia': 'وردي فوشيا', 'rose cerise': 'وردي قرمزي', 'rose clair': 'وردي فاتح',
  'fushia': 'فوشيا', 'fuchsia': 'فوشيا', 'cerise': 'كرزي',
  'bleu': 'أزرق', 'bleu marine': 'كحلي', 'bleu nuit': 'أزرق ليلي',
  'bleu ciel': 'أزرق سماوي', 'bleu jean': 'جينز أزرق', 'denim beige': 'جينز بيج',
  'rouge': 'أحمر', 'bordeaux': 'عنابي', 'brique': 'طوبي',
  'vert': 'أخضر', 'vert kaki': 'أخضر كاكي', 'vert clair': 'أخضر فاتح',
  'vert pistache': 'أخضر فستقي', 'pistache': 'فستقي', "vert d'eau": 'أخضر مائي',
  'vert eau': 'أخضر مائي',
  'gris': 'رمادي', 'gris clair': 'رمادي فاتح', 'gris claire': 'رمادي فاتح',
  'gris foncé': 'رمادي غامق', 'gris fonce': 'رمادي غامق',
  'beige': 'بيج', 'beige rosé': 'بيج وردي', 'beige rose': 'بيج وردي', 'taupe': 'بيج غامق',
  'marron': 'بني', 'marron chocolat': 'بني شوكولاتة', 'marron claire': 'بني فاتح',
  'marron nègre': 'بني غامق', 'marron negre': 'بني غامق', 'caramel': 'كراميل',
  'miel': 'عسلي', 'camel': 'جملي',
  'violet': 'بنفسجي', 'aubergine': 'باذنجاني',
  'orange': 'برتقالي', 'orange brique': 'برتقالي طوبي', 'pêche': 'خوخي', 'peche': 'خوخي',
  'jaune': 'أصفر',
  'or': 'ذهبي',
  'kaki': 'كاكي', 'corail': 'مرجاني',
  'turquoise': 'تركواز', 'nude': 'بشرة', 'moutarde': 'خردلي',
}
// Lookup insensible à la casse
function translateColor(colorFr: string): string {
  const key = colorFr.toLowerCase().trim()
  return COLOR_MAP_RAW[key] ?? colorFr.trim()
}
const CATEGORY_MAP: Record<string, string> = {
  'Burkini': 'بوركيني', 'Burkini SHE': 'بوركيني شي',
  'Robe Hidjab': 'فستان حجاب', 'Manteaux et vestes': 'معاطف وسترات',
  'Ensemble': 'طقم', 'Sacs': 'حقائب', 'Chaussures': 'أحذية',
  'Pareo': 'باريو', 'Jupe': 'تنورة', 'Chemise': 'قميص',
  'Pantalon': 'بنطال', 'Robe': 'فستان', 'Tunique': 'تونيك',
  'Abaya': 'عباية', 'Kaftan': 'قفطان', 'Accessoires': 'إكسسوارات',
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[\s\u00a0]+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '') || `product-${Date.now()}`
}

// Note: le CSV WooCommerce utilise l'apostrophe typographique U+2019 (') dans les noms de colonnes
// ex: "Nom de l\u2019attribut 1" et non "Nom de l'attribut 1" (U+0027)
function parseAttributes(row: Record<string, string>) {
  let colorFr = '', size = ''
  for (let i = 1; i <= 3; i++) {
    const name = (row[`Nom de l\u2019attribut ${i}`] ?? row[`Nom de l'attribut ${i}`] ?? '').trim()
    const value = (row[`Valeur(s) de l\u2019attribut ${i}`] ?? row[`Valeur(s) de l'attribut ${i}`] ?? '').trim()
    if (name === 'الألوان') colorFr = value
    if (name === 'المقاس') size = value
  }
  return { colorFr, size }
}

// Route GET — statut de l'import
export async function GET(req: NextRequest) {
  if (req.headers.get('x-import-key') !== IMPORT_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const csvPath = path.join(process.cwd(), 'data/legacy/produits.csv')
  return NextResponse.json({
    csvExists: fs.existsSync(csvPath),
    csvPath,
  })
}

// Route POST — lancer l'import
export async function POST(req: NextRequest) {
  if (req.headers.get('x-import-key') !== IMPORT_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const csvPath = path.join(process.cwd(), 'data/legacy/produits.csv')
  const imagesDir = path.join(process.cwd(), 'data/legacy/images')

  if (!fs.existsSync(csvPath)) {
    return NextResponse.json({ error: `CSV introuvable: ${csvPath}` }, { status: 404 })
  }
  fs.mkdirSync(imagesDir, { recursive: true })

  const payload = await getPayload({ config: configPromise })

  const stats = {
    categories: { created: 0, skipped: 0, errors: 0 },
    products: { created: 0, updated: 0, errors: 0 },
    variations: { created: 0, errors: 0 },
    images: { downloaded: 0, cached: 0, errors: 0 },
    incomplete: [] as string[],
  }

  // Parser CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  // IMPORTANT : trim les noms de colonnes — le CSV WooCommerce a des espaces trailing
  // ex: "Valeur(s) de l'attribut 1 " → "Valeur(s) de l'attribut 1"
  const rows: Record<string, string>[] = parse(csvContent, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true, bom: true,
    relax_quotes: true, relax_column_count: true,
  })

  const parents = rows.filter(r => r['Type'] === 'variable' || r['Type'] === 'simple')
  const variations = rows.filter(r => (r['Type'] ?? '').includes('variation'))

  // ── PASSE 1 : Catégories ────────────────────────────────────────────
  const categoryMap = new Map<string, string>()

  for (const row of parents) {
    const categoriesRaw = row['Catégories']?.trim() ?? ''
    if (!categoriesRaw) continue
    const cats = categoriesRaw.split(',').map(c => c.trim())

    for (const catPath of cats) {
      const parts = catPath.split('>').map(p => p.trim())
      let parentId: string | null = null

      for (const catName of parts) {
        if (!catName) continue
        const slug = slugify(catName)
        if (!categoryMap.has(slug)) {
          const nameAr = CATEGORY_MAP[catName] ?? catName
          try {
            const existing = await payload.find({
              collection: 'categories',
              where: { slug: { equals: slug } }, limit: 1,
            })
            let catId: string
            if (existing.docs.length > 0) {
              catId = existing.docs[0].id as string
              stats.categories.skipped++
            } else {
              const created = await payload.create({
                collection: 'categories',
                data: { nameAr, nameFr: catName, slug, ...(parentId ? { parent: parentId } : {}) },
              })
              catId = created.id as string
              stats.categories.created++
            }
            categoryMap.set(slug, catId)
            parentId = catId
          } catch { stats.categories.errors++ }
        } else {
          parentId = categoryMap.get(slug) ?? null
        }
      }
    }
  }

  // ── PASSE 2 : Produits parents + images ────────────────────────────
  const productLegacyMap = new Map<string, string>()

  for (const row of parents) {
    const legacyId = row['ID']?.trim()
    const nameFr = row['Nom']?.trim() ?? ''
    if (!legacyId || !nameFr) continue

    const slug = slugify(nameFr) || `product-${legacyId}`
    const nameAr = nameFr

    const categoriesRaw = row['Catégories']?.trim() ?? ''
    const categoryIds: string[] = []
    if (categoriesRaw) {
      for (const catPath of categoriesRaw.split(',').map(c => c.trim())) {
        const deepest = catPath.split('>').pop()?.trim() ?? ''
        const catId = categoryMap.get(slugify(deepest))
        if (catId) categoryIds.push(catId)
      }
    }

    // Télécharger les images
    const imagesRaw = row['Images']?.trim() ?? ''
    const imageUrls = [...new Set(imagesRaw.split(',').map(u => u.trim()).filter(Boolean))]
    const mediaIds: string[] = []

    for (const url of imageUrls) {
      if (!url) continue
      try {
        const existing = await payload.find({
          collection: 'media',
          where: { legacyUrl: { equals: url } }, limit: 1,
        })
        if (existing.docs.length > 0) {
          mediaIds.push(existing.docs[0].id as string)
          stats.images.cached++
          continue
        }

        // Télécharger avec 3 tentatives
        const filename = path.basename(url.split('?')[0])
        const localPath = path.join(imagesDir, filename)
        let downloaded = false

        if (fs.existsSync(localPath)) {
          downloaded = true
        } else {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
              if (!res.ok) throw new Error(`HTTP ${res.status}`)
              const buffer = Buffer.from(await res.arrayBuffer())
              fs.writeFileSync(localPath, buffer)
              downloaded = true
              stats.images.downloaded++
              break
            } catch {
              if (attempt === 3) stats.images.errors++
              else await new Promise(r => setTimeout(r, 1000 * attempt))
            }
          }
        }

        if (downloaded && fs.existsSync(localPath)) {
          const fileBuffer = fs.readFileSync(localPath)
          const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg'
          const media = await payload.create({
            collection: 'media',
            data: { alt: nameAr, legacyUrl: url },
            file: { data: fileBuffer, mimetype: mimeType, name: filename, size: fileBuffer.length },
          })
          mediaIds.push(media.id as string)
        }
      } catch { stats.images.errors++ }
    }

    if (imageUrls.length > 0 && mediaIds.length === 0) {
      stats.incomplete.push(`${nameFr} (${legacyId}) — aucune image`)
    }

    try {
      const existingProduct = await payload.find({
        collection: 'products',
        where: { legacyId: { equals: legacyId } }, limit: 1,
      })
      const productData = {
        nameAr, nameFr, slug, legacyId, status: 'published' as const,
        category: categoryIds,
        images: mediaIds.map(id => ({ image: id })),
        variations: [],
        aiGenerated: false,
      }
      let productId: string
      if (existingProduct.docs.length > 0) {
        const updated = await payload.update({
          collection: 'products', id: existingProduct.docs[0].id as string, data: productData,
        })
        productId = updated.id as string
        stats.products.updated++
      } else {
        const created = await payload.create({ collection: 'products', data: productData })
        productId = created.id as string
        stats.products.created++
      }
      productLegacyMap.set(legacyId, productId)
    } catch (err) {
      console.error(`Produit ${nameFr}:`, err)
      stats.products.errors++
    }
  }

  // ── PASSE 3 : Variations ────────────────────────────────────────────
  const variationsByParent = new Map<string, Record<string, string>[]>()
  for (const varRow of variations) {
    const parentRaw = varRow['Parent']?.trim() ?? ''
    const parentLegacyId = parentRaw.replace('id:', '')
    if (!parentLegacyId) continue
    if (!variationsByParent.has(parentLegacyId)) variationsByParent.set(parentLegacyId, [])
    variationsByParent.get(parentLegacyId)!.push(varRow)
  }

  for (const [parentLegacyId, varRows] of variationsByParent) {
    const productId = productLegacyMap.get(parentLegacyId)
    if (!productId) continue

    const variationsData = varRows.map(varRow => {
      const { colorFr, size } = parseAttributes(varRow)
      const regularPrice = parseFloat((varRow['Tarif régulier'] ?? '').replace(/[^\d.]/g, '')) || 0
      const salePriceRaw = varRow['Tarif promo'] ?? ''
      const salePrice = salePriceRaw ? parseFloat(salePriceRaw.replace(/[^\d.]/g, '')) || null : null
      const stock = parseInt(varRow['Stock'] ?? '0', 10) || 0
      const inStockRaw = varRow['En stock\u00a0?'] ?? varRow['En stock ?'] ?? 'no'
      const inStock = inStockRaw.toLowerCase() === 'yes' || inStockRaw === '1'
      if (regularPrice === 0) stats.incomplete.push(`Variation ${varRow['ID']} — prix 0`)
      return {
        colorAr: translateColor(colorFr),
        colorFr: colorFr.trim(),
        size: size.trim() || 'UNIQUE',
        regularPrice, salePrice, stock, inStock,
        legacyVariationId: varRow['ID']?.trim() ?? '',
      }
    })

    try {
      await payload.update({ collection: 'products', id: productId, data: { variations: variationsData } })
      stats.variations.created += variationsData.length
    } catch { stats.variations.errors++ }
  }

  return NextResponse.json({
    success: true,
    stats,
    message: `Import terminé: ${stats.products.created} produits créés, ${stats.variations.created} variations, ${stats.images.downloaded} images téléchargées`,
  })
}
