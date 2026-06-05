# DECISIONS.md — Décisions d'architecture

---

## [2026-06-05] Stockage images : local en dev, uploadthing retiré

**Contexte** : Besoin de stocker les images produits. `@payloadcms/storage-uploadthing` était prévu.

**Problème** : Vulnérabilité high dans `effect` (dépendance transitives d'uploadthing), sans fix disponible.

**Décision** : Stockage local en dev (`public/media/`), uploadthing ou équivalent ajouté uniquement en prod (via variable d'env).

**Raison** : Éviter une vulnérabilité high qui n'est pas nécessaire en phase dev. La config est isolée dans `payload.config.ts` et le passage en prod ne changera qu'une ligne.

---

## [2026-06-05] GraphQL désactivé

**Contexte** : Payload 3.x active GraphQL par défaut.

**Décision** : `graphQL: { disable: true }` dans payload.config.ts.

**Raison** : Le frontend utilise les Server Components + Server Actions (accès direct à l'API Payload interne). Pas besoin de GraphQL, réduit la surface d'attaque et le bundle.

---

## [2026-06-05] Clé d'identification client : téléphone (pas email)

**Contexte** : En Algérie, le téléphone est l'identifiant principal des clients COD.

**Décision** : `phone` est le champ unique sur la collection Customers. Validation format 05/06/07+8 chiffres.

**Raison** : Pratique locale — les clients ne donnent souvent pas d'email. Le téléphone sert à confirmer la commande et à livrer.

---

## [2026-06-05] Variations stockées en array sur le produit (pas collection séparée)

**Contexte** : Les 988 variations WooCommerce pourraient être une collection séparée.

**Décision** : Variations = array de fields dans la collection Products.

**Raison** : Simplifie les requêtes (un seul document), réduit le nombre de jointures, correspond mieux au modèle mental du commerçant (il édite un produit avec ses variations). Performance suffisante pour 135 produits × ~7 variations en moyenne.
