# MEMORY.md — État du projet Boutique She's Fit & Beauty

_Dernière mise à jour : 2026-11-05_

## 🟢 État actuel : SITE + ADMIN 100% OPÉRATIONNELS EN LOCAL ✅

Le site est entièrement construit. TypeScript : 0 erreur. Admin Payload : ✅ avec branding She's complet (logo, login premium, dashboard stats). Compte admin créé et fonctionnel.

### Compte administrateur
- Email : wsaoudi@webminds.dz
- Mot de passe : (voir gestionnaire de mots de passe — ne jamais mettre en clair ici)
- Accès : http://localhost:3000/admin (local) / https://boutique-she.com/admin (prod)

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

## 🚨 Déploiement VPS — deux pièges qui cassent le build (découverts le 2026-11-05)

### 1. sharp : le CPU du VPS est un x86-64 v1
Le VPS tourne sur un « QEMU Virtual CPU version 2.5+ » : pas de `sse4_2`, pas de `popcnt`.
Les binaires précompilés de **sharp 0.34+ exigent le niveau x86-64-v2** et refusent de se
charger → le build échoue sur « Failed to collect page data ».

**`sharp` est figé à l'exact en 0.33.5 dans package.json. NE JAMAIS remettre `^`.**
Toute remontée en 0.34 recassera le build de production.

Pourquoi ça ne se voyait pas avant : le lock pointait déjà 0.34.5, mais `node_modules` sur
le VPS contenait encore une version compatible. Tant que personne ne réinstalle, rien ne
casse. `deploy.sh` lance un `npm install` à chaque déploiement → la panne était inévitable.

### 2. Le schéma de base n'est PAS créé automatiquement en production
`push: true` (sqliteAdapter) ne s'exécute **qu'en mode développement**. En production,
Payload ne crée jamais de table ni de colonne.

**Donc : chaque nouveau champ / collection / global demande un ALTER TABLE ou CREATE TABLE
manuel sur le VPS.** C'est la méthode déjà utilisée sur ce projet — les colonnes `email`,
`phone2`, `fbp`, `fbc`, `traffic_source` de la table `orders` ont toutes été ajoutées ainsi.

Conventions observées (à respecter) : nombre → `numeric`, case à cocher → `integer`,
global `mon-global` → table `mon_global`, relation hasMany → table `mon_global_rels`
(`id`, `"order"`, `parent_id`, `path`, `<collection>_id`).

**Toujours sauvegarder la base avant** : `cp boutique-she.db boutique-she.db.avant-XXX`

## 🎁 Offre pack « 2 articles = prix fixe » (ajoutée le 2026-11-05)

Mécanique de prix au panier : N articles d'une sélection = un prix forfaitaire.
Cas en cours : **2 ensembles = 10 000 DA** (au lieu de 2 × 5 800 = 11 600).
Les prix unitaires des produits ne sont PAS modifiés — c'est le total qui change.

- **Règle de calcul** : `src/lib/pack-offer.ts` → `computePackOffer()`.
  Appelée par le panier (client) ET par `createOrder` (serveur). Le serveur recalcule
  toujours à partir des prix en base : le navigateur ne peut pas fabriquer de remise.
- **Configuration** : global Payload `pack-offer` (`src/globals/PackOffer.ts`),
  piloté par le client dans **`/boutique-admin/offers`** (produits, quantité, prix du pack,
  répétable ou non, interrupteur on/off, textes arabes).
- **Stockage commande** : champs `discount` + `discountLabel` sur Orders.
  `total = subtotal − discount + shippingFee`.
- **Attention** : ne mettre dans une offre que des produits **au même prix**. Un article plus
  cher glissé dans la sélection partirait lui aussi à 2 pour le prix du pack.
- **Attention** : les pages de détail commande (admin + confirmatrice) recalculent la remise
  quand on édite les articles. Toute nouvelle page qui recalcule un total doit faire pareil,
  sinon la remise disparaît silencieusement.

## 🛒 Bouton « اطلبي الآن » (commander maintenant)

Ajouté le 2026-11-05 sur `ProductCard` et `VariantSelector` : ajoute au panier puis redirige
vers `/checkout` sans ouvrir le drawer. **Ce bouton n'avait jamais existé auparavant** — vérifié
dans tout l'historique git. Le client le croyait présent (souvenir de l'ancien site WooCommerce).

## ⚠️ Pièges de l'environnement local

- **`boutique-she.db` local est un snapshot ancien** (134 produits, dernier « Robe Aliah »,
  daté du 2026-06-12). Les produits récents n'existent qu'en production. Ne jamais figer d'ID
  produit dans le code à partir de la base locale.
- **`backup boutique she/`** est une copie complète du projet, non versionnée. Elle est exclue
  de `tsconfig.json` depuis le 2026-11-05 : sans ça elle était compilée en double et générait
  ~25 fausses erreurs TypeScript.
- **Le lint est cassé** : `next lint` n'existe plus en Next 16 et il n'y a pas d'`eslint.config.js`.
  `npm run lint` échoue. Seul `npm run typecheck` et `npm run build` sont fiables.

## 💾 Sauvegardes (où sont les backups — retrouvé le 2026-10-04)

| Quoi | Où | Détails |
|---|---|---|
| **Backups automatiques du serveur** | **Cloudflare R2** — compte `wsaoudi705@gmail.com`, bucket **`boutique-she-backups`** | Archives quotidiennes `backup_AAAA-MM-JJ_02-00.tar.gz`, ~1,22 GB chacune, poussées à **02h00** par un cron du VPS. Accès public désactivé. Bucket : 38,45 GB (~31 fichiers) au 2026-10-04. |
| Code source | GitHub `picsooo/she` (branche `master`) | Déploiement via `deploy.sh` → git pull + pm2 reload |
| Copie locale du projet | `backup boutique she/BOUTIQUE SHE/` (synchronisé OneDrive) | Snapshot du 2026-06-08 22:34, inclut `boutique-she.db` |
| Snapshot SQLite local | `boutique-she.db.backup-20260608` (racine) | 2 Mo, 2026-06-08 |

**Important :** les identifiants R2 (clés S3-compatibles) ne sont **pas** dans ce dépôt ni sur le PC — ils vivent uniquement sur le VPS Hostarts (`walid@102.206.40.191`), dans le cron/script de backup. Pour les retrouver : `ssh walid@102.206.40.191 'crontab -l; sudo crontab -l; cat ~/.config/rclone/rclone.conf 2>/dev/null'`.

**À vérifier périodiquement :**
1. Que le dernier objet du bucket date bien de la nuit précédente (sinon le cron est cassé → plus de sauvegarde).
2. La règle de cycle de vie du bucket (onglet *Paramètres*) : sans purge auto, le stockage grossit d'environ 37 GB/mois.
3. Tester une restauration au moins une fois — un backup non testé n'est pas un backup.
