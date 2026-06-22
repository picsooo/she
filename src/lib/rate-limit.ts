/**
 * Rate limiter in-memory simple.
 * Adapté à un déploiement VPS single-instance (pas besoin de Redis).
 * Nettoie automatiquement les entrées expirées pour éviter les fuites mémoire.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage toutes les 5 minutes pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * Vérifie si une clé dépasse la limite.
 * @param key       Identifiant unique (ex: IP + action)
 * @param limit     Nombre max de requêtes autorisées
 * @param windowMs  Fenêtre de temps en millisecondes
 * @returns { allowed: boolean; remaining: number; resetAt: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  let entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(key, entry)
  }
  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt }
}
