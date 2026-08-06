# Portail moniteur

## En ligne

**URL principale :** https://monpermis-api.onrender.com

Le build Render de l’API embarque le portail moniteur dans `web-dist` : ouvrir l’URL de l’API affiche la page de connexion moniteur (`/api/*` reste l’API).

Optionnel : static séparé `https://monpermis-moniteur.onrender.com` (voir `render.yaml`).

## Développement local

```bash
npm run dev:server
npm run dev:moniteur   # http://localhost:5175
```

## Activer un compte moniteur

Admin → Conduite → Moniteurs → email + mot de passe + « Activer la connexion portail ».

## Flux réservation (option A)

1. Apprenant paie → `pending_moniteur`
2. Moniteur confirme → `confirmed` **ou** refuse → `cancelled` + remboursement
