// lib/metaCapi.ts
// Helper SERVEUR pour la Conversions API. Réutilisé par la route API et le hook Payload.
// Ne JAMAIS importer ce fichier côté client (contient le token).

import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const TOKEN = process.env.FB_CAPI_ACCESS_TOKEN;
const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v21.0";
const TEST_CODE = process.env.FB_TEST_EVENT_CODE || undefined;

/** SHA-256 hex, en minuscules et trimmé (format exigé par Meta pour les user_data). */
function sha256(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return crypto.createHash("sha256").update(v).digest("hex");
}

/**
 * Normalise un numéro algérien au format attendu par Meta : indicatif pays + chiffres,
 * sans "+", sans espaces, sans 0 initial.
 * Exemples : "0551 23 45 67" -> "213551234567" ; "+213551234567" -> "213551234567"
 */
function normalizePhoneDZ(raw?: string): string | undefined {
  if (!raw) return undefined;
  let digits = raw.replace(/\D/g, "");          // garde uniquement les chiffres
  if (digits.startsWith("00")) digits = digits.slice(2); // 00213... -> 213...
  if (digits.startsWith("213")) return digits;            // déjà avec indicatif
  if (digits.startsWith("0")) digits = digits.slice(1);   // 0551... -> 551...
  return "213" + digits;
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;       // ex: wilaya / commune
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface CapiEvent {
  eventName: string;            // ex: "Purchase"
  eventId: string;              // même id que le pixel pour la déduplication
  eventSourceUrl?: string;
  value?: number;
  currency?: string;            // défaut "DZD"
  contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  user: CapiUserData;
}

/**
 * Envoie un event à la Conversions API.
 * Retourne { ok, status, data }.
 */
export async function sendCapiEvent(event: CapiEvent): Promise<{ ok: boolean; status: number; data: any }> {
  if (!PIXEL_ID || !TOKEN) {
    return { ok: false, status: 500, data: { error: "FB_PIXEL_ID ou FB_CAPI_ACCESS_TOKEN manquant" } };
  }

  const u = event.user;
  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: "website",
        event_source_url: event.eventSourceUrl,
        user_data: {
          em: sha256(u.email),
          ph: sha256(normalizePhoneDZ(u.phone)),
          fn: sha256(u.firstName),
          ln: sha256(u.lastName),
          ct: sha256(u.city),
          client_ip_address: u.ip,
          client_user_agent: u.userAgent,
          fbp: u.fbp,
          fbc: u.fbc,
        },
        custom_data: {
          value: event.value,
          currency: event.currency || "DZD",
          contents: event.contents,
          content_type: event.contents ? "product" : undefined,
        },
      },
    ],
    ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
  };

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[CAPI] erreur", res.status, data);
  }
  return { ok: res.ok, status: res.status, data };
}
