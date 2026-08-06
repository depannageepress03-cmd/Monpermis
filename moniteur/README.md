# Portail moniteur

Application web séparée (comme `administration/`).

## Développement

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
