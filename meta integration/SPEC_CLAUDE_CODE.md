# Tâche : Intégration Meta Pixel + Conversions API (CAPI) — boutique-she.com

## Contexte du projet
- Stack : **Next.js (App Router) + Payload CMS**, e-commerce.
- Marché : **Algérie**, paiement majoritairement **COD (paiement à la livraison)**, 58 wilayas.
- Côté Meta, c'est **déjà configuré** : dataset « vetements P », **Pixel Meta + API Conversions tous les deux actifs**.
- **Pixel ID : `1978921926256650`**

## Objectif
Mettre en place un suivi **hybride** :
1. **Pixel navigateur** (client-side) pour le tracking standard.
2. **Conversions API (serveur)** pour les events critiques (surtout `Purchase`), afin de contourner les ad blockers / iOS.
3. **Déduplication obligatoire** : chaque event envoyé des deux côtés doit partager le même `event_id` + `event_name`, sinon Meta compte deux fois.

⚠️ NE PAS hardcoder le Pixel ID ni le token CAPI dans le code. Utiliser des variables d'environnement.

---

## 1. Variables d'environnement

Ajouter dans `.env` (et `.env.example`) :

```env
NEXT_PUBLIC_FB_PIXEL_ID=1978921926256650
# Token serveur à générer dans Events Manager > Paramètres > API Conversions > Générer un token
FB_CAPI_ACCESS_TOKEN=__a_remplir__
# Optionnel pour les tests : code de test depuis Events Manager > Tester les événements
FB_TEST_EVENT_CODE=
```

---

## 2. Pixel navigateur (base code) — `next/script`

Créer le composant `components/analytics/MetaPixel.tsx` (client). Ne PAS utiliser de balise `<script>` brute, utiliser `next/script` en `afterInteractive`.

```tsx
"use client";
import Script from "next/script";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export default function MetaPixel() {
  if (!PIXEL_ID) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
        `}
      </Script>
      <noscript>
        <img height="1" width="1" style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} alt="" />
      </noscript>
    </>
  );
}
```

> Note : on n'appelle PAS `fbq('track','PageView')` ici, il sera géré au changement de route (voir §3) pour couvrir la navigation App Router.

Inclure `<MetaPixel />` dans `app/layout.tsx`, à la fin du `<body>`.

---

## 3. PageView au changement de route (App Router)

Le App Router ne recharge pas la page → il faut redéclencher PageView manuellement. Créer `components/analytics/PixelPageView.tsx` :

```tsx
"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PixelPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, searchParams]);
  return null;
}
```

L'inclure dans le layout, **wrappé dans `<Suspense>`** (obligatoire à cause de `useSearchParams`) :

```tsx
import { Suspense } from "react";
// ...
<Suspense fallback={null}>
  <PixelPageView />
</Suspense>
```

---

## 4. Helper d'events client + génération event_id

Créer `lib/metaPixel.ts` :

```ts
// Génère un event_id unique partagé entre Pixel et CAPI (déduplication)
export function genEventId() {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type FbqParams = Record<string, unknown>;

export function track(event: string, params: FbqParams = {}, eventId?: string) {
  if (typeof window === "undefined" || !(window as any).fbq) return;
  (window as any).fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
}
```

---

## 5. Events e-commerce standard (client)

Câbler ces standard events sur les bonnes actions. Valeurs en **DZD** (currency: `'DZD'`).

| Action utilisateur | Event Meta | Quand le déclencher |
|---|---|---|
| Affichage page produit | `ViewContent` | mount de la page produit |
| Ajout au panier | `AddToCart` | clic « Ajouter au panier » |
| Début de commande | `InitiateCheckout` | arrivée sur la page checkout |
| Commande passée | `Purchase` | **confirmation de commande** (voir §7 — spécificité COD) |

Exemples de paramètres :

```ts
// Page produit
track("ViewContent", {
  content_ids: [product.id],
  content_name: product.title,
  content_type: "product",
  value: product.price,
  currency: "DZD",
});

// Ajout panier
track("AddToCart", {
  content_ids: [product.id],
  content_type: "product",
  value: product.price,
  currency: "DZD",
});

// Checkout
track("InitiateCheckout", {
  content_ids: cart.items.map(i => i.id),
  num_items: cart.items.length,
  value: cart.total,
  currency: "DZD",
});
```

---

## 6. Conversions API (serveur) — pour `Purchase`

Créer une **route handler** `app/api/meta-capi/route.ts` qui envoie l'event côté serveur. Elle reçoit l'`event_id` généré côté client pour la déduplication.

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID!;
const TOKEN = process.env.FB_CAPI_ACCESS_TOKEN!;
const TEST_CODE = process.env.FB_TEST_EVENT_CODE || undefined;

// Hash SHA-256 requis par Meta pour les données utilisateur (email, tel)
const hash = (v?: string) =>
  v ? crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex") : undefined;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, eventName, value, currency = "DZD", contents, email, phone } = body;

    const payload = {
      data: [{
        event_name: eventName,        // ex: "Purchase"
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,            // <-- même ID que le pixel = déduplication
        action_source: "website",
        event_source_url: req.headers.get("referer") || undefined,
        user_data: {
          em: hash(email),
          ph: hash(phone),
          client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0],
          client_user_agent: req.headers.get("user-agent") || undefined,
          fbp: req.cookies.get("_fbp")?.value,
          fbc: req.cookies.get("_fbc")?.value,
        },
        custom_data: { value, currency, contents },
      }],
      ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
    };

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

> Vérifier la version d'API Graph la plus récente au moment de l'intégration (ici `v21.0`) et l'ajuster si besoin.

---

## 7. `Purchase` avec déduplication (le point critique)

Au moment de la confirmation de commande, **un seul `event_id` généré, envoyé aux deux canaux** :

```ts
import { genEventId, track } from "@/lib/metaPixel";

async function onOrderConfirmed(order) {
  const eventId = genEventId();
  const payload = {
    eventId,
    eventName: "Purchase",
    value: order.total,
    currency: "DZD",
    contents: order.items.map(i => ({ id: i.id, quantity: i.qty })),
    email: order.customer.email,
    phone: order.customer.phone,
  };

  // 1) Pixel navigateur (avec eventID pour dédup)
  track("Purchase", {
    value: order.total, currency: "DZD",
    content_ids: order.items.map(i => i.id), content_type: "product",
  }, eventId);

  // 2) CAPI serveur (même eventId)
  fetch("/api/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

### Spécificité COD (Algérie) — décision à prendre
Comme la plupart des paiements sont **à la livraison**, l'achat n'est pas « payé » au moment de la commande. Deux options :
- **Option A (recommandée pour démarrer)** : déclencher `Purchase` à la **validation de la commande** sur le site. Plus de volume → meilleure optimisation des campagnes, mais inclut les commandes non livrées / annulées.
- **Option B (plus précise)** : déclencher `Purchase` **uniquement à la livraison confirmée**, via un appel CAPI serveur depuis le back-office Payload (webhook / changement de statut commande). Données plus propres mais volume plus faible et délai.
> Démarrer en A, garder l'archi prête pour basculer en B (le code CAPI serveur permet déjà de déclencher depuis Payload).

---

## 8. Idéalement : Payload hook pour le statut « Livré »
Préparer (sans forcément l'activer) un hook `afterChange` sur la collection `orders` de Payload : quand le statut passe à `livré`, appeler la logique CAPI serveur avec un `event_id` stocké sur la commande. Ça permet la bascule vers l'Option B plus tard sans refonte.

---

## 9. Vérification / tests
1. Installer l'extension Chrome **Meta Pixel Helper** → vérifier que le pixel se déclenche (PageView, ViewContent, etc.).
2. Dans **Events Manager > Tester les événements**, remplir `FB_TEST_EVENT_CODE` et vérifier que :
   - Le pixel ET la CAPI reçoivent bien `Purchase`.
   - Meta affiche bien **« Déduplication réussie »** (sinon : vérifier que `event_id` + `event_name` sont identiques des deux côtés).
3. Vérifier qu'il n'y a **qu'une seule installation du pixel** (pas de doublon ailleurs dans le code).

## 10. Consentement (à prévoir)
Conditionner le déclenchement du pixel à l'acceptation cookies si une bannière de consentement existe sur le site (ne déclencher `fbq` qu'après consentement).

---

### Récap des fichiers à créer/modifier
- `components/analytics/MetaPixel.tsx` (nouveau)
- `components/analytics/PixelPageView.tsx` (nouveau)
- `lib/metaPixel.ts` (nouveau)
- `app/api/meta-capi/route.ts` (nouveau)
- `app/layout.tsx` (modifier : inclure les composants)
- Pages produit / panier / checkout / confirmation (ajouter les `track(...)`)
- `.env` + `.env.example` (variables)
- (optionnel) hook Payload `orders.afterChange`
