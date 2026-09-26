# QA Report — Monpermis.bj (branche `qa/recette-complete`)

> Recette complète : statique → API → E2E web → mobile → déploiement.
> Règles : jamais la prod (DB test isolée, FedaPay sandbox), aucun secret committé,
> aucun fix métier sans ordre « corrige » — les bugs sont listés, pas corrigés.

## 1. Résumé (3 lignes)
- _À compléter en fin de recette._
- Statique : builds web/admin/moniteur OK, `mobile lint` OK, 22 tests unitaires maison OK, audit 0 vulnérabilité, `expo-doctor` 3 échecs (non bloquants, voir §4).
- ⚠️ **Alerte env** : `server/.env` local pointe vers Atlas partagé + `FEDAPAY_ENVIRONMENT=live`. Toute la recette paiement/DB utilise `.env.test` + sandbox + base isolée.

## 2. Tableau de recette
| Fonctionnalité | App | Statut | Preuve | Gravité |
|---|---|---|---|---|
| Build web apprenant | web | OK | `npm run build:learner-web` ✓ 2.01s | — |
| Build back-office | admin | OK | `npm run build --prefix administration` ✓ 2.46s | — |
| Build portail moniteur | moniteur | OK | `npm run build --prefix moniteur` ✓ 1.21s | — |
| Typecheck mobile | mobile | OK | `npm run lint` (tsc) 0 erreur | — |
| Tests unitaires maison | mobile | OK | `npm test` : 22 passed | — |
| Audit dépendances | root+server | OK | `npm audit --omit=dev` : 0 vulnérabilité | — |
| expo-doctor | mobile | KO (non bloquant) | 3/18 échecs : eas-cli en dépendances, config app non synchronisée (projet bare + prebuild), `react-native-render-html` non maintenue | mineur |
| Responsive desktop apprenant | web | OK (fix appliqué) | conteneurs 1120px + grilles `mp-grid-desktop` + dock TabBar 560px, build OK | — |

## 3. Bugs (reproduire → attendu/obtenu → suspect → correctif proposé, NON appliqués)
### B1. Page `/conduite/reservation` (web) rend des données mock
- Repro : ouvrir la réservation d'une séance côté web.
- Attendu : moniteurs/jours/créneaux réels (`fetchPublicMoniteurs`, `fetchMoniteurAvailability`).
- Obtenu : constantes `MONITEURS`/`DAYS`/`SLOTS` codées en dur affichées ; résultats API jetés (`[, setMoniteurs]`, `[, setError]`…).
- Suspect : `src/pages/conduite/ReservationPage.tsx:22-44` (mocks), `:51-71` (setters ignorés).
- Correctif : réécrire sur le modèle de `src/pages/ConduitePage.tsx` + flow mobile `ReservationFlowScreen.tsx`.

## 4. Couverture / non testé
- E2E Playwright, tests API, export Expo, workflow APK : à venir (§5-6).

## 5. Commandes
```bash
npm run build:learner-web && npm run build --prefix administration && npm run build --prefix moniteur
npm run lint --prefix mobile && npm test --prefix mobile
npx expo-doctor # dans mobile/
```
