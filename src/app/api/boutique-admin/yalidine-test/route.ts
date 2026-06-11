import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/boutique-admin/yalidine-test?apiId=X&apiToken=Y
 * Teste les credentials Yalidine côté serveur pour éviter le blocage CORS
 * quand le navigateur appelle api.yalidine.app directement.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const apiId    = searchParams.get('apiId')
  const apiToken = searchParams.get('apiToken')

  if (!apiId || !apiToken) {
    return NextResponse.json({ ok: false, error: 'Paramètres manquants' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.yalidine.app/v1/wilayas/?page_size=1', {
      headers: {
        'X-API-ID':    apiId,
        'X-API-TOKEN': apiToken,
      },
    })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch (err) {
    console.error('[yalidine-test]', err)
    return NextResponse.json({ ok: false, error: 'Erreur réseau' }, { status: 200 })
  }
}
