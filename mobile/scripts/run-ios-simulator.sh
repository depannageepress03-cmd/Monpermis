#!/usr/bin/env bash
# Installe et lance le build iOS simulateur Monpermis (après installation de Xcode).
set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIR="dist/Monpermisbj.app"
ARCHIVE="dist/monpermis-v1.0.51-ios-simulator.tar.gz"
BUNDLE_ID="com.monpermis.app"

if ! xcode-select -p 2>/dev/null | grep -q 'Xcode.app'; then
  echo "Xcode complet est requis (pas seulement les Command Line Tools)."
  echo "Installe Xcode depuis l’App Store, ouvre-le une fois, puis relance :"
  echo "  bash scripts/run-ios-simulator.sh"
  open "macappstore://apps.apple.com/app/xcode/id497799835" 2>/dev/null || true
  exit 1
fi

# Accepte la licence si besoin (peut demander un sudo).
sudo xcodebuild -license accept 2>/dev/null || true
sudo xcodebuild -runFirstLaunch 2>/dev/null || true

if [[ ! -d "$APP_DIR" ]]; then
  if [[ ! -f "$ARCHIVE" ]]; then
    echo "Archive manquante: $ARCHIVE"
    exit 1
  fi
  echo "Extraction de $ARCHIVE…"
  tar -xzf "$ARCHIVE" -C dist
fi

# Choisit un iPhone disponible, sinon boote le premier iPhone.
DEVICE_NAME="$(xcrun simctl list devices available | sed -n 's/.*\(iPhone [^)]*\).*/\1/p' | head -1 | sed 's/ *(.*//' | xargs)"
if [[ -z "${DEVICE_NAME:-}" ]]; then
  echo "Aucun simulateur iPhone trouvé. Ouvre Xcode → Settings → Platforms → iOS."
  exit 1
fi

UDID="$(xcrun simctl list devices available | awk -v n="$DEVICE_NAME" '
  $0 ~ n {
    if (match($0, /\(([A-F0-9-]+)\)/)) {
      print substr($0, RSTART+1, RLENGTH-2)
      exit
    }
  }
')"

if [[ -z "${UDID:-}" ]]; then
  echo "Impossible de trouver l’UDID pour: $DEVICE_NAME"
  xcrun simctl list devices available | head -40
  exit 1
fi

echo "Simulateur: $DEVICE_NAME ($UDID)"
STATE="$(xcrun simctl list devices | grep "$UDID" | grep -o 'Booted\|Shutdown' | head -1 || true)"
if [[ "$STATE" != "Booted" ]]; then
  xcrun simctl boot "$UDID" || true
fi
open -a Simulator

echo "Installation de Monpermis…"
xcrun simctl uninstall "$UDID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP_DIR"
xcrun simctl launch "$UDID" "$BUNDLE_ID"
echo "OK — Monpermis lancé sur le simulateur."
