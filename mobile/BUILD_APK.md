# Build APK (sans EAS)

1. Repo GitHub → onglet **Actions** → workflow **Build Android APK** → **Run workflow** → choisir le tag (ex. `v1.0.6-preview`) → **Run**.
2. Attendre la fin du job (barre verte).
3. Onglet **Releases** (ou le lien dans le résumé du workflow) → télécharger `monpermis-….apk` (public, sans compte).
4. Avant le 1er test Google : SHA-1 release `D1:83:7F:F2:69:F6:97:2F:0D:38:69:1C:30:2C:36:13:5F:53:96:76` → Google Cloud → client Android `com.monpermis.app`.
5. Tester en priorité : **FedaPay** puis **Google Sign-In**.

## Secrets GitHub (une seule fois)

Settings → Secrets → Actions : `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`  
(valeurs dans `mobile/credentials/github-secrets.local.txt`, **non versionné**).
