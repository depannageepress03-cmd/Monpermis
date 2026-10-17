# Portail moniteur

## En ligne

**URL :** https://monpermis-moniteur.onrender.com

Site statique Render indépendant de l’API (service `monpermis-moniteur` du `render.yaml`).
Il appelle l’API en CORS : `VITE_API_URL=https://monpermis-api.onrender.com` au build.
Les anciens liens `https://monpermis-api.onrender.com/connexion` redirigent vers ce site.

## Navigation

- **Tableau de bord** — à confirmer, aujourd’hui, à venir, gains
- **Disponibilités** — plages hebdomadaires (+ créneaux ponctuels)
- **Réservations** — accepter / refuser, confirmées
- **Historique** — passées / annulées / effectuées
- **Revenus** — gains, versé, reste dû
- **Profil** — coordonnées + mot de passe

## Développement local

```bash
npm run dev:server
npm run dev:moniteur   # http://localhost:5175
```

## Activer un compte moniteur

Admin → Conduite → Moniteurs → **Créer un compte moniteur** (email + mot de passe + « Activer la connexion portail »).

Remettez les identifiants au moniteur.

## Flux réservation

1. Apprenant paie → `pending_moniteur`
2. Moniteur confirme → `confirmed` **ou** refuse → `cancelled` + remboursement
3. Après la séance → `completed` → gain = `priceFcfa`
4. Admin → Finances → **Paiements moniteurs** enregistre les versements

## Disponibilité

Les plages hebdomadaires du moniteur alimentent `GET /api/reservations/availability` (app mobile + web). Les créneaux déjà réservés sont exclus automatiquement.
