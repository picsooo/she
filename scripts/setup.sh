#!/usr/bin/env bash
# ============================================================
# setup.sh — Installation complète du projet She's Fit & Beauty
# Usage : npm run setup
# Fait tout automatiquement : env, dépendances, serveur, import
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   She's Fit & Beauty — Setup automatique ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Créer .env.local si absent ──────────────────────────
if [ ! -f ".env.local" ]; then
  echo "▶ Création de .env.local..."
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "dev-secret-$(date +%s)")
  cat > .env.local << EOF
DATABASE_URI=file:./boutique-she.db
PAYLOAD_SECRET=${SECRET}
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
EOF
  echo "  ✓ .env.local créé avec un secret aléatoire"
else
  echo "  ✓ .env.local déjà présent"
fi

# ── 2. Installer les dépendances ────────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo "▶ Installation des dépendances npm..."
  npm install
  echo "  ✓ Dépendances installées"
else
  echo "  ✓ node_modules déjà présent"
fi

# ── 3. Vérifier que produits.csv est là ─────────────────────
if [ ! -f "data/legacy/produits.csv" ]; then
  echo ""
  echo "  ✗ data/legacy/produits.csv introuvable"
  echo "    Le fichier doit être dans le repo. Vérifiez git pull."
  exit 1
fi
echo "  ✓ produits.csv présent"

# ── 4. Lancer le serveur Next.js en arrière-plan ───────────
echo ""
echo "▶ Démarrage du serveur Next.js..."
npm run dev &
SERVER_PID=$!
echo "  PID serveur : $SERVER_PID"

# Attendre que le serveur soit prêt (max 60s)
echo "  Attente du serveur (peut prendre 30s)..."
for i in $(seq 1 60); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:3000" 2>/dev/null || echo "000")
  if [ "$STATUS" != "000" ]; then
    echo "  ✓ Serveur prêt (${STATUS})"
    break
  fi
  sleep 1
done

# ── 5. Lancer l'import des produits ─────────────────────────
echo ""
echo "▶ Import des produits WooCommerce → Payload CMS"
echo "  (téléchargement des images depuis boutique-she.com)"
echo "  Patience : 5-15 minutes selon la connexion..."
echo ""

SECRET_VAL=$(grep "PAYLOAD_SECRET" .env.local | cut -d'=' -f2)
RESULT=$(curl -s --max-time 1800 -X POST "http://localhost:3000/api/admin/import-products" \
  -H "x-import-key: ${SECRET_VAL}" \
  -H "Content-Type: application/json" 2>&1)

echo "$RESULT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
if (d.success) {
  const s = d.stats;
  console.log('');
  console.log('╔══════════════════╗');
  console.log('║  Import terminé  ║');
  console.log('╚══════════════════╝');
  console.log('Catégories :', s.categories.created, 'créées,', s.categories.skipped, 'existantes');
  console.log('Produits   :', s.products.created, 'créés,', s.products.updated, 'mis à jour');
  console.log('Variations :', s.variations.created, 'importées');
  console.log('Images     :', s.images.downloaded, 'téléchargées,', s.images.cached, 'du cache');
} else {
  console.error('Erreur import:', d.error);
}
" 2>/dev/null || echo "$RESULT"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Site prêt sur http://localhost:3000      ║"
echo "║  👔  Admin sur http://localhost:3000/admin    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Le serveur tourne en arrière-plan (PID: $SERVER_PID)"
echo "Pour l'arrêter : kill $SERVER_PID"
echo ""
