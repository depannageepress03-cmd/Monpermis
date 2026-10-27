# Questions qui attendent encore leur image

Ces questions ne sont **proposées ni aux apprenants ni dans l'espace administrateur** tant que leur image n'existe pas
(l'énoncé renvoie à une scène ou un panneau à regarder : sans image, la question n'a pas de sens).
Liste produite par l'audit du serveur (`checkExamEligibility`), 80 questions au total.

| Chapitre | Questions concernées | Nb | Situation |
|---|---|---|---|
| 2 | 30, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 69, 70, 71, 72, 73, 80, 81, 82, 83, 84, 85, 86, 87 | 25 | Image rattachée dans le code, **fichier absent** |
| 11 | 35, 39, 40, 41, 43, 44, 45, 46, 47, 48, 51, 53, 55, 56, 57, 60, 64, 66, 70, 71, 72, 73, 75, 76, 79, 80, 81, 82 | 28 | Aucune image rattachée (les images 1 à 34 existent) |
| 12 | 4, 5, 6, 7, 9, 11, 13, 16, 17, 23, 32, 58 | 12 | Aucune image rattachée |
| 13 | 1, 3, 4, 7, 8, 9, 16, 18, 22, 23, 33 | 11 | Aucune image rattachée |
| 14 | 1, 3, 5, 8 | 4 | Aucune image rattachée |

## Pour les remettre en service

1. Déposer l'image de la question dans `server/content/code-images/chapitre-N/` sous le nom `<numéro de la question>.png`
   (exemple : `server/content/code-images/chapitre-11/35.png`).
2. Chapitre 2 : rien d'autre, l'image est déjà rattachée dans le code.
3. Chapitres 11 à 14 : ajouter le numéro de la question dans la liste `QUESTIONS_WITH_IMAGES` du fichier
   `server/src/data/hardcodedQuestions/chapitreNN.js`.
4. Pour l'application mobile : `cd server && npm run generate:bundled-assets`, puis reconstruire l'APK
   (convertir ensuite en WebP avec `mobile/scripts/optimize-embedded-media.py`).

## À savoir

- Au chapitre 11, 75 questions sur 82 n'ont aucune bonne réponse enregistrée : même avec leurs images, elles resteront
  bloquées tant que la clé de réponses n'est pas renseignée.
- Ces images ne sont pas dans le projet : elles doivent venir de votre source d'origine. Je n'en ai pas créé.
