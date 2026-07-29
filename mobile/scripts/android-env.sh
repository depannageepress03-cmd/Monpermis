#!/usr/bin/env bash
# Charge JAVA_HOME / ANDROID_HOME pour les builds locaux Monpermis.
#
# Si Java 17 / Android SDK manquent en local : ne pas installer ici.
# APK via CI (recommandé) :
#   gh workflow run build-apk.yml -f version=v1.0.38-preview
#   → artifact + Release : mobile/monpermis-<tag>.apk
#   Workflow : .github/workflows/build-apk.yml
set -euo pipefail

if [[ -z "${JAVA_HOME:-}" ]]; then
  if [[ -d "$HOME/.local/jdk" ]]; then
    candidate="$(echo "$HOME/.local/jdk"/jdk-17*/Contents/Home)"
    if [[ -x "$candidate/bin/java" ]]; then
      export JAVA_HOME="$candidate"
    fi
  fi
  if [[ -z "${JAVA_HOME:-}" ]] && /usr/libexec/java_home -v 17 >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17)"
  fi
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [[ ! -x "${JAVA_HOME:-}/bin/java" ]]; then
  echo "Java 17 introuvable. Installe Temurin 17 ou Android Studio, puis relance."
  echo "Sinon : gh workflow run build-apk.yml -f version=vX.Y.Z-preview"
  exit 1
fi

if [[ ! -x "$ANDROID_HOME/platform-tools/adb" ]]; then
  echo "Android SDK introuvable ($ANDROID_HOME)."
  echo "Installe Android Studio (SDK + platform-tools), puis relance."
  echo "Sinon : gh workflow run build-apk.yml -f version=vX.Y.Z-preview"
  exit 1
fi

echo "JAVA_HOME=$JAVA_HOME"
echo "ANDROID_HOME=$ANDROID_HOME"
"$JAVA_HOME/bin/java" -version 2>&1 | head -1
adb version | head -1
