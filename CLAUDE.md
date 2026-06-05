# CLAUDE.md — Boutique E-commerce Vêtements Femmes (Algérie)

## 🚀 SETUP AUTOMATIQUE — PREMIÈRE CHOSE À FAIRE SUR UN NOUVEAU PC

**Si tu détectes l'une de ces conditions au démarrage de session :**
- `node_modules/` absent
- `.env.local` absent
- `boutique-she.db` absent
- `public/media/` vide ou absent

**→ Lancer immédiatement sans demander :**
```bash
npm run setup
```

Ce script fait tout : crée `.env.local`, installe les dépendances, démarre le serveur, importe tous les produits et télécharge les 580 images depuis boutique-she.com. Durée : 10-20 minutes. L'utilisateur n'a rien à faire.

**Si `npm run setup` échoue** (ex: serveur pas démarré à temps), faire à la main :
1. `npm install`
2. Créer `.env.local` avec `DATABASE_URI=file:./boutique-she.db`, `PAYLOAD_SECRET=<random>`, `NEXT_PUBLIC_SERVER_URL=http://localhost:3000`
3. `npm run dev` (dans un terminal séparé)
4. Attendre que le serveur soit prêt, puis appeler l'API d'import directement :
   ```bash
   curl -X POST http://localhost:3000/api/admin/import-products -H "x-import-key: <PAYLOAD_SECRET>"
   ```

## 🎯 Contexte du projet

Site e-commerce de vêtements pour femmes pour un commerçant algérien.
- Ancien site : WordPress/WooCommerce (lent, instable) → migration complète.
- Objectif : site **rapide, stable, sécurisé**, avec un back-office simple type WooCommerce pour que le client uploade ses produits lui-même.
- Langue du site : **ARABE (RTL)** obligatoirement. Admin : peut rester en anglais/français.
- Marché : Algérie. Paiement principal : **COD (paiement à la livraison)**. Devise : **DZD (دج)**.
- Trafic actuel modeste (~50 visiteurs uniques/mois) → un VPS standard suffit, mais le code doit être optimisé comme si le trafic allait x100.

## 🧠 PROTOCOLE MÉMOIRE — OBLIGATOIRE

Claude Code n'a pas de mémoire entre les sessions. Pour compenser :

1. **Au DÉBUT de chaque session** : lire `docs/MEMORY.md` et `docs/JOURNAL.md` en entier AVANT toute action.
2. **À la FIN de chaque tâche significative** (et impérativement avant la fin de session) :
   - Mettre à jour `docs/MEMORY.md` : état actuel du projet, décisions prises, ce qui marche, ce qui reste à faire.
   - Ajouter une entrée datée dans `docs/JOURNAL.md` : `## [DATE] — [résumé]` avec fichiers modifiés, problèmes rencontrés, prochaines étapes.
3. Si une décision d'architecture est prise → la documenter dans `docs/DECISIONS.md` (format : contexte, options, choix, raison).
4. Ne JAMAIS supposer l'état du projet de mémoire : toujours vérifier les fichiers réels.

## 🛠️ Stack technique (versions récentes obligatoires)

| Couche | Techno | Notes |
|---|---|---|
| Framework | **Next.js 16.x** (App Router) | React 19, Server Components, Server Actions |
| Backend/Admin | **Payload CMS 3.x** | Intégré dans la même app Next.js + plugin e-commerce officiel |
| Base de données | **PostgreSQL** (adapter @payloadcms/db-postgres) | |
| Styles | **Tailwind CSS 4** + **shadcn/ui** | Utiliser les propriétés logiques (ps/pe, ms/me) pour le RTL |
| Langage | **TypeScript strict** | `strict: true`, pas de `any` |
| Validation | **Zod** | Toute entrée utilisateur validée côté serveur |
| Images | next/image + sharp | WebP/AVIF, lazy loading |
| Fonts arabes | **IBM Plex Sans Arabic** ou **Cairo** (via next/font) | |
| État panier | Zustand (persisté) ou React Context | Panier côté client, validation côté serveur |
| Emails | Resend ou Nodemailer (confirmation commande) | |

Avant d'installer un package : vérifier la dernière version stable (`npm view <pkg> version`). Pas de packages abandonnés.

## 📁 Architecture — propre et stricte

```
/
├── src/
│   ├── app/
│   │   ├── (frontend)/          # Pages publiques (arabe, RTL)
│   │   │   ├── page.tsx         # Accueil
│   │   │   ├── products/        # Catalogue + [slug]
│   │   │   ├── cart/            # Panier
│   │   │   ├── checkout/        # Commande (COD)
│   │   │   └── layout.tsx       # <html lang="ar" dir="rtl">
│   │   ├── (payload)/           # Admin Payload auto-généré
│   │   └── api/                 # Routes API custom si besoin
│   ├── collections/             # Collections Payload (Products, Orders, Categories, Media, Users, Customers)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui
│   │   ├── product/             # ProductCard, ProductGallery, VariantSelector...
│   │   ├── cart/                # CartDrawer, CartItem...
│   │   └── layout/              # Header, Footer, Nav
│   ├── lib/                     # utils, formatage prix DZD, helpers
│   ├── hooks/                   # hooks custom
│   ├── stores/                  # Zustand (panier)
│   └── styles/
├── scripts/
│   └── import-products.ts       # Import des JSON de l'ancien site
├── data/                        # ⚠️ DANS .gitignore (données personnelles clients)
│   ├── legacy/                  # CSV WooCommerce : produits.csv, clients.csv, commandes.csv
│   └── legacy/images/           # Cache local des images téléchargées
├── branding/                    # Logo du client + charte graphique
├── docs/
│   ├── MEMORY.md                # 🧠 État du projet (à jour en permanence)
│   ├── JOURNAL.md               # 🧠 Journal des sessions
│   └── DECISIONS.md             # Décisions d'architecture
└── public/
```

Règles de code :
- Chaque fichier a UNE responsabilité. Composants < 200 lignes, sinon découper.
- **Code commenté en français** : chaque fonction non triviale a un commentaire expliquant le POURQUOI.
- Nommage clair en anglais pour le code, textes du site en arabe centralisés dans `src/lib/translations.ts` (pas de texte en dur dans les composants).
- Server Components par défaut ; `"use client"` uniquement si nécessaire (interactivité).

## 🎨 Design & Charte graphique — She's Fit & Beauty

Logo dans `/branding/logo.png` (cercle doré, "SHE'S" en blanc, "Fit & Beauty" en rose vif).

**Direction artistique : fond BLANC, épuré et premium.** Le blanc domine, l'or et le rose sont des ACCENTS — jamais de grandes surfaces dorées ou roses.

### Palette officielle (extraite du logo — variables CSS Tailwind)
```css
--background: #FFFFFF;        /* fond principal : blanc pur */
--foreground: #1A1A1A;        /* texte : noir doux */
--primary: #E93D91;           /* rose She's — CTA, boutons "أضف إلى السلة", prix promo, badges */
--primary-hover: #D32D80;     /* rose foncé au survol */
--accent: #CEA060;            /* or — détails premium : bordures fines, icônes, soulignés, étoiles */
--accent-dark: #9F6F3B;       /* or foncé — texte sur fond clair si besoin */
--muted: #F7F5F2;             /* fond de sections alternées : blanc cassé chaud (nuance or très diluée) */
--border: #EBE6DF;            /* bordures discrètes */
```

### Règles d'usage
- **Rose `#E93D91`** = couleur d'ACTION uniquement : boutons principaux, liens actifs, badge promo, compteur panier. C'est lui qui guide l'œil vers l'achat.
- **Or `#CEA060`** = touche premium discrète : liseré sous les titres de sections, icônes de réassurance (livraison, qualité), notation, petits détails du header/footer. Jamais en gros aplat.
- Cartes produits : fond blanc, photo dominante, prix en noir, promo en rose. Pas de cadres lourds.
- Footer : peut être le seul bloc sombre (noir/anthracite) avec logo doré — rappel du logo.
- Contraste : vérifier WCAG AA — l'or sur blanc est faible, l'utiliser en décoratif ou en `--accent-dark` pour du texte.
- Mobile-first : la majorité du trafic algérien est mobile. Tester chaque écran en 375px d'abord.
- RTL partout : direction `rtl`, icônes/flèches inversées, carrousels qui défilent dans le bon sens.
- Typographie arabe élégante : **IBM Plex Sans Arabic** (corps) — option titres : **Cairo** en graisse forte.
- UX e-commerce : ajout panier sans rechargement, drawer panier, checkout en 1 page (nom, téléphone, wilaya, commune, adresse), confirmation claire. Le téléphone est le champ clé en Algérie (validation format 05/06/07 + 8 chiffres).

## 🛒 Pages & Parcours d'achat — OBLIGATOIRES

### Pages frontend (toutes en arabe, RTL)
1. **Accueil** : hero, catégories, produits en avant, nouveautés, promos.
2. **Catalogue / Catégorie** : grille produits, filtres (catégorie, taille, couleur, prix), tri, pagination.
3. **Page produit** : galerie photos, sélecteur de variations (couleur الألوان + taille المقاس) avec prix/stock qui se mettent à jour selon la variation choisie, bouton أضف إلى السلة, indication متوفر / غير متوفر.
4. **Panier — drawer + page** :
   - **Drawer panier (sidebar)** qui s'ouvre AUTOMATIQUEMENT à chaque ajout au panier, avec résumé, quantités modifiables, total, boutons "voir le panier" et "passer commande".
   - **Page panier** complète (`/cart`) : liste des articles avec leur variation (couleur/taille), modification quantité, suppression, total.
   - Dans le panier ET le checkout, le client doit pouvoir **modifier la variation** d'un article (changer taille/couleur) sans le supprimer — comme sur l'ancien site.
5. **Checkout** (`/checkout`) — une seule page, simple :
   - Champs : nom complet, **téléphone** (validation 05/06/07 + 8 chiffres), **wilaya**, **commune**, adresse, note optionnelle.
   - **Pays : ALGÉRIE UNIQUEMENT** — pas de champ pays, pas de gestion multi-pays.
   - **Cascade wilaya → communes** : liste des **58 wilayas** en arabe ; quand le client sélectionne une wilaya, le select commune se remplit avec les communes de CETTE wilaya uniquement. Données dans `src/lib/algeria-geo.ts` (fichier statique : 58 wilayas + toutes leurs communes, noms en arabe, généré depuis un dataset open-source des communes algériennes — vérifier qu'on a bien les 58 wilayas dont les 10 nouvelles : تيميمون, برج باجي مختار, أولاد جلال, بني عباس, عين صالح, عين قزام, تقرت, جانت, المغير, المنيعة).
   - Récapitulatif de commande visible sur la même page (articles + variations + frais de livraison selon wilaya si définis + total).
   - Paiement : **COD uniquement** (الدفع عند الاستلام) pour le lancement.
6. **Page de confirmation / Thank you** (`/order-confirmation/[orderNumber]`) :
   - **Numéro de commande** bien visible (format court lisible, ex: SHE-2026-0001), récap des articles, total, wilaya/commune, message de remerciement en arabe + mention "on vous appellera pour confirmer" (process COD algérien).
7. Pages secondaires : contact, à propos, politique de livraison/retour.

### Backend admin (`/admin` — Payload)
- Le panneau admin Payload est servi sur **`/admin`** : c'est là que le client gère TOUT.
- Collections visibles et utilisables : **Products** (créer/modifier produits + variations couleur/taille + prix + promo + stock + images), **Categories**, **Media**, **Orders**, **Customers**, **Users**.
- **Les produits importés du CSV doivent apparaître dans cet admin** (l'import passe par l'API Payload, donc c'est automatique — le vérifier après import).
- **Gestion des commandes** : chaque commande passée sur le site crée une entrée dans Orders avec statut workflow COD : `جديدة (nouvelle) → مؤكدة (confirmée par téléphone) → قيد التوصيل (en livraison) → تم التسليم (livrée) / ملغاة (annulée)`. L'admin peut changer le statut, voir téléphone/wilaya/commune du client, et filtrer par statut.
- Interface admin simple pour le client : masquer les champs techniques inutiles, labels clairs.

## 🔒 Sécurité — checklist obligatoire

- [ ] Validation **Zod côté serveur** de TOUTES les entrées (checkout, formulaires, API).
- [ ] Jamais de secrets dans le code → `.env.local` (et `.env.example` versionné sans valeurs).
- [ ] Headers de sécurité dans `next.config.ts` : CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- [ ] Rate limiting sur le checkout et les routes API sensibles (éviter le spam de fausses commandes COD).
- [ ] Accès admin Payload : mot de passe fort, rôles stricts (admin / éditeur), pas d'inscription publique.
- [ ] Upload images : types MIME vérifiés, taille max, redimensionnement par sharp.
- [ ] Pas de données sensibles dans les logs ni côté client.
- [ ] `npm audit` avant chaque livraison ; corriger les vulnérabilités high/critical.
- [ ] Échapper/assainir tout contenu riche affiché (descriptions produits venant des JSON).

## 📦 Import des produits (CSV WooCommerce — structure DÉJÀ ANALYSÉE)

Source : export WooCommerce/Woodmart de l'ancien site **boutique-she.com**, fichier `data/legacy/produits.csv` (1 139 lignes, 127 colonnes).

### Structure confirmée
- **135 produits réels** : lignes `Type = variable` (134) + `Type = simple` (1).
- **988 variations** : lignes `Type` contenant `variation`, rattachées au parent via la colonne `Parent` (format `id:31607`).
- **Attributs (déjà en arabe)** :
  - `الألوان` (couleur) — valeurs en français (Rose, Bleu...) → traduire les valeurs en arabe via une table de correspondance.
  - `المقاس` (taille) — format `S(38-40)`, `M(40-42)`, `L(42-44)`, `XL(44-46)`, `XS(36-38)` → conserver tel quel.
  - Attention : l'ordre attribut 1/2 varie selon les produits (couleur ou taille en premier) → détecter par le NOM de l'attribut, pas par la position.
- **Prix** : `Tarif régulier` (1 500–12 500 DA, médiane 6 500) et `Tarif promo` (547 variations en promo) — définis au niveau VARIATION, pas du parent.
- **Stock** : colonne `Stock` + `En stock ?` au niveau variation (391 en stock / 748 en rupture) → importer le stock réel.
- **Images** : colonne `Images` du parent = URLs séparées par virgules vers `boutique-she.com/wp-content/uploads/...` (~605 images uniques). Le script doit les TÉLÉCHARGER (avec retry + cache local `data/legacy/images/`) puis les uploader dans la collection Media. Dédupliquer (mêmes URLs répétées).
- **Catégories** : en français avec hiérarchie `Parent > Enfant` (ex: `Burkini > Burkini SHE`). Catégories principales : Burkini, Robe Hidjab, Manteaux et vestes, Ensemble, Sacs, Chaussures, Pareo, Jupe, Chemise, Pantalon → créer la table de traduction FR → AR et importer la hiérarchie.
- ⚠️ **SKU (`UGS`) quasi vides** → clé d'idempotence = colonne `ID` (ID WooCommerce), stockée dans un champ `legacyId` sur chaque produit/variation.
- ⚠️ **Seulement 5 produits ont une `Description`** → après l'import, générer des descriptions produit en ARABE (matière, coupe, conseils taille, ton e-commerce) pour tous les produits qui n'en ont pas. Les marquer `aiGenerated: true` pour que le client puisse les relire.
- Ignorer toutes les colonnes `Méta : woodmart_*`, `Méta : fb_*`, `Méta : _w*` (spécifiques à l'ancien thème).

### Script `scripts/import-products.ts`
1. Parser le CSV (attention : noms de colonnes avec espaces insécables, ex `En stock\xa0?`).
2. Passe 1 : créer les catégories (FR→AR). Passe 2 : produits parents + téléchargement images. Passe 3 : variations rattachées.
3. **Idempotent** : re-exécutable sans doublons (upsert sur `legacyId`).
4. Rapport final : produits/variations/images importés, erreurs, produits incomplets (sans image, sans prix).

Fichiers clients et commandes (CSV séparés) : à analyser de la même façon avant import ; l'historique de commandes peut rester en archive si le mapping est trop coûteux.

## 🧪 Qualité & workflow

- `npm run lint` + `tsc --noEmit` doivent passer avant de considérer une tâche terminée.
- Tester le build (`npm run build`) après tout changement structurel.
- Commits atomiques avec messages clairs en français : `feat: page produit avec galerie`, `fix: calcul total panier`.
- Performance cible : Lighthouse mobile ≥ 90, LCP < 2.5s.

## 🚀 Déploiement (décidé : VPS Hostarts — Datacenter Alger)

- Cible : **VPS Virtual Server S** (3 vCores / 4 GB RAM / 80 GB SSD), Ubuntu 24.04 LTS, datacenter Alger.
- **Phase actuelle : DEV LOCAL uniquement.** PostgreSQL local ou Docker (`docker compose up -d` avec un service postgres). La connexion BDD passe par `DATABASE_URI` dans `.env.local` — aucun paramètre en dur, le passage en prod ne doit changer QUE les variables d'environnement.
- Build : `output: 'standalone'` dans `next.config.ts` dès le début (déploiement léger sur VPS).
- En prod (plus tard) : Coolify sur le VPS (déploiement git push, SSL Let's Encrypt auto, backups PostgreSQL programmés) + monitoring UptimeRobot + dump PostgreSQL quotidien externalisé hors du serveur.
- L'ancien site boutique-she.com reste EN LIGNE jusqu'à la mise en prod (les images en dépendent pour l'import). Ne jamais demander de le couper avant la fin de l'import des images.

## 📊 Pixels Marketing — Meta Pixel + TikTok Pixel

### Architecture
- **Global Payload** `marketing-settings` accessible dans `/admin` → onglets Meta / TikTok.
  - `metaPixelId` (texte, optionnel) — ID Meta Pixel (ex: `1234567890123`)
  - `tiktokPixelId` (texte, optionnel) — ID TikTok Pixel (ex: `C8ABC12345DEF6789`)
  - Si un champ est vide → aucun script injecté, aucune erreur.
- **Injection** : `src/components/analytics/PixelScripts.tsx` — `strategy="afterInteractive"` dans le layout.
- **Centralisation** : `src/lib/tracking.ts` — `trackEvent()` dispatche vers `fbq` ET `ttq`. **Aucun appel fbq/ttq en dehors de ce fichier.**
- **PageView automatique** : `PixelPageView.tsx` sur chaque navigation client-side (App Router).

### Événements implémentés

| Événement | Déclenchement | Fichier |
|---|---|---|
| `PageView` | Chaque page + navigation SPA | `PixelPageView.tsx` + scripts init |
| `ViewContent` | Page produit | `TrackViewContent.tsx` |
| `AddToCart` | Bouton "أضف إلى السلة" | `VariantSelector.tsx` → `trackAddToCart()` |
| `InitiateCheckout` | Arrivée sur `/checkout` | `TrackInitiateCheckout.tsx` |
| `Purchase` / `CompletePayment` | Page confirmation commande (1 fois/commande) | `TrackPurchase.tsx` → anti-doublon localStorage |

### Données envoyées (currency: "DZD" partout)
- `ViewContent` : `content_id`, `content_name`, `value`, `currency`
- `AddToCart` : `content_id`, `content_name`, `value`, `currency`, `num_items`, `contents[]`
- `InitiateCheckout` : `value`, `currency`, `num_items`
- `Purchase` : `order_id`, `value`, `currency`, `num_items`, `contents[]`

### Comment vérifier
1. **Meta Pixel Helper** (extension Chrome) : sur chaque page le badge doit être vert. Dans l'Events Manager Meta → événements test en temps réel.
2. **TikTok Pixel Helper** (extension Chrome) : même principe. TikTok Ads Manager → Pixel → Events.
3. En console : `window.fbq` et `window.ttq` doivent exister si les IDs sont configurés.

## 🚫 À ne JAMAIS faire

- Installer des packages obsolètes ou non maintenus.
- Mettre du texte arabe en dur dispersé dans les composants.
- Terminer une session sans mettre à jour `docs/MEMORY.md` et `docs/JOURNAL.md`.
- Désactiver TypeScript strict ou ignorer des erreurs avec `@ts-ignore`.
- Stocker des mots de passe/secrets en clair.
