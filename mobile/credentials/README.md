# Credentials Android (signature release)

Les fichiers `*.keystore` et `github-secrets.local.txt` restent **locaux**.

## Secrets GitHub à créer

Repo → **Settings** → **Secrets and variables** → **Actions** :

| Secret | Contenu |
|--------|---------|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 monpermis-release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | `monpermis` |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

Générés localement dans `github-secrets.local.txt` (gitignored).

## Google Sign-In

Après le premier APK release, ajoute le **SHA-1** du keystore release dans Google Cloud Console (client OAuth Android, package `com.monpermis.app`).
