#!/usr/bin/env bash
# Build EAS profile preview-local with the machine LAN IP (port 5001).
# Google client IDs : environnement EAS "preview" (eas env:set EXPO_PUBLIC_GOOGLE_*).
set -euo pipefail
cd "$(dirname "$0")/.."

LAN="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
API_URL="${EXPO_PUBLIC_API_URL:-}"
if [[ -z "$API_URL" ]]; then
  if [[ -n "${LAN:-}" ]]; then
    API_URL="http://${LAN}:5001"
  else
    echo "Définis EXPO_PUBLIC_API_URL (ex: http://192.168.x.x:5001) — IP LAN introuvable."
    exit 1
  fi
fi

EAS_JSON="eas.json"
BACKUP="$(mktemp)"
cp "$EAS_JSON" "$BACKUP"
cleanup() { cp "$BACKUP" "$EAS_JSON"; rm -f "$BACKUP"; }
trap cleanup EXIT

export API_URL
node <<'NODE'
const fs = require('fs')
const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'))
eas.build['preview-local'].env = eas.build['preview-local'].env || {}
eas.build['preview-local'].env.EXPO_PUBLIC_API_URL = process.env.API_URL
fs.writeFileSync('eas.json', JSON.stringify(eas, null, 2) + '\n')
NODE

echo "preview-local EXPO_PUBLIC_API_URL=$API_URL"
npx eas-cli build -p android --profile preview-local
