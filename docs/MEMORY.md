# MEMORY.md — État du projet Boutique She's Fit & Beauty

_Dernière mise à jour : 2026-06-06_

## 🟢 État actuel : SITE + ADMIN 100% OPÉRATIONNELS EN LOCAL ✅

Le site est entièrement construit. TypeScript : 0 erreur. Admin Payload : ✅ avec branding She's complet (logo, login premium, dashboard stats). Compte admin créé et fonctionnel.

### Compte administrateur
- Email : wsaoudi@webminds.dz
- Mot de passe : Boussada321
- Accès : http://localhost:3000/admin

### Fix critique appliqué (2026-06-06)
- Route REST API renommée `[...payload]` → `[...slug]` (breaking change Payload 3.85.0)
- Composants admin personnalisés créés et enregistrés dans importMap

## Stack installée et versions

| Package | Version |
|---|---|
| Next.js | 16.2.7 |
| Payload CMS | 3.85.0 |
| @payloadcms/db-postgres | 3.85.0 |
| Tailwind CSS | 4.3.0 |
| TypeScript | 6.0.3 |
| Zustand | ^5.0.5 |
| Zod | ^3.25.45 |
| clsx + tailwind-merge | 2.1.1 / 3.6.0 |

## Comment démarrer en local

```bash
# 1. Démarrer PostgreSQL (Docker)
docker compose up -d

# 2. Démarrer le serveur Next.js
npm run dev

# 3. Créer le premier utilisateur admin
# → http://localhost:3000/admin

# 4. (Optionnel) Importer les produits WooCommerce
npm run import:products
```

## Pages créées

| URL | Type | Description |
|---|---|---|
| `/` | Server | Accueil : hero, catégories, produits en vedette |
| `/products` | Server | Catalogue avec filtres catégorie + tri + pagination |
| `/products/[slug]` | Server | Page produit : galerie, VariantSelector, produits similaires |
| `/cart` | Client | Page panier : liste articles, totaux, bouton checkout |
| `/checkout` | Client | Formulaire COD : nom, téléphone, wilaya→commune, adresse |
| `/order-confirmation/[orderNumber]` | Server | Confirmation commande avec récap |
| `/admin` | Payload | Back-office complet (produits, commandes, catégories...) |

## Composants créés

### UI primitives (src/components/ui/)
- `Button.tsx` — variants: primary/outline/ghost/accent, loading spinner
- `Input.tsx` — label + error + hint, RTL
- `Select.tsx` — cascade wilaya→commune, flèche RTL
- `Badge.tsx` — promo/new/instock/outofstock

### Layout (src/components/layout/)
- `Header.tsx` — sticky, logo, nav, icône panier avec compteur
- `Footer.tsx` — sombre (anthracite), logo doré, réassurance

### Product (src/components/product/)
- `ProductCard.tsx` — photo 4/5, badge promo, hover scale
- `ProductGallery.tsx` — image principale + thumbnails cliquables
- `VariantSelector.tsx` — couleur × taille, mise à jour prix/stock en temps réel
- `PriceDisplay.tsx` — prix barré si promo, rose pour promo

### Cart (src/components/cart/)
- `CartDrawer.tsx` — s'ouvre auto à l'ajout, sticky top-0, overlay
- `CartItem.tsx` — quantité +/-, suppression, variation affichée

### Analytics (src/components/analytics/)
- `PixelScripts.tsx` — injection Meta + TikTok scripts (afterInteractive)
- `PixelPageView.tsx` — PageView auto sur navigation SPA
- `TrackViewContent.tsx` — ViewContent sur page produit
- `TrackInitiateCheckout.tsx` — InitiateCheckout sur /checkout
- `TrackPurchase.tsx` — Purchase/CompletePayment (anti-doublon localStorage)

## Librairies clés (src/lib/)

- `translations.ts` — tous les textes arabes + COLOR_TRANSLATIONS + CATEGORY_TRANSLATIONS
- `algeria-geo.ts` — 58 wilayas (dont 10 nouvelles) + communes principales
- `checkout-schema.ts` — Zod: checkoutSchema, createOrderSchema
- `utils.ts` — cn(), slugify(), generateOrderNumber(), isValidAlgerianPhone(), formatPrice()
- `payload-client.ts` — getProducts(), getProductBySlug(), getMarketingSettings(), etc.
- `tracking.ts` — trackEvent(), trackViewContent(), trackAddToCart(), trackInitiateCheckout(), trackPurchase()

## Collections Payload (src/collections/)

- `Products.ts` — variations couleur×taille, prix DZD, stock, legacyId
- `Categories.ts` — hiérarchique, bilingue FR/AR
- `Orders.ts` — workflow COD (5 statuts)
- `Customers.ts` — identifié par téléphone
- `Media.ts` — sharp WebP/AVIF, 3 formats, legacyUrl
- `Users.ts` — auth stricte, rôles admin/editor

## Globals Payload (src/globals/)

- `MarketingSettings.ts` — metaPixelId + tiktokPixelId (configurables depuis /admin)

## Server Actions (src/app/actions/)

- `createOrder.ts` — validation Zod côté serveur, génération numéro SHE-YYYY-NNNN, upsert client

## Script d'import (scripts/)

- `import-products.ts` — 3 passes (catégories → produits+images → variations), idempotent, rapport

## ⚠️ Points d'attention pour la session suivante

1. **`src/payload-types.ts`** est manuel (temporaire) — sera écrasé par Payload au premier `npm run dev` avec DB. Les types manuels correspondent à la structure réelle.
2. **Communes algériennes** : seulement les chefs-lieux principaux dans `algeria-geo.ts` → à compléter avec le dataset complet (~1541 communes).
3. **Frais de livraison** : logique `TODO` dans createOrder.ts (shippingFee = 0 pour l'instant) → à implémenter selon une table wilaya→tarif.
4. **Import CSV** : à tester après démarrage PostgreSQL + premier admin créé.
5. **Descriptions produits IA** : les 130 produits sans description ont `aiGenerated: false` mais descriptions vides → à générer et marquer `aiGenerated: true`.

## 📋 Prochaines sessions possibles

- Frais de livraison par wilaya (table dans admin)
- Génération automatique des descriptions arabes (Claude API)
- Emails de confirmation commande (Resend)
- Optimisations SEO (sitemap, robots.txt, structured data)
- Page À propos / Contact / Politique livraison
