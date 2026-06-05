#!/usr/bin/env node
/**
 * Script d'import des produits WooCommerce → Payload CMS
 *
 * UTILISATION : npm run import:products
 * Prérequis : le serveur Next.js doit tourner (npm run dev)
 *
 * Ce script appelle la route API /api/admin/import-products
 * qui s'exécute dans le contexte Next.js (résout les problèmes d'env Payload).
 */

import fs from 'fs'
import path from 'path'

// Lire le PAYLOAD_SECRET depuis .env.local
const envPath = path.join(process.cwd(), '.env.local')
let importKey = 'dev-import'
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const match = envContent.match(/^PAYLOAD_SECRET=(.+)$/m)
  if (match) importKey = match[1].trim()
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

async function main() {
  console.log('🚀 Import des produits WooCommerce → Payload CMS')
  console.log(`   Serveur : ${SERVER_URL}`)
  console.log('   (le serveur Next.js doit être lancé : npm run dev)\n')

  // Vérifier que le CSV existe
  const csvPath = path.join(process.cwd(), 'data/legacy/produits.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`✗ CSV introuvable : ${csvPath}`)
    console.error('  → Placer le fichier produits.csv dans data/legacy/')
    process.exit(1)
  }
  console.log(`✓ CSV trouvé : ${csvPath}`)

  // Vérifier que le serveur est en ligne
  try {
    const check = await fetch(`${SERVER_URL}/api/admin/import-products`, {
      headers: { 'x-import-key': importKey },
    })
    if (!check.ok && check.status !== 401) {
      console.error(`✗ Serveur inaccessible (${check.status}) — lancez npm run dev d'abord`)
      process.exit(1)
    }
    console.log('✓ Serveur accessible\n')
  } catch {
    console.error(`✗ Impossible de contacter ${SERVER_URL}`)
    console.error('  → Lancez le serveur avec : npm run dev')
    process.exit(1)
  }

  // Lancer l'import
  console.log('⏳ Import en cours (peut prendre 5-15 min selon les images)...\n')

  try {
    const res = await fetch(`${SERVER_URL}/api/admin/import-products`, {
      method: 'POST',
      headers: { 'x-import-key': importKey },
      signal: AbortSignal.timeout(30 * 60 * 1000), // 30 min max
    })

    const data = await res.json() as {
      success?: boolean
      message?: string
      stats?: {
        categories: { created: number; skipped: number; errors: number }
        products: { created: number; updated: number; errors: number }
        variations: { created: number; errors: number }
        images: { downloaded: number; cached: number; errors: number }
        incomplete: string[]
      }
      error?: string
    }

    if (!res.ok || !data.success) {
      console.error('✗ Erreur :', data.error ?? 'inconnue')
      process.exit(1)
    }

    console.log('═══ Rapport final ═══')
    const s = data.stats!
    console.log(`Catégories : ${s.categories.created} créées, ${s.categories.skipped} existantes, ${s.categories.errors} erreurs`)
    console.log(`Produits   : ${s.products.created} créés, ${s.products.updated} mis à jour, ${s.products.errors} erreurs`)
    console.log(`Variations : ${s.variations.created} importées, ${s.variations.errors} erreurs`)
    console.log(`Images     : ${s.images.downloaded} téléchargées, ${s.images.cached} du cache, ${s.images.errors} erreurs`)

    if (s.incomplete.length > 0) {
      console.log(`\n⚠ Incomplets (${s.incomplete.length}) :`)
      s.incomplete.slice(0, 10).forEach(msg => console.log(`  - ${msg}`))
    }

    console.log('\n✅ Import terminé !')
  } catch (err) {
    console.error('✗ Erreur réseau :', err)
    process.exit(1)
  }
}

main()
