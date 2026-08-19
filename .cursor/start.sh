#!/usr/bin/env bash
# Initialisation par démarrage : lance MongoDB (démon local) puis seed les données de test.
# Idempotent : ne démarre pas deux fois mongod et rejoue proprement les seeds.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MONGO_DATA="${MONGO_DATA:-$HOME/mongodb-data}"
MONGO_LOG="$MONGO_DATA/mongod.log"
mkdir -p "$MONGO_DATA"

# 1) Démarrer mongod s'il ne tourne pas déjà (127.0.0.1:27017).
if mongosh --quiet --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; then
  echo "== MongoDB déjà en écoute sur 27017 =="
else
  echo "== Démarrage de mongod =="
  mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 \
    --logpath "$MONGO_LOG" --logappend --fork
fi

# 2) Attendre que la base réponde (max ~30 s).
for i in $(seq 1 30); do
  if mongosh --quiet --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1; then
    echo "== MongoDB prêt =="
    break
  fi
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo "!! MongoDB n'a pas démarré à temps" >&2
    exit 1
  fi
done

# 3) Seed idempotent : compte admin superadmin + jeu de données apprenant/moniteur.
#    Exécuté depuis server/ pour que dotenv charge bien server/.env.
echo "== Seed admin + données de test locales =="
( cd "$REPO_ROOT/server" && node scripts/seed-admin.js ) || echo "(seed-admin ignoré)"
( cd "$REPO_ROOT/server" && node scripts/seed-local-test.mjs ) || echo "(seed-local ignoré)"

echo "== start.sh terminé =="
