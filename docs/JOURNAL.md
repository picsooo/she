# JOURNAL.md — Boutique She's Fit & Beauty

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
