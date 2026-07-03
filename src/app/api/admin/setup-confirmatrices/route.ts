import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// ── Endpoint de création des 3 comptes confirmatrices ────────────────────────
// Protection : requiert la clé PAYLOAD_SECRET en header x-setup-key
// À appeler UNE SEULE FOIS après le déploiement.
// GET /api/admin/setup-confirmatrices (avec header x-setup-key)

const CONFIRMATRICES = [
  { num: 1, firstName: 'Confirmatrice', lastName: '01', code: 'SHE-CONF-01' },
  { num: 2, firstName: 'Confirmatrice', lastName: '02', code: 'SHE-CONF-02' },
  { num: 3, firstName: 'Confirmatrice', lastName: '03', code: 'SHE-CONF-03' },
]

export async function GET(req: NextRequest) {
  // Vérification de la clé de setup
  const key = req.headers.get('x-setup-key') ?? req.nextUrl.searchParams.get('key')
  const secret = process.env.PAYLOAD_SECRET
  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const payload = await getPayload({ config: configPromise })
  const results: Array<{ email: string; status: 'created' | 'already_exists'; code: string }> = []

  for (const conf of CONFIRMATRICES) {
    const email = `conf0${conf.num}@boutique-she.com`

    // Vérifier si le compte existe déjà
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      results.push({ email, status: 'already_exists', code: conf.code })
      continue
    }

    // Créer le compte
    await payload.create({
      collection: 'users',
      data: {
        email,
        password: conf.code,
        firstName: conf.firstName,
        lastName: conf.lastName,
        role: 'confirmatrice',
      },
      overrideAccess: true,
    })

    results.push({ email, status: 'created', code: conf.code })
  }

  return NextResponse.json({
    message: 'Configuration terminée',
    accounts: results,
    instructions: [
      '✅ Comptes créés. Transmettez les codes ci-dessous à chaque confirmatrice.',
      '⚠️  Changez les codes depuis /admin > Users après la première connexion.',
      '',
      ...results.map(r =>
        `${r.status === 'created' ? '🆕' : '✓'} ${r.email} — Code: ${r.code}`
      ),
    ],
  })
}
