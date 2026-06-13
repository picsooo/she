# Intégration Meta Pixel + CAPI — boutique-she.com

Set complet pour Next.js (App Router) + Payload CMS.
**Pixel ID : `1978921926256650`** (dataset « vetements P »). Pixel Meta + API Conversions déjà actifs côté Meta.

## Arborescence

```
.env.example
lib/metaPixel.ts            # helpers CLIENT (genEventId, track, getFbCookies)
lib/metaCapi.ts             # helper SERVEUR (hash, normalisation tel DZ, sendCapiEvent)
components/analytics/MetaPixel.tsx       # base code pixel (next/script)
components/analytics/PixelPageView.tsx   # PageView au changement de route
app/api/meta-capi/route.ts  # endpoint CAPI (Option A / events client)
collections/Orders.ts       # champs Meta + hook afterChange (Option B / livraison)
```

## Installation

1. Copier les fichiers dans le projet (respecter les chemins ; `@/` = racine src).
2. Reporter les variables de `.env.example` dans `.env`, et **générer le token CAPI** :
   Events Manager > Paramètres > API Conversions > *Générer un token d'accès*.
3. Dans `app/layout.tsx`, inclure les composants :

```tsx
import { Suspense } from "react";
import MetaPixel from "@/components/analytics/MetaPixel";
import PixelPageView from "@/components/analytics/PixelPageView";

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <MetaPixel />
        <Suspense fallback={null}>
          <PixelPageView />
        </Suspense>
      </body>
    </html>
  );
}
```

4. Pour l'Option B, fusionner `collections/Orders.ts` avec ta collection existante.

## Choix de la stratégie Purchase (COD)

Réglé par `PURCHASE_EVENT_STRATEGY` dans `.env` :

| Valeur | Quand Purchase est déclenché | Avantage | Inconvénient |
|---|---|---|---|
| `checkout` (**Option A**, recommandé pour démarrer) | À la validation de commande sur le site | Plus de volume → meilleure optimisation des campagnes | Inclut commandes annulées / non livrées |
| `delivery` (**Option B**) | À la confirmation de livraison (hook Payload) | Données propres (achats réels) | Volume plus faible, délai |

> On ne déclenche Purchase qu'**une seule fois** par commande : soit A, soit B, jamais les deux. Le hook Option B ne s'active que si `PURCHASE_EVENT_STRATEGY=delivery`.

## Câblage des events

### Page produit (`ViewContent`)
```tsx
import { track } from "@/lib/metaPixel";
useEffect(() => {
  track("ViewContent", {
    content_ids: [product.id], content_name: product.title,
    content_type: "product", value: product.price, currency: "DZD",
  });
}, [product.id]);
```

### Ajout panier (`AddToCart`)
```tsx
track("AddToCart", {
  content_ids: [product.id], content_type: "product",
  value: product.price, currency: "DZD",
});
```

### Checkout (`InitiateCheckout`) + capture des cookies fb
```tsx
import { track, getFbCookies } from "@/lib/metaPixel";

track("InitiateCheckout", {
  content_ids: cart.items.map(i => i.id),
  num_items: cart.items.length, value: cart.total, currency: "DZD",
});

// Stocker fbp/fbc sur la commande (utile pour la CAPI à la livraison, Option B)
const { fbp, fbc } = getFbCookies();
// -> à enregistrer dans la commande Payload (champs fbp, fbc)
```

### Confirmation de commande (`Purchase`, Option A)
```tsx
import { genEventId, track } from "@/lib/metaPixel";

async function onOrderConfirmed(order) {
  if (process.env.NEXT_PUBLIC_PURCHASE_STRATEGY === "delivery") return; // Option B gère ça côté serveur

  const eventId = order.metaEventId || genEventId(); // idéalement généré et stocké côté serveur à la création
  const contents = order.items.map(i => ({ id: i.id, quantity: i.qty }));

  // 1) Pixel navigateur (avec eventID = déduplication)
  track("Purchase",
    { value: order.total, currency: "DZD", content_ids: order.items.map(i => i.id), content_type: "product" },
    eventId
  );

  // 2) CAPI serveur (même eventId)
  await fetch("/api/meta-capi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId, eventName: "Purchase", value: order.total, currency: "DZD", contents,
      email: order.customer.email, phone: order.customer.phone,
      firstName: order.customer.firstName, lastName: order.customer.lastName,
      city: order.customer.wilaya,
    }),
  });
}
```

> Bonne pratique : générer le `metaEventId` **au moment de la création de la commande côté serveur** et le renvoyer au client, pour garantir que pixel et CAPI utilisent exactement le même id.

## Vérification

1. **Meta Pixel Helper** (extension Chrome) : vérifier PageView, ViewContent, AddToCart, etc.
2. Events Manager > **Tester les événements** : remplir `FB_TEST_EVENT_CODE`, passer une commande test, vérifier que Pixel + CAPI reçoivent `Purchase` et que Meta affiche **« Événements dédupliqués »**.
3. S'assurer qu'il n'y a **qu'une seule** installation du pixel (pas de doublon ailleurs).
4. Retirer `FB_TEST_EVENT_CODE` en production.

## Notes
- Vérifier la version de l'API Graph la plus récente (`FB_GRAPH_VERSION`, ici `v21.0`).
- `lib/metaCapi.ts` ne doit JAMAIS être importé côté client (contient le token).
- Si une bannière de consentement cookies existe, conditionner le déclenchement du pixel à l'acceptation.
