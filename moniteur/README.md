# Portail moniteur

Application web séparée (comme `administration/`).

## En ligne (Render)

URL prévue : **https://monpermis-moniteur.onrender.com**

1. Créer / synchroniser le service static `monpermis-moniteur` (voir `render.yaml`).
2. Sur ce service, définir `VITE_API_URL=https://monpermis-api.onrender.com` (build-time).
3. Sur `monpermis-api`, ajouter l’origine aux CORS :
   - `MONITEUR_CLIENT_URL=https://monpermis-moniteur.onrender.com`
   - ou l’inclure dans `ALLOWED_ORIGINS`
4. Redéployer l’API puis le site moniteur.

## Développement local

```bash
# API
npm run dev:server

# Portail moniteur → http://localhost:5175
npm run dev:moniteur
```

## Activer un compte moniteur

Dans l’admin → Conduite → Moniteurs → modifier un moniteur :

1. Renseigner un **email**
2. Définir un **mot de passe** (≥ 8 caractères)
3. Cocher **Activer la connexion portail**

## Flux réservation (option A)

1. Apprenant paie (solde ou Mobile Money)
2. Statut → `pending_moniteur`
3. Moniteur confirme → `confirmed` **ou** refuse → `cancelled` + créneau libre + remboursement heures / flag `needsRefund` MM
