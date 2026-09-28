# Prompt OpenCode — Refonte UI Monpermis.bj

> Avant de lancer : copie le dossier `maquettes/` de ce zip dans le repo, à `design/maquettes/`. Puis colle tout ce qui suit dans OpenCode.

---

Tu es un développeur front-end senior spécialisé en design systems. Ta mission : appliquer **exactement** le nouveau design de Monpermis.bj (plateforme de préparation au permis de conduire au Bénin) sur l'app mobile, le web apprenant et le back-office admin, **sans casser la logique existante**.

## 1. Sources de vérité

- `design/maquettes/*.html` : maquettes HTML statiques. **Chaque valeur de style est écrite en inline** (couleurs, tailles, rayons, ombres, espacements, dégradés). Ouvre chaque fichier et reprends les valeurs à l'identique. Ne les « arrondis » pas, ne les remplace pas par des valeurs par défaut de ta lib.
- `design/maquettes/index.html` : vue d'ensemble de tous les écrans.
- `design/maquettes/assets/logo.png` : logo officiel (fond blanc).
- Écran de référence : 390 × 844 px (mobile). Admin : 1440 × 960 px.

| Fichier | Écran |
|---|---|
| `Main.html` | Bienvenue / onboarding |
| `Login.html` | Connexion (e-mail ou téléphone + Google) |
| `Home.html` | Accueil apprenant |
| `Code.html` | Hub Code de la route |
| `Quiz.html` | Question de QCM / examen blanc |
| `Conduite.html` | Réservation d'une leçon de conduite |
| `Progres.html` | Progression |
| `Offres.html` | Formules + paiement Mobile Money |
| `TabBar.html` | Composant barre d'onglets flottante |
| `Admin.html` | Back-office : tableau de bord |

## 2. Règles absolues

1. **Ne touche pas à la logique métier** : routes API, auth JWT (7 j), Google OAuth, webhook FedaPay (HMAC), modèles MongoDB, crédit d'heures, activation d'abonnement. Tu ne changes que la couche UI (composants, styles, layout, navigation visuelle).
2. **Les données des maquettes sont des exemples** (Aïcha, 78 %, 34/40, M. Houngbo…). Branche chaque écran sur les vraies données déjà disponibles côté API. Si une donnée n'existe pas, **n'invente rien côté serveur** : affiche un état vide propre et liste le manque dans ton récapitulatif final.
3. **Ne colle pas le HTML des maquettes tel quel** dans l'app. Convertis-le en composants réutilisables, dans les conventions du repo.
4. **Logo** : toujours posé sur une tuile blanche (jamais directement sur du bleu nuit). La tuile recadre le logo : l'image fait environ 135 % de la tuile, centrée, `overflow: hidden`.
5. **Contraste** : jamais de texte blanc sur le vert `#0BAA4F` ni sur le jaune `#FFB400`. Sur jaune, texte bleu nuit `#0A1B3D`. Pour du texte vert sur fond clair, utilise `#067A37`.
6. Cibles tactiles ≥ 44 px. Vrais `<button>` / `<a>` / `<input>` + `<label>` sur le web. `aria-label` (web) ou `accessibilityLabel` (RN) sur chaque bouton qui n'a qu'une icône.
7. Pas d'emoji dans l'UI. Icônes en trait uniquement : `lucide-react` (web) et `lucide-react-native` (mobile). Épaisseur de trait entre 1.9 et 2.2, extrémités arrondies.

## 3. Étape 0 : explore avant de coder

Monorepo :
- `src/` : web apprenant
- `administration/` : back-office
- `server/` : API Express + MongoDB, **ne pas modifier**
- `mobile/` : Expo bare, React Native

Identifie, pour chaque app :
- le framework ;
- la solution de style (CSS, Tailwind, CSS modules, StyleSheet…) ;
- la navigation (React Router, React Navigation, Expo Router…) ;
- les écrans existants et les appels API qu'ils font.

Ensuite, présente-moi un plan : fichiers à créer ou modifier, et correspondance écran existant → maquette. **Attends ma validation avant de coder.**

## 4. Design tokens

Crée un fichier de tokens unique par app : `theme.ts` pour le mobile, variables CSS `:root` pour le web et l'admin. Si Tailwind est présent, étends aussi le thème. Utilise exactement ces valeurs.

### Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `navy` | `#0A1B3D` | Texte principal, boutons primaires, cartes sombres |
| `navy-light` | `#1A3A7A` | Début des dégradés hero |
| `navy-deep` | `#06122A` | Fin des dégradés hero |
| `green` | `#0BAA4F` | Accents, anneaux, barres, pastilles |
| `green-dark` | `#067A37` | Texte ou lien vert sur fond clair |
| `green-ink` | `#065C2A` | Texte sur fond vert clair |
| `green-tint` | `#EAF7EF` | Fond de badge « Terminé » ou « Confirmée » |
| `green-tint-2` | `#DDF3E6` | Carte « Cours terminé » |
| `green-glow` | `#3BE08A` | Icône de tendance sur fond sombre |
| `yellow` | `#FFB400` | CTA d'accent, onglet actif, badges forts |
| `yellow-tint` | `#FFF4D6` | Fond de badge jaune |
| `yellow-ink` | `#7A5200` | Texte sur `yellow-tint` |
| `bg` | `#F5F7FB` | Fond des écrans |
| `surface` | `#FFFFFF` | Cartes, champs, boutons ronds |
| `border` | `#E1E6EF` | Bordures de champs et d'options (1.5 px) |
| `navy-tint` | `#E8EDF6` | Pastilles neutres, contrôle segmenté |
| `field-prefix` | `#F1F4F9` | Préfixe « +229 », numéros inactifs |
| `track` | `#E6ECF5` / `#DDE3EE` | Fond d'anneau et de barre de progression |
| `muted` | `#5B6680` | Texte secondaire |
| `subtle` | `#8A93A8` | Placeholder, texte tertiaire |
| `ink-2` | `#3C4760` | Métadonnées sur fond clair |
| `disabled-bg` | `#EEF1F6` | Créneau indisponible (bordure `1.5px dashed #CBD3E1`) |
| `wrong-bg` / `wrong` / `wrong-ink` | `#FFF1E6` / `#C2410C` / `#9A3412` | Mauvaise réponse au QCM |

### Dégradés

- **Hero** (carte principale) :
  ```
  radial-gradient(110% 80% at 100% 0%, rgba(11,170,79,.42) 0%, rgba(11,170,79,0) 55%),
  linear-gradient(160deg, #1A3A7A 0%, #0A1B3D 58%, #06122A 100%)
  ```
- **Variante conduite** : même dégradé, mais le halo radial est jaune `rgba(255,180,0,.28)`.
- **Barre de progression** : `linear-gradient(90deg, #0BAA4F, #FFB400)`.

### Effet verre (sur fond sombre)

- Fond `rgba(255,255,255,.08)`, bordure `1px rgba(255,255,255,.20)`, `backdrop-filter: blur(12px)`.
- Reflet haut : `inset 0 1px 0 rgba(255,255,255,.12)`.
- Toutes les cartes hero ont en plus : `inset 0 1px 0 rgba(255,255,255,.18)`.

### Ombres

| Élément | Ombre |
|---|---|
| Carte blanche | `0 10px 30px -18px rgba(10,27,61,.30)` |
| Carte hero | `0 26px 44px -22px rgba(10,27,61,.75)` |
| Bouton rond ou tuile logo | `0 6px 18px -8px rgba(10,27,61,.25)` |
| CTA jaune | `0 16px 30px -12px rgba(255,180,0,.60)` |
| CTA bleu nuit | `0 18px 32px -14px rgba(10,27,61,.65)` |

### Typographie

- **Titres et chiffres** : `Sora`, graisses 700 et 800. Letter-spacing −0.02em pour les titres, −0.04em pour les très grands chiffres.
- **Texte** : `Plus Jakarta Sans`, graisses 500 à 800. Pas d'Inter, pas de Roboto.

| Rôle | Taille | Détail |
|---|---|---|
| Chiffre hero | 54–58 px, interligne 0.95 | Symbole « % » à 45 % d'opacité (sur sombre) ou en `subtle` (sur clair) |
| H1 d'écran | 26 px | 30 px pour la connexion et la bienvenue |
| Titre de section | 18 px | Sora 700 |
| Titre de carte | 15–17 px | Sora 700 |
| Texte | 14–15 px | Graisse 600 |
| Métadonnées | 12–13 px | Graisse 600–700, couleur `muted` |
| Libellé d'onglet | 10.5 px | Graisse 700 |

### Rayons

| Élément | Rayon |
|---|---|
| Carte hero | 32 px (28 px sur Code et Conduite) |
| Carte | 24–26 px |
| Tuile d'action | 22 px |
| Champ | 18 px |
| Boutons, pastilles, puces | Toujours en pilule : rayon = hauteur / 2 |
| Tuile logo | 15 px pour 46 px de côté ; 48 px pour 196 px (bienvenue) |
| Barre d'onglets | 36 px |

### Espacements

- Écran : marge haute 56 px (sous la zone sûre), marges latérales 20 px.
- Espace entre blocs : 14–20 px. Dans une grille : 8–12 px.

### Décor

- Halos flous en coin d'écran : cercles de 260 à 300 px, `filter: blur(50–60px)`.
- Couleurs des halos : vert à 10–14 % d'opacité, jaune à 16 %.
- **Motif « route »** tiré du logo : bande diagonale blanche avec des tirets jaunes, à 16–18 % d'opacité, en haut à droite des cartes hero. Le SVG est dans `Home.html`.

## 5. Composants à créer

Chaque composant doit reproduire au pixel près le fichier de maquette indiqué.

- **LogoTile** (46 px) : tuile blanche, rayon 15, ombre des boutons ronds, logo recadré à environ 135 %.
- **IconButton** (46 px) : rond blanc avec ombre. Variante cloche : pastille jaune de 9 px, bordure blanche de 2 px.
- **Button**
  - `primary` : fond bleu nuit, texte blanc, hauteur 58.
  - `accent` : fond jaune, texte bleu nuit, graisse 800.
  - `outline` : fond blanc, bordure `1.5px #E1E6EF`.
  - `google` : comme `outline`, avec un « G » dans un rond `#F1F4F9`.
  - Variante « slider » (bienvenue et réservation) : libellé à gauche, rond bleu nuit de 46–48 px à droite avec une flèche ou une coche jaune.
- **Chip / Badge** (hauteur 28–30, pilule)
  - Sur fond sombre : style verre.
  - Sur fond clair : fond teinté (`green-tint`, `yellow-tint` ou `navy-tint`) et texte foncé assorti.
- **TextField** (hauteur 56, rayon 18, icône à gauche)
  - État focus : bordure `1.5px #0BAA4F` + halo `0 0 0 4px rgba(11,170,79,.12)`.
  - Préfixe téléphone « +229 » dans une pastille `#F1F4F9`.
  - Placeholder du numéro : `01 XX XX XX XX`.
- **SegmentedControl** (`Login.html`) : piste `#E8EDF6` de 52 px, padding 5. Segment actif : blanc, avec l'ombre `0 4px 12px -4px rgba(10,27,61,.25)`.
- **HeroCard** : dégradé hero, motif route, contenu en blanc.
- **GlassAction** : tuile verre de 76 px de haut, rayon 22, icône 22 px + libellé 12.5 px. Elles vont par 3 en grille. La 3e (« Réserver ») est en jaune plein.
- **NotchedCard** (`Home.html` et `Progres.html`)
  - Un onglet en haut à gauche : 40 px de haut, rayon `20 20 0 0`, avec une pastille de couleur et un libellé.
  - À droite de l'onglet, sur le fond de l'écran : l'heure et la date, avec icônes horloge et calendrier.
  - Le corps de la carte a un rayon `0 24 24 24`.
- **TabBar** flottante (`TabBar.html`)
  - Position : 16 px des bords latéraux, 22 px du bas.
  - Barre : 72 px de haut, rayon 36, fond `rgba(10,27,61,.93)`, `blur(18px)`, ombre `0 20px 40px -14px rgba(10,27,61,.6)` + reflet haut.
  - Onglet actif : pilule jaune de 64 × 56, rayon 28, icône et libellé bleu nuit.
  - Onglets inactifs : `rgba(255,255,255,.74)`.
  - Onglets, dans l'ordre : Accueil · Code · Conduite · Progrès · Offres.
  - Le contenu défile **sous** la barre : prévois environ 120 px de marge basse.
- **ProgressRing** (`Progres.html`, SVG)
  - Rayon 105, trait 24, piste `#E6ECF5`, départ à midi.
  - Trois arcs à extrémités arrondies, séparés par de petits espaces : vert = cours, bleu nuit = examens, jaune = conduite.
  - Au centre : le chiffre en Sora 54 et un badge de tendance.
- **SegmentedProgress** : segments de 6 px séparés de 3 px (QCM) ; segments de 8 px séparés de 4 px (heures de conduite).
- **ScoreBars** (`Home.html`)
  - 6 barres arrondies à 10 px, sur 100 px de haut.
  - Couleurs : les plus anciennes en `#C9D3E6`, les récentes en vert, la dernière en jaune.
- **OptionButton QCM** : pastille lettre de 40 px, rayon 22, hauteur minimale 58.
- **PlanCard** (`Offres.html`) : bouton radio, nom en Sora 16, description, prix. Voir aussi la section 7.
- **DayPill** (72 px de haut, rayon 22), **SlotButton** (48 px, pilule), **MonitorChip** (52 px, avatar à initiales de 40 px, défilement horizontal).

## 6. Écrans

Associe chaque maquette à l'écran existant correspondant et garde les appels API actuels.

1. **Bienvenue** : fond blanc et deux halos. Au centre :
   - logo de 196 px sur tuile blanche ;
   - « Monpermis**.bj** » en Sora 32 / 800, avec « .bj » en vert ;
   - l'accroche ;
   - trois puces teintées.

   En bas, une feuille bleu nuit de 336 px de haut, rayon `40 40 0 0`, qui contient : les points de pagination (celui actif en jaune, 22 px de large), le titre, le texte, le CTA slider jaune « Commencer » et le lien « Se connecter ».
2. **Connexion** : bouton retour + LogoTile, titre, SegmentedControl E-mail / Téléphone qui bascule le champ affiché, mot de passe avec bouton « afficher », case « Rester connecté 7 jours », « Mot de passe oublié ? », CTA bleu nuit, séparateur « ou », bouton Google, lien « Créer un compte ».
3. **Accueil**
   - En-tête : LogoTile, « Bonjour, » + prénom, cloche, menu.
   - HeroCard « Ta préparation au code » avec le pourcentage, deux badges et trois GlassAction : Réviser → Code, Examen blanc → Quiz, Réserver → Conduite.
   - NotchedCard « Prochaine leçon » (moniteur, horaire, statut, solde d'heures).
   - Carte ScoreBars « Examens blancs ».
4. **Code**
   - Titre et champ de recherche en pilule.
   - HeroCard « Reprendre » : chapitre en cours, barre dégradée, bouton lecture jaune de 56 px.
   - Grille 2 × 2 : Révision · QCM · Examens blancs · E-Codepermis. La tuile E-Codepermis est en vert plein, avec le texte en `#06122A`.
   - Liste des chapitres : numéro en tuile, titre, métadonnées, badge d'état Terminé / En cours / À venir.
5. **QCM**
   - En-tête : bouton fermer, « Question n / total », minuteur en pilule bleu nuit avec icône jaune.
   - Barre segmentée.
   - Illustration de 216 px (image de la question venant de l'API, rayon 28) avec un badge verre indiquant le thème.
   - Question en Sora 19, puis 4 OptionButton.
6. **Conduite**
   - HeroCard « Solde d'heures » : chiffre, bouton verre « + Heures » → Offres, barre segmentée des heures, heures effectuées / forfait.
   - Choix du moniteur, puis bande de jours, puis grille de créneaux en 3 colonnes.
   - CTA slider jaune « Réserver · {jour} · {heure} ».
7. **Progression**
   - Titre + filtre de période.
   - ProgressRing, puis trois mini-cartes de légende (Cours, Examens, Conduite).
   - « Activité récente » en NotchedCard : examen blanc sur fond bleu nuit, cours terminé sur fond `green-tint-2`.
8. **Offres** : liste des PlanCard, choix de l'opérateur Mobile Money en puces, champ téléphone, CTA bleu nuit avec cadenas jaune, mention « Paiement sécurisé par FedaPay · XOF ».
9. **Admin** (`Admin.html`)
   - Barre latérale de 272 px, dégradé bleu nuit vertical avec halo vert en bas, LogoTile.
   - Navigation groupée : Contenu · Conduite · Apprenants. L'élément actif est une pilule `rgba(255,255,255,.12)` avec une pastille jaune. Pas de bordure latérale.
   - Barre du haut : titre, date, recherche en pilule, cloche, CTA jaune « Nouveau cours ».
   - 4 cartes KPI (la 1re en style hero).
   - Graphique « Revenus par mois » en barres empilées : abonnements en bleu nuit, heures de conduite en vert, mois courant en jaune. Il occupe 2/3 de la largeur.
   - Anneau « Répartition des formules », sur 1/3.
   - Tableau « Réservations à venir » (2/3) et liste « Paiements récents » (1/3).
   - Toutes les données viennent des endpoints admin existants.

## 7. Interactions et états

- **QCM**
  - Choisir une option : fond bleu nuit, texte blanc, lettre sur fond jaune.
  - « Valider ma réponse » (CTA jaune), puis :
    - la bonne réponse passe en `green-tint`, bordure `#0BAA4F`, avec « ✓ Correct » ;
    - un mauvais choix passe en `wrong-bg`, bordure `#C2410C`, avec « ✕ Ta réponse » ;
    - une carte d'explication apparaît : « Bonne réponse ! » ou « Pas tout à fait. », suivie de l'explication fournie par l'API ;
    - le CTA devient « Question suivante », en bleu nuit.
  - L'état ne repose jamais sur la couleur seule : il y a toujours un libellé.
- **Conduite**
  - Moniteur, jour et créneau sélectionnés : fond bleu nuit et texte blanc. Pour le créneau choisi : `green-tint` et bordure verte de 2 px.
  - Créneau indisponible : bordure en tirets, texte barré, désactivé.
  - Solde d'heures à 0 : CTA désactivé et lien vers Offres.
- **Offres**
  - Formule sélectionnée : dégradé hero, texte blanc, radio jaune.
  - Badge « Meilleure offre » sur Pack.
  - Le montant du CTA suit la formule choisie. Pour Grâce : « Activer l'essai gratuit ».
  - Utilise le flux FedaPay existant tel quel.
- **Connexion** : garde la validation et les messages d'erreur actuels, dans le style du TextField (bordure `#C2410C` en cas d'erreur).
- **Mouvement** : transitions de 150–200 ms sur les changements d'état uniquement. Respecte `prefers-reduced-motion` / `reduceMotion`.

## 8. Spécifique mobile (Expo bare)

- Dégradés : `expo-linear-gradient`. Pour le halo radial, superpose un second dégradé ou un SVG `RadialGradient` avec `react-native-svg`.
- Effet verre : `expo-blur` (`BlurView`) sur iOS. Sur Android, utilise un repli en couleur semi-opaque de même teinte.
- SVG (anneau, motif route, illustrations) : `react-native-svg`.
- Polices : `@expo-google-fonts/sora` et `@expo-google-fonts/plus-jakarta-sans`, une `fontFamily` par graisse.
- Ombres : props `shadow*` sur iOS, `elevation` sur Android. React Native ne gère pas les ombres à spread négatif : approxime-les visuellement.
- Letter-spacing : convertis les `em` en px.
- C'est un projet bare : installe les dépendances natives puis lance `pod install`. Vérifie aussi que le build APK via GitHub Actions passe toujours.

## 9. Spécifique web (`src/` et `administration/`)

- Tokens en variables CSS, `backdrop-filter` avec préfixe `-webkit-`.
- Sur mobile : conteneur de largeur 100 %. Au-delà de 480 px, colonne centrée de 480 px maximum, sur fond `bg`, avec la TabBar centrée.
- L'admin est prévu pour ≥ 1280 px. Sous 1024 px, la barre latérale se replie en tiroir.
- Charge les polices via Google Fonts, avec `display=swap` et des familles de repli `sans-serif`.

## 10. Vérification finale

Pour chaque écran :
1. ouvre la maquette HTML et ton écran côte à côte à 390 px de large ;
2. vérifie les couleurs, tailles, rayons, espacements et ombres ;
3. vérifie le contraste (≥ 4.5:1 pour le texte normal) et les cibles tactiles (≥ 44 px) ;
4. vérifie les états vide, chargement et erreur.

Termine par un récapitulatif :
- fichiers modifiés ;
- écarts volontaires, avec leur raison ;
- données manquantes côté API ;
- commandes à lancer.

Travaille écran par écran : tokens → composants → Accueil → les autres écrans. Fais un commit par étape.
