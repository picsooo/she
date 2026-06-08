# JOURNAL.md — Boutique She's Fit & Beauty

---

## [2026-06-08] — Refonte complète : confirmatrices, livraison, FAQ, burkini

### Ce qui a été fait

**Collections (src/collections/)**
- `Orders.ts` : 3 nouveaux statuts (pending, in_progress, failed), champs `assignedTo` (confirmatrice), `deliveryMode`, `margin`, `stockDecremented`, `yalidineTrackingId`. Hook `afterChange` pour gestion stock auto (déduction à `confirmed`, retour à `cancelled`/`failed`).
- `Users.ts` : ajout rôle `confirmatrice`

**Checkout (frontend)**
- `checkout-schema.ts` : ajout champ `deliveryMode`
- `checkout/page.tsx` : sélecteur mode de livraison "توصيل إلى المنزل / مكتب ياليدين" avec tarifs dynamiques chargés depuis DeliverySettings. Total mis à jour en temps réel.
- `createOrder.ts` : auto-assign round-robin aux confirmatrices, calcul frais depuis settings, stockage du mode de livraison

**Frontend produit**
- `products/[slug]/page.tsx` : FAQ accordéon (4 questions en darija), cross-sell burkini (sacs/pareos), chapeau gratuit auto-add, bannière burkini
- `VariantSelector.tsx` : gestion du cadeau gratuit (chapeau avec burkini), notification visuelle, message ajout enrichi
- `ProductSidebar.tsx` : guide des tailles SUPPRIMÉ, bouton WhatsApp mis à jour avec icône

**Homepage**
- Bannière promo burkini "تشري بوركيني تربحي شابو باطل" (lien vers catalogue burkini)

**Page confirmation**
- Message mis à jour : "سنتواصل معك خلال 24 ساعة القادمة لتأكيد الطلب"
- Bouton WhatsApp cliquable (numéro à configurer : 213550000000)
- Affichage mode de livraison + frais dans le récap

**Admin**
- `Dashboard.tsx` : tableau statuts complet (8 statuts avec compteurs cliquables), rendement par confirmatrice (taux confirmation, confirmées/échouées/annulées), top produits du mois, colonne mode livraison et confirmatrice dans la liste
- `BulkVariationUpdate.tsx` : composant bulk edit prix/promo/stock pour toutes les variations simultanément
- `Products.ts` : BulkVariationUpdate intégré comme `beforeInput` sur le tableau de variations
- `importMap.js` : enregistrement BulkVariationUpdate

**Script**
- `scripts/seed-confirmatrices.ts` : créer les 3 comptes depuis le terminal
- `package.json` : `npm run seed:confirmatrices`

### Comptes confirmatrices à créer (si pas encore fait)
Aller sur `/admin/collections/users/create` et créer :
- confirmatrice01@boutique-she.dz — mot de passe : She2026@01
- confirmatrice02@boutique-she.dz — mot de passe : She2026@02
- confirmatrice03@boutique-she.dz — mot de passe : She2026@03

### Numéro WhatsApp à configurer
Remplacer `213550000000` dans :
- `src/app/(frontend)/order-confirmation/[orderNumber]/page.tsx` (ligne ~23)
- `src/app/(frontend)/products/[slug]/page.tsx` (ligne ~21)
- `src/components/product/ProductSidebar.tsx` (href du bouton)

### Prochaines étapes
1. Créer les 3 comptes confirmatrices via /admin
2. Remplacer le numéro WhatsApp de Rania
3. Tester le checkout avec sélection mode livraison
4. Vérifier l'auto-assign des commandes
5. Intégration Yalidine API (stats + envoi auto)
6. Analytics avancées (recherche par article/couleur/taille)

---

## [2026-06-06] — Admin entièrement fonctionnel avec branding She's

### Ce qui a été fait
- Fix Payload 3.85.0 : route `[...payload]` → `[...slug]` (voir session précédente)
- Compte admin créé via SQLite direct + PBKDF2 : `wsaoudi@webminds.dz` / `Boussada321`
- Composants admin personnalisés créés et enregistrés dans importMap :
  - `Logo.tsx` — logo She's dans le header admin
  - `Icon.tsx` — icône ronde pour la nav
  - `BeforeLogin.tsx` — page de connexion premium
  - `GlobalStyles.tsx` — CSS de marque injecté via afterNavLinks
  - `Dashboard.tsx` — tableau de bord e-commerce (stats, commandes récentes, actions rapides)
- Dashboard converti en `'use client'` (Server Component incompatible avec Payload admin context)
- Résultat final : admin ✅ opérationnel, branding ✅, dashboard ✅

### État au 2026-06-06
**TOUT TOURNE** — admin opérationnel en local sur http://localhost:3000/admin

---

## [2026-06-06] — Fix critique : Internal Server Error sur l'admin

### Problème
Toutes les routes REST API Payload (`/api/products`, `/api/categories`, etc.) retournaient 500.
L'admin affichait une erreur "internal server error" à chaque tentative de chargement de données.

### Cause
**Breaking change Payload 3.85.0** : le handler REST `@payloadcms/next/dist/routes/rest/index.js` lit `params.slug` (nom fixe). Le dossier de route était nommé `[...payload]` → `params.payload` → `params.slug` = `undefined` → `TypeError: Cannot read properties of undefined (reading 'map')`.

### Correctif appliqué
- Supprimé `src/app/api/[...payload]/route.ts`
- Créé `src/app/api/[...slug]/route.ts` avec le type `{ params: Promise<{ slug: string[] }> }`
- Redémarré le serveur
- Résultat : admin 200 ✅, API 403 (normal sans auth) ✅

---

## [2026-06-05] — Session 1 : Site complet + Pixels marketing

### Ce qui a été fait

**Site e-commerce complet (toutes les pages)**
- `/` : Accueil avec hero, catégories, produits en vedette, réassurance
- `/products` : Catalogue filtres catégorie + tri + pagination
- `/products/[slug]` : Page produit avec galerie, VariantSelector, produits similaires
- `/cart` : Page panier complète
- `/checkout` : Formulaire COD (nom, téléphone, wilaya→commune cascade, adresse)
- `/order-confirmation/[orderNumber]` : Confirmation avec récap complet
- `/admin` : Payload CMS opérationnel

**Composants (19 fichiers)**
- UI primitives : Button, Input, Select, Badge (tous RTL-native)
- Layout : Header (sticky + compteur panier), Footer (sombre + réassurance)
- Product : ProductCard, ProductGallery, VariantSelector, PriceDisplay
- Cart : CartDrawer (auto-ouvert), CartItem
- Analytics : 5 composants de tracking

**Pixels marketing Meta + TikTok**
- Global Payload `marketing-settings` → client configure ses IDs dans /admin
- 5 événements : PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
- Anti-doublon localStorage sur Purchase
- `tracking.ts` : point d'entrée unique, aucun fbq/ttq dispersé

**Docker Compose** pour PostgreSQL local

**Build** : ✅ Sans erreur. 9 routes générées.

### Fichiers créés/modifiés
- docker-compose.yml (nouveau)
- 19 composants React
- 3 pages frontend
- 1 Server Action (createOrder.ts)
- src/globals/MarketingSettings.ts (nouveau)
- src/lib/tracking.ts (nouveau)
- src/lib/payload-client.ts (+ getMarketingSettings)
- src/payload-types.ts (+ MarketingSettings)
- CLAUDE.md (+ section Pixels Marketing)

### Prochaines étapes
1. Démarrer Docker + `npm run dev` + créer admin
2. Tester le parcours complet (ajout panier → checkout → confirmation)
3. Importer les produits CSV
4. Compléter les communes algériennes

---

## [2026-06-05] — Session 0 : Initialisation complète du projet

### Contexte
Projet vierge (seulement CLAUDE.md, logo.png, produits.csv). Première session : mise en place de toute la structure.

### Ce qui a été fait

**Infrastructure**
- Création de toute l'arborescence : src/, docs/, scripts/, data/legacy/, branding/
- Installation des dépendances : npm install (703 packages)
- TypeScript strict : 0 erreur après corrections

**Collections Payload**
- Products : avec variations (couleur×taille), prix DZD, stock, legacyId pour import idempotent
- Categories : hiérarchique, bilingue FR/AR
- Orders : workflow COD algérien (5 statuts)
- Customers : identifié par téléphone (clé algérienne)
- Media : sharp avec 3 formats (thumbnail/card/large), legacyUrl pour dédupliquer
- Users : auth stricte, rôles admin/editor

**Librairies créées**
- translations.ts : centralisation de tous les textes arabes + tables couleurs/catégories FR→AR
- algeria-geo.ts : 58 wilayas (dont 10 nouvelles de 2019) + communes principales
- checkout-schema.ts : validation Zod (téléphone 05/06/07+8 chiffres, wilaya, commune)
- cart.ts : store Zustand persisté, gestion variations

**Problèmes rencontrés et résolus**
1. `@payloadcms/storage-uploadthing` → vulnérabilité high (effect) → retiré (non requis en dev)
2. Routes admin Payload : pattern `import('@payload-config')` incorrect → corrigé en `import configPromise from '@payload-config'`
3. `generatePageMetadata` ne prend pas `importMap` → signature corrigée avec `searchParams`
4. `UploadConfig.fileSize` n'existe pas → retiré, limite définie dans payload.config.ts global
5. `ExperimentalConfig.reactCompiler` n'existe pas dans Next.js 16.2.7 → retiré

### Fichiers modifiés
- Tous créés (session 0)

### Prochaines étapes
1. Configurer PostgreSQL et tester `npm run dev`
2. Composants Header, Footer, ProductCard, CartDrawer
3. Pages catalogue, produit, panier, checkout, confirmation
4. Server Action createOrder
5. Import CSV des produits
