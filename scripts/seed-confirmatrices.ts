/**
 * Script de création des comptes confirmatrices
 * Exécuter avec : npx tsx scripts/seed-confirmatrices.ts
 *
 * Crée 3 comptes confirmatrices si ils n'existent pas déjà.
 */

import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

const CONFIRMATRICES = [
  {
    email: 'confirmatrice01@boutique-she.dz',
    password: 'She2026@01',
    firstName: 'Confirmatrice',
    lastName: '01',
    role: 'confirmatrice',
  },
  {
    email: 'confirmatrice02@boutique-she.dz',
    password: 'She2026@02',
    firstName: 'Confirmatrice',
    lastName: '02',
    role: 'confirmatrice',
  },
  {
    email: 'confirmatrice03@boutique-she.dz',
    password: 'She2026@03',
    firstName: 'Confirmatrice',
    lastName: '03',
    role: 'confirmatrice',
  },
]

async function seedConfirmatrices() {
  console.log('🔐 Création des comptes confirmatrices...\n')
  const payload = await getPayload({ config: configPromise })

  for (const conf of CONFIRMATRICES) {
    // Vérifier si le compte existe déjà
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: conf.email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      console.log(`⏭️  ${conf.email} — existe déjà`)
      continue
    }

    await payload.create({
      collection: 'users',
      data: {
        email: conf.email,
        password: conf.password,
        firstName: conf.firstName,
        lastName: conf.lastName,
        role: conf.role as 'confirmatrice',
      },
    })

    console.log(`✅ ${conf.email} — créé avec succès`)
    console.log(`   Mot de passe : ${conf.password}`)
  }

  console.log('\n✨ Comptes confirmatrices configurés.')
  console.log('\nRécapitulatif:')
  CONFIRMATRICES.forEach((c) => {
    console.log(`  • ${c.email}  /  ${c.password}`)
  })
  process.exit(0)
}

seedConfirmatrices().catch((err) => {
  console.error('Erreur:', err)
  process.exit(1)
})
