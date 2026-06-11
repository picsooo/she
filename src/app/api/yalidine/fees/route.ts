import { NextRequest, NextResponse } from 'next/server'
import { getYalidineClient } from '@/lib/yalidine'
import { WILAYAS, COMMUNES } from '@/lib/algeria-geo'

/**
 * GET /api/yalidine/fees?wilayaCode=16&communeNameAr=باب الواد
 * Retourne les frais de livraison réels depuis l'API Yalidine pour la commune choisie.
 * Utilisé dans le checkout pour afficher le vrai tarif au lieu du tarif par défaut.
 *
 * Réponse : { home: number, desk: number, source: 'yalidine' | 'default' }
 * En cas d'erreur Yalidine, retourne { home: null, desk: null, source: 'error' }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const wilayaCode    = searchParams.get('wilayaCode')    // ex: "16"
  const communeNameAr = searchParams.get('communeNameAr') // ex: "باب الواد"

  if (!wilayaCode || !communeNameAr) {
    return NextResponse.json({ error: 'wilayaCode et communeNameAr requis' }, { status: 400 })
  }

  try {
    // Récupérer les paramètres de livraison (wilaya expéditeur + credentials)
    const settingsRes = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'}/api/globals/delivery-settings`,
      { cache: 'no-store' }
    )
    if (!settingsRes.ok) return NextResponse.json({ home: null, desk: null, source: 'error' })
    const settings = await settingsRes.json()

    // Si Yalidine non activé, retourner null (checkout utilisera les tarifs par défaut)
    if (!settings.yalidineEnabled || !settings.yalidineFromWilayaName) {
      return NextResponse.json({ home: null, desk: null, source: 'disabled' })
    }

    // Trouver l'ID wilaya source (vendeur) depuis le nom français configuré
    const fromWilaya = WILAYAS.find(w => w.nameFr === settings.yalidineFromWilayaName)
    if (!fromWilaya) {
      return NextResponse.json({ home: null, desk: null, source: 'error', error: 'Wilaya expéditeur introuvable' })
    }

    // Trouver l'ID wilaya destination depuis le code
    const toWilaya = WILAYAS.find(w => w.code === wilayaCode.padStart(2, '0'))
    if (!toWilaya) {
      return NextResponse.json({ home: null, desk: null, source: 'error', error: 'Wilaya destinataire introuvable' })
    }

    // Trouver la commune (pour avoir le nom français à matcher avec la réponse Yalidine)
    const commune = COMMUNES.find(
      c => c.wilayaCode === toWilaya.code && c.nameAr === communeNameAr
    )
    if (!commune) {
      return NextResponse.json({ home: null, desk: null, source: 'error', error: 'Commune introuvable' })
    }

    // Appeler Yalidine
    const client = await getYalidineClient()
    if (!client) return NextResponse.json({ home: null, desk: null, source: 'error' })

    const fromId = parseInt(fromWilaya.code)
    const toId   = parseInt(toWilaya.code)

    // Timeout de 4 secondes pour ne pas bloquer le checkout
    const feesPromise = client.getFees(fromId, toId)
    const fees = await Promise.race([
      feesPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])

    if (!fees) return NextResponse.json({ home: null, desk: null, source: 'timeout' })

    // Chercher la commune dans la réponse (clé = nom français de la commune)
    const communeData = fees.per_commune?.[commune.nameFr]

    if (!communeData) {
      // La commune n'est pas dans la réponse Yalidine — utiliser les tarifs par défaut
      return NextResponse.json({ home: null, desk: null, source: 'commune_not_found' })
    }

    // Préférer express, sinon economic
    const homePrice = communeData.express_home ?? communeData.economic_home
    const deskPrice = communeData.express_desk ?? communeData.economic_desk

    return NextResponse.json({
      home:   homePrice,
      desk:   deskPrice,
      source: 'yalidine',
    })
  } catch (err) {
    console.error('[yalidine/fees]', err)
    return NextResponse.json({ home: null, desk: null, source: 'error' })
  }
}
