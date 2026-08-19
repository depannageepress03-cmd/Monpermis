#!/usr/bin/env bash
# Bootstrap idempotent du monorepo Monpermis.bj pour les Cloud Agents.
# S'exécute après le checkout du dépôt. Ne démarre aucun service : voir start.sh.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

# 1) MongoDB (base de données de l'API). Installé une seule fois, persiste dans le snapshot.
if ! command -v mongod >/dev/null 2>&1; then
  echo "== Installation de MongoDB Community 8.0 =="
  . /etc/os-release
  UBUNTU_CODENAME="${UBUNTU_CODENAME:-${VERSION_CODENAME:-noble}}"
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | $SUDO gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/8.0 multiverse" \
    | $SUDO tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  $SUDO apt-get update -qq
  $SUDO apt-get install -y -qq mongodb-org-server mongodb-mongosh mongodb-org-tools
else
  echo "== MongoDB déjà présent ($(mongod --version | head -1)) =="
fi

# 2) Dépendances Node de l'API et des fronts web (le mobile Expo/Android est hors périmètre cloud).
echo "== Installation des dépendances npm =="
npm ci --prefix "$REPO_ROOT"                 # front apprenant (racine, vite)
npm ci --prefix "$REPO_ROOT/server"          # API Express
npm ci --prefix "$REPO_ROOT/moniteur"        # portail moniteur
npm ci --prefix "$REPO_ROOT/administration"  # back-office admin

# 3) server/.env de développement local (non commité). Généré seulement s'il manque.
if [ ! -f "$REPO_ROOT/server/.env" ]; then
  echo "== Génération de server/.env (développement local) =="
  JWT="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
  cat > "$REPO_ROOT/server/.env" <<EOF
# Fichier .env de DÉVELOPPEMENT LOCAL généré automatiquement (jamais commité).
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/auto-ecole
JWT_SECRET=$JWT

# URLs front locales (CORS ; les fronts passent surtout par le proxy Vite).
CLIENT_URL=http://localhost:5173
ADMIN_CLIENT_URL=http://localhost:5174
MONITEUR_CLIENT_URL=http://localhost:5175
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
API_PUBLIC_URL=http://localhost:5000

# Compte admin seedé au démarrage (aligné avec server/scripts/check-local-flow.mjs).
ADMIN_PHONE=0147880143
ADMIN_PASSWORD=admin1234
ADMIN_FULL_NAME=Administrateur Local
ADMIN_ROLE=superadmin
ADMIN_FORCE_ROLE=true
SUPERADMIN_PHONE=0147880143
ALLOW_ADMIN_REGISTRATION=true
EOF
else
  echo "== server/.env déjà présent — inchangé =="
fi

echo "== Bootstrap terminé =="
