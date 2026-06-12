import { NextRequest, NextResponse } from 'next/server'
import { sendCapiEvent } from '@/lib/metaCapi'

// Route handler CAPI — reçoit un event depuis le client et l'envoie côté serveur à Meta.
// Avantage : contourne les ad-blockers et restrictions iOS (le serveur est de confiance).
// Le client envoie le même event_id que le pixel navigateur → Meta déduplique automatiquement.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      eventId, eventName, value, currency = 'DZD',
      contents, email, phone, firstName, lastName, city,
    } = body

    if (!eventId || !eventName) {
      return NextResponse.json({ error: 'eventId et eventName requis' }, { status: 400 })
    }

    const result = await sendCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: req.headers.get('referer') ?? undefined,
      value,
      currency,
      contents,
      user: {
        email,
        phone,
        firstName,
        lastName,
        city,
        ip:        req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
        fbp:       req.cookies.get('_fbp')?.value,
        fbc:       req.cookies.get('_fbc')?.value,
      },
    })

    return NextResponse.json(result.data, { status: result.ok ? 200 : 400 })
  } catch (err) {
    console.error('[api/meta-capi]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
