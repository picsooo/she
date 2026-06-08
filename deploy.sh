#!/bin/bash
# deploy.sh — Déploiement depuis le PC local vers le VPS
# Usage : bash deploy.sh
# Prérequis : clé SSH configurée pour walid@102.206.40.191

set -e

VPS="walid@102.206.40.191"
APP_DIR="/var/www/boutique-she"

echo "🚀 Déploiement boutique-she.com..."

# 1. Push le code local sur GitHub
echo "📤 Push GitHub..."
git add -A
git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')" 2>/dev/null || echo "Rien à committer"
git push origin master

# 2. Connexion SSH + mise à jour + rebuild + redémarrage sans coupure
echo "🔄 Mise à jour serveur..."
ssh -o ConnectTimeout=30 $VPS << 'REMOTE'
set -e
cd /var/www/boutique-she

echo "→ git pull..."
git pull origin master

echo "→ npm install..."
npm install --legacy-peer-deps --silent

echo "→ npm build..."
npm run build

echo "→ pm2 reload (zero-downtime)..."
pm2 reload boutique-she

echo "✅ Déploiement terminé !"
pm2 status boutique-she
REMOTE

echo ""
echo "✅ Site mis à jour : https://boutique-she.com"
