 via **FedaPay** (Mobile Money, devise XOF).
4. Distribuer l’expérience sur **web** (apprenant + admin) et **mobile Android**.

### 2.3 Non-objectifs (hors périmètre actuel)

- Application moniteur dédiée (compte connecté moniteur).
- Publication sur Google Play / App Store (distribution actuelle : APK via GitHub Releases).
- Module E-Codepermis « conditions réelles » : présent en navigation mais encore partiellement placeholder.

---

## 3. Acteurs et cas d’usage

### 3.1 Acteurs

| Acteur | Description | Canal |
|--------|-------------|--------|
| **Apprenant** | Utilisateur final qui apprend le code / réserve des heures de conduite | Web + application mobile |
| **Administrateur** | Gère contenu, utilisateurs, plans, réservations | Back-office web |
| **Système FedaPay** | Prestataire de paiement ; notifie le backend via webhook | API externe |
| **Moniteur** | Ressource de planning (entité métier), pas un compte applicatif | Géré par l’admin |

### 3.2 Cas d’usage principaux — Apprenant

1. S’inscrire (email / téléphone / mot de passe) ou se connecter avec Google.
2. Consulter l’accueil et les modules disponibles selon l’abonnement.
3. Souscrire à une offre (Code, Conduite, Pack) et payer via FedaPay.
4. Réviser le code : chapitres → cours → questions / sujets de test.
5. Passer des examens blancs et consulter ses notes / progression.
6. Consulter les leçons de conduite et réserver un créneau.
7. Suivre son solde d’heures de conduite.

### 3.3 Cas d’usage principaux — Administrateur

1. Se connecter (téléphone + mot de passe).
2. Piloter le tableau de bord.
3. CRUD contenu code de la route (chapitres, cours, médias, QCM, examens).
4. CRUD contenu conduite et gestion moniteurs / créneaux / réservations.
5. Gérer les utilisateurs apprenants et leurs heures.
6. Gérer les plans d’abonnement et activer / assigner manuellement si besoin.
7. Créer un autre administrateur (si autorisé par configuration).

---

## 4. Vision d’architecture

```text
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│  Web apprenant  │  │  Admin (Vite)    │  │  Mobile Android    │
│  (React + Vite) │  │  administration/ │  │  Expo bare / RN    │
└────────┬────────┘  └────────┬─────────┘  └─────────┬──────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              ▼
                    ┌───────────────────┐
                    │  API Express      │
                    │  server/          │
                    │  monpermis-api    │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        MongoDB Atlas     FedaPay         Uploads
        (auto-ecole)      (checkout +     (images/audio)
                           webhook)
```

### 4.1 Organisation du monorepo

| Dossier | Rôle |
|---------|------|
| `src/` | Front **apprenant web** |
| `administration/` | Back-office **admin** |
| `server/` | **API** Node.js / Express / Mongoose |
| `mobile/` | Application **mobile** (Expo bare + `android/`) |
| `.github/workflows/` | Build APK automatique (GitHub Actions) |
| `render.yaml` / `RENDER_DEPLOY.txt` | Déploiement cloud Render |

---

## 5. Stack technique

| Couche | Technologies |
|--------|----------------|
| API | Node.js ≥ 20, Express 5, Mongoose 8, JWT, bcrypt, Multer, Nodemailer, FedaPay SDK, Google Auth |
| Base de données | MongoDB Atlas |
| Web apprenant | React 19, Vite, React Router, Google OAuth React |
| Admin | React 19, Vite, TipTap, dnd-kit |
| Mobile | React Native 0.81, Expo SDK 54 (bare), React Navigation, AsyncStorage, WebView, expo-audio / expo-video / expo-web-browser |
| Paiement | FedaPay (XOF, Bénin) |
| Hébergement | Render (API + sites statiques) |
| Distribution Android | GitHub Actions → `assembleRelease` → GitHub Release (APK public) |

---

## 6. Exigences fonctionnelles détaillées

### 6.1 Authentification apprenant

| ID | Exigence | Priorité |
|----|----------|----------|
| AUTH-01 | Inscription avec données personnelles + mot de passe | Must |
| AUTH-02 | Connexion email/téléphone + mot de passe | Must |
| AUTH-03 | Connexion Google (ID Token) | Should |
| AUTH-04 | Session JWT (durée typique 7 jours) | Must |
| AUTH-05 | Compte désactivé (`isActive: false`) → accès refusé | Must |
| AUTH-06 | Deep link / scheme mobile `monpermis://` | Should |

### 6.2 Authentification administrateur

| ID | Exigence | Priorité |
|----|----------|----------|
| ADM-01 | Login téléphone + mot de passe | Must |
| ADM-02 | JWT admin distinct (scope admin, durée ~8 h) | Must |
| ADM-03 | Verrouillage après 5 échecs (15 minutes) | Must |
| ADM-04 | Création d’admin contrôlée par `ALLOW_ADMIN_REGISTRATION` | Should |

### 6.3 Abonnements et paiements

| ID | Exigence | Priorité |
|----|----------|----------|
| PAY-01 | Catalogue de plans (grâce, Code, Conduite, Pack) | Must |
| PAY-02 | Souscription → transaction `pending` + URL checkout FedaPay | Must |
| PAY-03 | Paiement Mobile Money via navigateur / WebBrowser | Must |
| PAY-04 | Webhook FedaPay signé HMAC → activation automatique | Must |
| PAY-05 | Crédit automatique des heures de conduite selon le plan | Must |
| PAY-06 | Droits d’accès : `accessCode`, `accessConduite`, `accessECodepermis` | Must |
| PAY-07 | Sync manuelle du statut de paiement côté client | Should |
| PAY-08 | Activation / assignation manuelle côté admin | Should |

**Plans par défaut (seed si base vide) :**

| Plan | Ordre de grandeur | Accès |
|------|-------------------|--------|
| Période de grâce | 14 jours | Accès limité / découverte |
| Code | ~5 000 XOF | Code de la route |
| Conduite | ~25 000 XOF | Conduite + heures incluses |
| Pack | ~30 000 XOF | Code + conduite + heures |

### 6.4 Code de la route

| ID | Exigence | Priorité |
|----|----------|----------|
| CODE-01 | Hub modules : révision, examens, notes, E-Codepermis | Must |
| CODE-02 | Chapitres / cours avec médias (texte, image, vidéo, audio) | Must |
| CODE-03 | Questions / QCM avec correction et audio optionnel | Must |
| CODE-04 | Sujets de test par chapitre | Must |
| CODE-05 | Examens blancs + historique / notes | Must |
| CODE-06 | Suivi de progression (cours complétés, sessions min. durée) | Must |
| CODE-07 | Contenu géré entièrement depuis l’admin | Must |

### 6.5 Conduite

| ID | Exigence | Priorité |
|----|----------|----------|
| COND-01 | Hub conduite + leçons par chapitres | Must |
| COND-02 | Réservation de créneaux (moniteur, date/heure) | Must |
| COND-03 | Annulation de réservation selon règles métier API | Must |
| COND-04 | Solde d’heures visible et décompté | Must |
| COND-05 | Admin : moniteurs, créneaux libres/occupés, photos véhicule | Must |

### 6.6 Administration

| ID | Exigence | Priorité |
|----|----------|----------|
| BACK-01 | Dashboard statistiques | Must |
| BACK-02 | Gestion utilisateurs (affichage téléphone privilégié) | Must |
| BACK-03 | Éditeur de contenu riche (TipTap) + upload image/audio | Must |
| BACK-04 | Réordonnancement (drag & drop) des éléments pédagogiques | Should |
| BACK-05 | Gestion abonnements / plans | Must |
| BACK-06 | Gestion réservations | Must |

### 6.7 Application mobile

| ID | Exigence | Priorité |
|----|----------|----------|
| MOB-01 | Parité fonctionnelle majeure avec le web apprenant | Must |
| MOB-02 | Intro de marque (fond clair) au lancement | Should |
| MOB-03 | Build APK release sans dépendance à EAS Build | Must |
| MOB-04 | API de production figée (`monpermis-api.onrender.com`) | Must |
| MOB-05 | Icône / splash fond blanc | Should |

---

## 7. Exigences non fonctionnelles

| ID | Domaine | Exigence |
|----|---------|----------|
| NF-01 | Disponibilité | API healthcheck `/api/health` ; cold start possible sur Render free |
| NF-02 | Sécurité | Secrets hors Git (`.env`, secrets GitHub, env Render) |
| NF-03 | Sécurité | Mots de passe hashés bcrypt ; JWT signés |
| NF-04 | Sécurité | CORS limité aux origines autorisées |
| NF-05 | Sécurité | Webhook FedaPay : corps brut + signature obligatoire |
| NF-06 | Performance | Uploads limités (images ≤ 5 Mo, audio ≤ 15 Mo) |
| NF-07 | Compatibilité | Android (APK arm64 / armeabi-v7a) |
| NF-08 | Localisation | Interface en français |
| NF-09 | Devise | XOF (Franc CFA) |
| NF-10 | Traçabilité | Transactions de paiement et abonnements en base |

---

## 8. Modèle de données (vue métier)

Principales collections MongoDB :

| Collection | Rôle |
|------------|------|
| `User` | Apprenant, progression, solde heures, statut |
| `Admin` | Compte administrateur |
| `Chapter` / modules associés | Contenu code de la route |
| `Question`, `TestSubject` | QCM et sujets |
| `PracticeExam` / tentatives | Examens blancs |
| `ConduiteChapter` | Contenu conduite |
| `Moniteur`, `Creneau`, `Reservation` | Planning pratique |
| `SubscriptionPlan` | Offres commerciales |
| `UserSubscription` | Abonnement utilisateur |
| `PaymentTransaction` | Paiements FedaPay |

Fichiers médias : stockés sur le serveur (`server/uploads/`) et servis via `/uploads`.

---

## 9. Spécification des interfaces

### 9.1 API (préfixes)

| Préfixe | Public cible |
|---------|--------------|
| `/api/auth` | Apprenant |
| `/api/subscriptions` | Apprenant (plans, paiement) |
| `/api/content/revision` | Apprenant (code) |
| `/api/content/conduite` | Apprenant (conduite) |
| `/api/reservations` | Apprenant |
| `/api/webhooks/fedapay` | FedaPay |
| `/api/admin/*` | Administrateur |
| `/api/health` | Monitoring |

### 9.2 Clients

| Client | URL / distribution typique |
|--------|----------------------------|
| API | `https://monpermis-api.onrender.com` |
| Admin | `https://monpermis-admin.onrender.com` |
| Web apprenant | service Render `monpermis-web` (ou domaine dédié) |
| Mobile | APK GitHub Releases (`vX.Y.Z-preview`) |

### 9.3 Identité visuelle

| Élément | Valeur |
|---------|--------|
| Nom | **Monpermis.bj** |
| Vert | `#00B050` |
| Or / jaune | `#FFC000` |
| Bleu marine | `#001030` |
| Mot-symbole | « Monpermis » + « .bj » en vert |

---

## 10. Flux de paiement (détail)

1. L’apprenant choisit un plan → `POST /api/subscriptions/subscribe`.
2. Le backend crée un abonnement `pending_payment` + une transaction.
3. FedaPay renvoie une `paymentUrl`.
4. Le client ouvre le checkout (navigateur web ou `expo-web-browser` mobile).
5. Après paiement, FedaPay appelle `POST /api/webhooks/fedapay`.
6. Si `transaction.approved` et signature valide → activation :
   - dates de validité ;
   - flags d’accès selon le plan ;
   - crédit des heures (`soldeHeures`) si prévu et non déjà crédité.
7. L’apprenant revient sur `/abonnement` (callback) ; sync possible côté client.

**Point de vigilance QA :** tester en priorité FedaPay et Google Sign-In sur chaque nouvelle APK (SHA-1 du keystore release à déclarer dans Google Cloud).

---

## 11. Déploiement et exploitation

### 11.1 Render

Trois services prévus (`render.yaml`) :

1. **monpermis-api** — Node, root `server`, health `/api/health`
2. **monpermis-admin** — static, root `administration`, publish `dist`
3. **monpermis-web** — static, build web apprenant, publish `dist`

Variables critiques API : `MONGODB_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `CLIENT_URL`, `ADMIN_CLIENT_URL`, `API_PUBLIC_URL`, clés FedaPay, SMTP, `GOOGLE_CLIENT_ID`.

### 11.2 Build mobile (sans EAS)

1. GitHub → **Actions** → **Build Android APK** → **Run workflow**
2. Tag de version (ex. `v1.0.8-preview`)
3. APK publié dans **Releases** (téléchargement public si le dépôt est public)
4. Secrets : keystore Android (`ANDROID_KEYSTORE_*`) — **jamais** commités

Documentation courte : `mobile/BUILD_APK.md`.

### 11.3 Environnements

| Environnement | Usage |
|---------------|--------|
| Local | `dev:server` + `dev:web` / `dev:admin` / Expo |
| Production | Render + APK release pointant vers l’API Render |

---

## 12. Sécurité et conformité opérationnelle

1. Ne jamais committer `server/.env`, `mobile/.env`, ni `mobile/credentials/github-secrets.local.txt`.
2. Keystore Android uniquement via secrets CI.
3. Restreindre `ALLOW_ADMIN_REGISTRATION` en production si besoin.
4. Configurer le webhook FedaPay uniquement vers l’URL API HTTPS publique.
5. Maintenir Atlas Network Access compatible avec les IP Render.
6. Prévoir la rotation de `JWT_SECRET` et des clés FedaPay.

---

## 13. Critères d’acceptance (recette)

Le système est considéré conforme lorsque :

1. Un apprenant peut s’inscrire / se connecter (email et, si configuré, Google).
2. Un admin peut se connecter et publier un chapitre + une question.
3. L’apprenant voit le contenu selon son abonnement.
4. Un paiement FedaPay de test/live active bien l’abonnement et crédite les heures.
5. Une réservation de créneau fonctionne de bout en bout.
6. L’APK release s’installe, démarre sans crash, et parle à l’API production.
7. Les healthchecks et CORS admin/web sont OK en production.

---

## 14. Roadmap indicative (post-livraison)

| Priorité | Sujet |
|----------|--------|
| P1 | Stabiliser APK (crash startup, distribution téléphone) |
| P2 | Finaliser E-Codepermis (aujourd’hui partiellement placeholder) |
| P3 | Domaine custom + HTTPS branding (monpermis.bj) |
| P4 | Observabilité (logs/erreurs centralisés) |
| P5 | Store Google Play (AAB, politique de confidentialité) |
| P6 | Compte moniteur / notifications push |

---

## 15. Glossaire

| Terme | Définition |
|-------|------------|
| **Apprenant** | Utilisateur final de la formation |
| **Créneau** | Plage horaire de conduite proposée |
| **Plan** | Offre d’abonnement commercial |
| **Webhook** | Notification serveur-à-serveur de FedaPay |
| **Bare Expo** | Projet Expo avec dossiers natifs `android/` / `ios/` générés |
| **XOF** | Franc CFA (UEMOA), devise des paiements |

---

## 16. Annexes — documents liés dans le dépôt

| Fichier | Contenu |
|---------|---------|
| `RENDER_DEPLOY.txt` | Procédure déploiement Render |
| `render.yaml` | Blueprint multi-services |
| `mobile/BUILD_APK.md` | Comment lancer un build APK |
| `mobile/EXPO_BARE_INVENTORY.md` | Inventaire modules Expo conservés |
| `mobile/credentials/README.md` | Gestion du keystore (sans secrets) |
| `server/.env.example` | Variables API |
| `mobile/.env.example` | Variables mobile |
| `administration/.env.example` | Variables admin |

---

## 17. Synthèse exécutive

**Monpermis.bj** est une plateforme complète d’auto-école digitale pour le Bénin, composée d’une API unique, d’un back-office, d’un site apprenant et d’une application Android. Elle couvre l’apprentissage du code, la conduite (leçons + réservations), et la monétisation via FedaPay. L’architecture monorepo permet de faire évoluer les trois clients autour de la même source de vérité métier (MongoDB Atlas), avec un déploiement cloud Render et une distribution mobile gratuite via GitHub Actions.

---

*Fin du cahier des charges — Monpermis.bj*
# Cahier des charges — Monpermis.bj

**Produit :** plateforme numérique d’auto-école et de préparation au permis de conduire  
**Marché cible :** Bénin  
**Dépôt :** https://github.com/depannageepress03-cmd/Monpermis  
**Document :** version 1.0 — juillet 2026  
**Statut :** description du système tel qu’il est implémenté dans le monorepo `auto-ecole-app`

---

## 1. Objet du document

Ce cahier des charges décrit **de A à Z** le projet Monpermis.bj : besoins métier, acteurs, architecture, modules fonctionnels, paiements, déploiements, contraintes techniques et sécurité.

Il sert de référence pour :
- la compréhension globale du produit ;
- la maintenance et l’évolution ;
- l’onboarding d’un développeur ou d’un partenaire ;
- la validation du périmètre livré.

---

## 2. Contexte et objectifs

### 2.1 Contexte

Au Bénin, l’accès à une formation structurée au code de la route et à la conduite reste fragmenté (supports papier, WhatsApp, absence de suivi digital). Monpermis.bj centralise la formation, le suivi pédagogique et le paiement Mobile Money.

### 2.2 Objectifs produit

1. Permettre à un **apprenant** de s’inscrire, s’abonner et suivre le **code** et/ou la **conduite**.
2. Permettre à un **administrateur** de gérer le contenu pédagogique, les utilisateurs, les créneaux et les abonnements.
3. Encaisser les paiements