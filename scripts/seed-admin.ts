/**
 * Script de seed — crée le compte administrateur par défaut
 * Usage : npm run seed:admin
 */
import { getPayload } from 'payload'
import config from '@payload-config'

async function seedAdmin() {
  console.log('🌱 Création du compte administrateur...')

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: 'wsaoudi@webminds.dz' } },
    limit: 1,
    overrideAccess: true,
  })

  if (docs.length > 0) {
    console.log('✓ Le compte admin existe déjà — aucun changement.')
    process.exit(0)
  }

  await payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: 'wsaoudi@webminds.dz',
      password: 'Boussada321',
      role: 'admin',
      firstName: 'Walid',
      lastName: 'Saoudi',
    },
  })

  console.log("✅ Compte admin créé avec succès !")
  console.log("   Email    : wsaoudi@webminds.dz")
  console.log("   Password : Boussada321")
  console.log("   Accès    : http://localhost:3000/admin")
  process.exit(0)
}

seedAdmin().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  console.error('❌ Erreur :', msg)
  process.exit(1)
})
