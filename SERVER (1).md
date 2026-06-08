# SERVER.md — Runbook VPS Hostarts (boutique-she.com)

> Guide de déploiement complet, à suivre dans l'ordre avec Claude Code.
> VPS : Hostarts Virtual Server S — 3 vCores / 4 GB RAM / 80 GB SSD — Ubuntu 24.04 LTS — Datacenter Alger.
> Remplacer partout : `IP_VPS` par l'IP donnée par Houssem, `walid` par ton nom d'utilisateur choisi.

---

## ⚠️ Règles d'or
- Suivre les phases DANS L'ORDRE. Ne pas sauter la Phase 2 (sécurité) pour aller plus vite.
- Tester la nouvelle connexion SSH AVANT de fermer la session en cours (étape 2.4) — sinon risque de se bloquer dehors.
- Noter chaque mot de passe/secret généré dans un gestionnaire de mots de passe (jamais dans un fichier texte sur le bureau).
- En cas de blocage total : le panel client Hostarts permet de réinstaller le VPS et de repartir de zéro.

---

## PHASE 1 — Première connexion

```bash
# Depuis ton PC (PowerShell ou terminal)
ssh root@IP_VPS
# → accepter l'empreinte (yes), entrer le mot de passe fourni par Houssem
```

```bash
# Sur le serveur : mise à jour complète
apt update && apt upgrade -y
# Redémarrer si le noyau a été mis à jour
reboot
# (attendre 1 min, se reconnecter : ssh root@IP_VPS)
```

---

## PHASE 2 — Sécurisation (OBLIGATOIRE avant tout le reste)

### 2.1 Créer l'utilisateur admin
```bash
adduser walid                 # choisir un mot de passe FORT
usermod -aG sudo walid        # lui donner les droits sudo
```

### 2.2 Clé SSH (depuis TON PC, nouveau terminal)
```bash
# Générer une clé si tu n'en as pas déjà une (ne PAS écraser une clé existante)
ssh-keygen -t ed25519 -C "walid@webminds"
# Copier la clé publique vers le serveur :
ssh-copy-id walid@IP_VPS
# Windows sans ssh-copy-id :
# type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh walid@IP_VPS "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 2.3 Tester la connexion par clé (NOUVEAU terminal, sans fermer l'ancien)
```bash
ssh walid@IP_VPS    # doit se connecter SANS demander de mot de passe
sudo whoami          # doit répondre "root" après ton mot de passe utilisateur
```

### 2.4 Durcir SSH (seulement si 2.3 fonctionne ✅)
```bash
sudo nano /etc/ssh/sshd_config
# Modifier/vérifier ces lignes :
#   PermitRootLogin no
#   PasswordAuthentication no
#   PubkeyAuthentication yes
sudo systemctl restart ssh
# ⚠️ GARDER la session ouverte et tester dans un autre terminal : ssh walid@IP_VPS
```

### 2.5 Firewall UFW
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable           # confirmer avec y
sudo ufw status verbose   # vérifier
```

### 2.6 fail2ban (anti brute-force)
```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd   # doit montrer la jail active
```

### 2.7 Mises à jour de sécurité automatiques
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # répondre Yes
```

### 2.8 Swap 2 GB (filet de sécurité RAM)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h   # vérifier que Swap: 2.0Gi apparaît
```

---

## PHASE 3 — Installation de Coolify

```bash
# En root (ou sudo -i depuis walid)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```
- À la fin, l'installeur affiche l'URL d'accès : `http://IP_VPS:8000`
- Ouvrir le port du panel le temps de la config :
```bash
sudo ufw allow 8000/tcp
```
- Ouvrir `http://IP_VPS:8000` dans le navigateur → **créer immédiatement le compte admin** (le premier inscrit devient admin — ne pas traîner).
- Dans Coolify : Settings → configurer l'instance (laisser localhost comme serveur par défaut).

> Note : une fois un domaine configuré pour Coolify lui-même (optionnel, ex: coolify.webminds.dz), on pourra fermer le port 8000 et y accéder en HTTPS.

---

## PHASE 4 — PostgreSQL de production

Dans l'interface Coolify :
1. **+ New → Database → PostgreSQL** (version 16+).
2. Nom : `shesfit-db`. Générer un mot de passe fort (Coolify le fait).
3. Démarrer la base, puis copier l'**URL de connexion interne** (format `postgres://user:pass@host:5432/db`).
4. ⚠️ NE PAS exposer le port 5432 publiquement (laisser "Public Port" désactivé) — l'app y accède en réseau interne Docker.

---

## PHASE 5 — Déploiement de l'application

### 5.1 Connecter GitHub
Coolify → **Sources → + Add → GitHub App** → suivre l'assistant (autoriser l'accès au repo du projet uniquement).

### 5.2 Créer l'application
1. **+ New → Application** → choisir le repo + branche `main`.
2. Build Pack : **Nixpacks** (auto-détection Next.js) — ou Dockerfile si le projet en contient un.
3. Port exposé : `3000`.

### 5.3 Variables d'environnement (onglet Environment Variables)
```
DATABASE_URI=postgres://...        ← l'URL copiée en Phase 4
PAYLOAD_SECRET=...                 ← générer : openssl rand -hex 32
NEXT_PUBLIC_SERVER_URL=https://boutique-she.com
NODE_ENV=production
```
(+ toutes les autres variables du `.env.example` du projet)

### 5.4 Premier déploiement
- Cliquer **Deploy** → suivre les logs de build.
- Si le build échoue par manque de RAM : activer le swap (déjà fait en 2.8) et relancer ; en dernier recours, build local en mode standalone et Dockerfile.
- Tester : `http://IP_VPS:PORT_ATTRIBUÉ` → le site doit répondre.

---

## PHASE 6 — Domaine + SSL

1. **DNS** (dans le cPanel actuel du client, Zone Editor) :
   - Enregistrement `A` : `boutique-she.com` → `IP_VPS`
   - Enregistrement `A` : `www` → `IP_VPS`
   - ⚠️ Ne PAS toucher aux enregistrements MX (emails) — ils restent sur le cPanel.
2. Attendre la propagation (15 min à quelques heures — vérifier sur dnschecker.org).
3. Dans Coolify, sur l'application → **Domains** : `https://boutique-she.com` → Save → Coolify génère le certificat Let's Encrypt automatiquement et redirige HTTP→HTTPS.
4. Vérifier : `https://boutique-she.com` avec le cadenas 🔒.

---

## PHASE 7 — Données de production

```bash
# Depuis le PC local, dans le dossier du projet, avec DATABASE_URI de PROD dans .env :
# (ou exécuter le script directement sur le serveur via Coolify → Terminal)
npm run import:products   # script idempotent — relançable sans doublons
```
1. Vérifier le rapport d'import (135 produits, variations, images).
2. Ouvrir `https://boutique-she.com/admin` → créer le compte admin du CLIENT (email + mot de passe fort).
3. Vérifier : produits visibles dans l'admin, images chargées, une commande test passe bien.
4. Renseigner les pixels Meta/TikTok du client dans l'admin (إعدادات التسويق).

---

## PHASE 8 — Backups + Monitoring

### 8.1 Backups Coolify
- Sur la base PostgreSQL → **Backups** : programmer un dump **quotidien** (ex: 03h00), rétention 7 jours.

### 8.2 Backup EXTERNALISÉ (hors du serveur — leçon Octenium 🔥)
Option simple : cron qui dump et envoie vers un stockage externe (S3-compatible, autre serveur, ou téléchargement régulier).
```bash
# Exemple : dump quotidien local + à récupérer/synchroniser à l'extérieur
sudo crontab -e
# Ajouter :
0 4 * * * docker exec $(docker ps -qf name=shesfit-db) pg_dump -U postgres shesfit-db | gzip > /home/walid/backups/db-$(date +\%F).sql.gz
0 5 * * * find /home/walid/backups -name "db-*.sql.gz" -mtime +14 -delete
```
- Mieux : configurer dans Coolify un backup S3 (Backblaze B2 ou autre) si disponible.
- ⚠️ Tester UNE restauration au moins une fois : un backup non testé n'est pas un backup.

### 8.3 Monitoring
- Créer un compte **UptimeRobot** (gratuit) → monitor HTTPS sur `https://boutique-she.com`, alerte email.
- Vérifier les sauvegardes automatiques Hostarts dans le panel client (fréquence/rétention — demander à Houssem).

---

## ✅ Checklist de mise en ligne finale
- [ ] Site accessible en HTTPS avec cadenas (www et sans www)
- [ ] Commande test complète : produit + variation → panier → checkout → thank you page avec n° de commande
- [ ] Commande test visible dans /admin avec statut جديدة
- [ ] Les 135 produits + images dans l'admin
- [ ] Pixels Meta + TikTok déclenchent (Pixel Helper) : PageView, AddToCart, Purchase
- [ ] Backup quotidien programmé + copie externalisée + restauration testée
- [ ] UptimeRobot actif
- [ ] ufw status : seuls 22/80/443 ouverts (+8000 fermé après config : sudo ufw delete allow 8000/tcp)
- [ ] Accès admin client créé et transmis de façon sécurisée
- [ ] Ancien site cPanel laissé en ligne 1-2 semaines puis archivé (emails conservés)

---

## 🔧 Maintenance mensuelle (~20-30 min)
```bash
ssh walid@IP_VPS
sudo apt update && sudo apt upgrade -y     # mises à jour système
df -h                                       # espace disque (< 80%)
free -h                                     # RAM/swap
sudo fail2ban-client status sshd            # IP bannies (curiosité)
ls -lh ~/backups | tail                     # les dumps tournent bien
```
- Dans Coolify : vérifier les backups + mettre à jour Coolify si proposé.
- Tous les 3 mois : tester une restauration de backup.

## 🆘 En cas de problème
| Symptôme | Réflexe |
|---|---|
| Site down | Coolify → logs de l'app → Restart |
| Build échoue | Logs de build ; vérifier RAM (`free -h`) ; relancer |
| BDD inaccessible | Coolify → état du service PostgreSQL → Restart |
| Plus d'accès SSH | Console VNC du panel Hostarts |
| Disque plein | Nettoyer : `docker system prune -a` (prudence) + vieux backups |
| Dépassé / urgent | Intervention ponctuelle Houssem (payante) |
