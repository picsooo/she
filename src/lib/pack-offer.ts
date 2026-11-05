// ─────────────────────────────────────────────────────────────────────────────
// Offre pack : « N articles achetés = prix fixe »
// Exemple en production : 2 ensembles au choix = 10 000 DA (au lieu de 11 600).
//
// POURQUOI CE FICHIER EXISTE :
// le panier (navigateur) et la Server Action createOrder (serveur) appellent
// TOUS LES DEUX computePackOffer(). Une seule règle, un seul code — le montant
// affiché à la cliente et le montant réellement facturé ne peuvent pas diverger.
// Le serveur ne fait jamais confiance au total envoyé par le navigateur : il le
// recalcule avec cette même fonction à partir des prix lus en base.
// ─────────────────────────────────────────────────────────────────────────────

// Configuration de l'offre, telle que le client la règle depuis /boutique-admin
export interface PackOfferConfig {
  enabled: boolean
  titleAr: string
  subtitleAr?: string | null
  /** IDs des produits éligibles (toujours comparés en string : SQLite renvoie des nombres) */
  productIds: string[]
  /** Nombre d'articles qui forment un pack (2 pour l'offre actuelle) */
  packQuantity: number
  /** Prix total du pack en DZD (10 000 pour l'offre actuelle) */
  packPrice: number
  /** true : l'offre se répète (4 articles = 2 packs). false : une seule fois par commande. */
  repeatable: boolean
}

// Une ligne de panier réduite à ce dont l'offre a besoin
export interface PackLine {
  productId: string
  unitPrice: number
  quantity: number
}

export interface PackResult {
  /** Remise totale en DZD à soustraire du sous-total */
  discount: number
  /** Nombre de packs complets formés */
  packs: number
  /** Nombre d'articles éligibles dans le panier */
  eligibleUnits: number
  /** Articles manquants pour compléter le pack suivant (0 si aucun pack en cours) */
  unitsToNextPack: number
}

export const EMPTY_PACK_RESULT: PackResult = {
  discount: 0,
  packs: 0,
  eligibleUnits: 0,
  unitsToNextPack: 0,
}

// L'offre n'est active que si elle est complètement renseignée — une config
// à moitié remplie dans l'admin ne doit jamais fausser un prix.
export function isPackOfferActive(offer: PackOfferConfig | null | undefined): offer is PackOfferConfig {
  return (
    !!offer &&
    offer.enabled === true &&
    Array.isArray(offer.productIds) &&
    offer.productIds.length > 0 &&
    offer.packQuantity >= 2 &&
    offer.packPrice > 0
  )
}

// Ce produit fait-il partie de l'offre ? Sert à afficher le badge sur les cartes.
export function isProductInPackOffer(
  productId: string | number,
  offer: PackOfferConfig | null | undefined,
): boolean {
  return isPackOfferActive(offer) && offer.productIds.includes(String(productId))
}

/**
 * Calcule la remise apportée par l'offre pack sur un panier.
 *
 * Exemple avec packQuantity=2, packPrice=10000 et des ensembles à 5 800 :
 *   2 articles → 11 600 - 10 000 = 1 600 DA de remise
 *   3 articles → 1 pack + 1 article au prix normal = 1 600 DA de remise
 *   4 articles → 2 packs = 3 200 DA de remise
 */
export function computePackOffer(
  lines: PackLine[],
  offer: PackOfferConfig | null | undefined,
): PackResult {
  if (!isPackOfferActive(offer)) return EMPTY_PACK_RESULT

  // On déplie les lignes en articles individuels : un pack se compte en articles,
  // pas en lignes de panier (2 fois le même modèle en 2 tailles = 2 articles).
  const units: number[] = []
  for (const line of lines) {
    if (!offer.productIds.includes(String(line.productId))) continue
    // Les cadeaux offerts (prix 0, ex: le chapeau burkini) n'entrent pas dans l'offre
    if (line.unitPrice <= 0) continue
    const qty = Math.max(0, Math.floor(line.quantity))
    for (let i = 0; i < qty; i++) units.push(line.unitPrice)
  }

  // Les articles les plus chers entrent en premier dans les packs : c'est ce qui
  // avantage le plus la cliente, donc ce qu'elle s'attend à voir sur son total.
  units.sort((a, b) => b - a)

  const maxPacks = Math.floor(units.length / offer.packQuantity)
  const packs = offer.repeatable ? maxPacks : Math.min(maxPacks, 1)

  let discount = 0
  for (let p = 0; p < packs; p++) {
    const group = units.slice(p * offer.packQuantity, (p + 1) * offer.packQuantity)
    const groupTotal = group.reduce((sum, unitPrice) => sum + unitPrice, 0)
    // Garde-fou : si le prix du pack est supérieur aux prix réels, on ne touche à rien.
    // Sans ça, une mauvaise saisie dans l'admin ferait AUGMENTER le total.
    if (groupTotal > offer.packPrice) discount += groupTotal - offer.packPrice
  }

  // Combien d'articles manquent pour déclencher le pack suivant ? Sert à afficher
  // « ajoutez 1 article et payez 10 000 DA » dans le panier.
  const remainder = units.length % offer.packQuantity
  const canFormAnotherPack = offer.repeatable || packs === 0
  const unitsToNextPack = canFormAnotherPack && remainder > 0 ? offer.packQuantity - remainder : 0

  return {
    discount: Math.round(discount),
    packs,
    eligibleUnits: units.length,
    unitsToNextPack,
  }
}
