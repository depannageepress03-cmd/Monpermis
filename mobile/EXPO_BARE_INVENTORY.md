# Inventaire figé — Expo bare (prebuild) — Monpermis mobile

Date : 2026-07-11  
Décision : `npx expo prebuild` (sortie d’**EAS Build**), conservation des modules Expo en bare.

## Modules Expo conservés

| Package | Rôle dans l’app | Statut bare |
|---------|-----------------|-------------|
| `expo` | bootstrap + Metro / export:embed | Conservé |
| `expo-web-browser` | Checkout **FedaPay** + fin de session Google | Conservé (critique) |
| `expo-auth-session` + `expo-crypto` | Connexion Google | Conservé — retester avec SHA-1 **release** |
| `expo-audio` | Audio code de la route | Conservé |
| `expo-video` | Plugin natif (médias) | Conservé |
| `expo-linear-gradient` | UI | Conservé |
| `expo-linking` | Deep links `monpermis://` | Conservé |
| `expo-status-bar` | Status bar | Conservé |
| `expo-constants` | Host API en dev | Conservé |

## Non utilisés (pas de risque)

`expo-notifications`, `expo-camera`, etc.

## Build cloud

- Workflow : `.github/workflows/build-apk.yml`
- API figée : `https://monpermis-api.onrender.com`
- Signature : secrets GitHub (`ANDROID_KEYSTORE_*`)
