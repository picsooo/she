// lib/metaPixel.ts
// Helpers CLIENT (navigateur) pour le Meta Pixel.

/**
 * Génère un event_id unique partagé entre le Pixel navigateur et la CAPI serveur.
 * => indispensable pour la déduplication côté Meta.
 */
export function genEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type FbqParams = Record<string, unknown>;

/**
 * Déclenche un standard event via le pixel navigateur.
 * Passer un eventId pour la déduplication avec la CAPI.
 */
export function track(event: string, params: FbqParams = {}, eventId?: string): void {
  if (typeof window === "undefined") return;
  const fbq = (window as any).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
}

/**
 * Lit les cookies _fbp / _fbc posés par le pixel.
 * À capturer au checkout et à stocker sur la commande pour un meilleur matching CAPI,
 * notamment quand l'event Purchase est déclenché plus tard (à la livraison).
 */
export function getFbCookies(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined") return {};
  const read = (name: string) => {
    const m = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : undefined;
  };
  return { fbp: read("_fbp"), fbc: read("_fbc") };
}
