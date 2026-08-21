/**
 * Banque questions en dur — Chapitre 3.
 * Audio : /content/code-audio/chapitre-3/{n}.mp3
 * Images : /content/code-images/chapitre-3/{n}.png (n = n° question)
 * Textes corrigés + remplacements Q1/Q9/Q26 — 2026-07-30.
 */

export const CHAPITRE_03_KEY = 'chapitre-3'
export const CHAPITRE_03_ORDER = 3

/** Détecte un chapitre Mongo correspondant au chapitre 3 figé. */
export function matchesChapitre03(chapter) {
  if (!chapter) return false
  if (Number(chapter.order) === CHAPITRE_03_ORDER) return true
  const name = String(chapter.name || '').trim()
  return /chapitre\s*#?\s*3\b/i.test(name) || /^3([\s.\-–:]|$)/.test(name)
}

function audioUrl(n) {
  return `/content/code-audio/chapitre-3/${n}.mp3`
}

function imageUrl(n) {
  return `/content/code-images/chapitre-3/${n}.png`
}

/** Images disponibles (N.png = question N). */
const QUESTIONS_WITH_IMAGES = new Set([2, 8])

const QUESTIONS_DATA = [
  {
    prompt: 'Sur une chaussée à double sens :',
    answers: [
      { label: 'A', text: 'Je peux faire demi-tour.', correct: true },
      { label: 'B', text: 'Je ne peux pas faire demi-tour.', correct: false },
      { label: 'C', text: 'Je ne peux pas faire marche arrière.', correct: false },
    ],
  },
  {
    prompt: 'Les flèches de rabattement m\'obligent :',
    answers: [
      { label: 'A', text: 'À serrer ma droite.', correct: true },
      { label: 'B', text: 'À serrer ma gauche.', correct: false },
      { label: 'C', text: 'À quitter la chaussée.', correct: false },
      { label: 'D', text: 'À réduire ma vitesse.', correct: false },
    ],
  },
  {
    prompt: 'Sur une chaussée à double sens comportant plus de deux voies, il est interdit d\'emprunter :',
    answers: [
      { label: 'A', text: 'La voie la plus à droite.', correct: false },
      { label: 'B', text: 'La voie la plus à gauche.', correct: true },
      { label: 'C', text: 'La voie du milieu.', correct: false },
    ],
  },
  {
    prompt: 'En quoi consiste l\'arrêt ?',
    answers: [
      { label: 'A', text: 'À l\'immobilisation de longue durée d\'un véhicule, conducteur éloigné.', correct: false },
      { label: 'B', text: 'À l\'immobilisation momentanée d\'un véhicule, conducteur à bord.', correct: true },
      { label: 'C', text: 'À l\'immobilisation momentanée d\'un véhicule, conducteur éloigné.', correct: false },
    ],
  },
  {
    prompt: 'Lors d\'un arrêt :',
    answers: [
      { label: 'A', text: 'Le conducteur s\'éloigne du véhicule.', correct: false },
      { label: 'B', text: 'Le conducteur est à côté du véhicule.', correct: false },
      { label: 'C', text: 'Le conducteur est à bord du véhicule.', correct: true },
    ],
  },
  {
    prompt: 'En quoi consiste le stationnement ?',
    answers: [
      { label: 'A', text: 'À l\'immobilisation de longue durée d\'un véhicule.', correct: false },
      { label: 'B', text: 'À l\'immobilisation momentanée d\'un véhicule, conducteur à côté.', correct: false },
      { label: 'C', text: 'À l\'immobilisation momentanée d\'un véhicule, conducteur éloigné.', correct: true },
      { label: 'D', text: 'À l\'immobilisation momentanée d\'un véhicule, conducteur à bord.', correct: false },
    ],
  },
  {
    prompt: 'En présence du panneau de stationnement interdit, je suis autorisé à :',
    answers: [
      { label: 'A', text: 'Stationner après le panneau.', correct: false },
      { label: 'B', text: 'Stationner avant le panneau.', correct: true },
      { label: 'C', text: 'Stationner avant la prochaine intersection.', correct: false },
    ],
  },
  {
    prompt: 'À la rencontre du panneau « arrêt et stationnement interdit », l\'interdiction commence :',
    answers: [
      { label: 'A', text: 'Avant le panneau.', correct: false },
      { label: 'B', text: 'À partir du panneau.', correct: true },
      { label: 'C', text: '15 mètres après le panneau.', correct: false },
    ],
  },
  {
    prompt: 'À la vue d\'un usager qui veut s\'insérer dans la circulation :',
    answers: [
      { label: 'A', text: 'Je klaxonne.', correct: false },
      { label: 'B', text: 'Je ralentis.', correct: true },
      { label: 'C', text: 'Je fais un appel de feu.', correct: false },
      { label: 'D', text: 'Je change de voie.', correct: true },
    ],
  },
  {
    prompt: 'La distance d\'arrêt augmente :',
    answers: [
      { label: 'A', text: 'Si le conducteur est fatigué.', correct: true },
      { label: 'B', text: 'Si la chaussée est légèrement mouillée.', correct: true },
      { label: 'C', text: 'Si les pneus sont usés.', correct: true },
      { label: 'D', text: 'Rien de tout ce qui précède.', correct: false },
    ],
  },
  {
    prompt: 'En cas de pluie, je risque :',
    answers: [
      { label: 'A', text: 'L\'aquaplaning.', correct: true },
      { label: 'B', text: 'Le blocage des roues.', correct: false },
      { label: 'C', text: 'La glissade.', correct: true },
    ],
  },
  {
    prompt: 'Plus je roule vite et plus j\'augmente :',
    answers: [
      { label: 'A', text: 'La distance de freinage.', correct: true },
      { label: 'B', text: 'La distance d\'arrêt.', correct: true },
      { label: 'C', text: 'Le temps de réaction.', correct: false },
    ],
  },
  {
    prompt: 'La distance de freinage dépend :',
    answers: [
      { label: 'A', text: 'De la vitesse.', correct: true },
      { label: 'B', text: 'Du temps de réaction.', correct: false },
      { label: 'C', text: 'De l\'adhérence.', correct: true },
      { label: 'D', text: 'De l\'état physique du conducteur.', correct: false },
      { label: 'E', text: 'De l\'état des amortisseurs.', correct: true },
    ],
  },
  {
    prompt: 'Un conducteur ayant l\'intention de changer de direction doit :',
    answers: [
      { label: 'A', text: 'Ralentir.', correct: true },
      { label: 'B', text: 'Signaler son intention.', correct: true },
      { label: 'C', text: 'Klaxonner pour faire dégager les piétons engagés sur leur passage.', correct: false },
    ],
  },
  {
    prompt: 'Quel doit être votre comportement à l\'approche d\'un lieu-dit ?',
    answers: [
      { label: 'A', text: 'Klaxonner.', correct: false },
      { label: 'B', text: 'Ralentir.', correct: true },
      { label: 'C', text: 'Rouler vite.', correct: false },
    ],
  },
  {
    prompt: 'Un conducteur ayant l\'intention de changer de direction doit :',
    answers: [
      { label: 'A', text: 'S\'assurer que la route qu\'il veut emprunter n\'est pas en sens interdit.', correct: true },
      { label: 'B', text: 'Surveiller la route vers l\'avant et l\'arrière.', correct: true },
      { label: 'C', text: 'Signaler son intention à l\'aide du clignotant.', correct: true },
      { label: 'D', text: 'Ralentir sans freiner brusquement pour ne pas surprendre les usagers qui le suivent.', correct: true },
      { label: 'E', text: 'Respecter les priorités de passage et notamment les piétons qui traversent.', correct: true },
    ],
  },
  {
    prompt: 'Pour adapter sa vitesse, le conducteur doit tenir compte :',
    answers: [
      { label: 'A', text: 'De l\'importance du trafic.', correct: true },
      { label: 'B', text: 'Des risques prévisibles.', correct: true },
      { label: 'C', text: 'De l\'adhérence.', correct: true },
      { label: 'D', text: 'De la visibilité.', correct: true },
      { label: 'E', text: 'De sa propre vigilance.', correct: true },
    ],
  },
  {
    prompt: 'Un vent latéral violent est particulièrement dangereux :',
    answers: [
      { label: 'A', text: 'Lors du passage de zone ventée en zone abritée.', correct: true },
      { label: 'B', text: 'Lorsqu\'il souffle par rafales.', correct: true },
      { label: 'C', text: 'Si je tracte une caravane.', correct: true },
      { label: 'D', text: 'S\'il souffle de face.', correct: false },
    ],
  },
  {
    prompt: 'De nuit, seul sur autoroute avec des feux de route éclairant à 100 mètres, je peux rouler à :',
    answers: [
      { label: 'A', text: '100 kilomètres par heure.', correct: true },
      { label: 'B', text: '110 kilomètres par heure.', correct: false },
      { label: 'C', text: '130 kilomètres par heure.', correct: false },
    ],
  },
  {
    prompt: 'Sur une voie d\'insertion, j\'accélère pour :',
    answers: [
      { label: 'A', text: 'M\'engager avant les usagers de la route abordée.', correct: false },
      { label: 'B', text: 'M\'engager sans ralentir la circulation.', correct: true },
      { label: 'C', text: 'Atteindre la vitesse de circulation de la chaussée abordée.', correct: true },
    ],
  },
  {
    prompt: 'Sur une voie d\'insertion :',
    answers: [
      { label: 'A', text: 'J\'accélère, je mets le clignotant, je me place dans ma voie.', correct: false },
      { label: 'B', text: 'J\'accélère jusqu\'au bout de la voie. Je contrôle, je m\'insère si je peux.', correct: false },
      { label: 'C', text: 'J\'accélère en contrôlant. Je mets le clignotant dès que je peux m\'insérer.', correct: true },
    ],
  },
  {
    prompt: 'Plus le rayon du virage est faible :',
    answers: [
      { label: 'A', text: 'Plus le virage est serré.', correct: true },
      { label: 'B', text: 'Plus le virage est large.', correct: false },
      { label: 'C', text: 'Plus la force centrifuge est faible.', correct: false },
      { label: 'D', text: 'Plus la force centrifuge est importante.', correct: true },
    ],
  },
  {
    prompt: 'Sur route, lorsque l\'accotement de droite n\'est pas praticable, je peux stationner :',
    answers: [
      { label: 'A', text: 'Sur la voie de droite.', correct: false },
      { label: 'B', text: 'Sur l\'accotement de gauche en agglomération.', correct: false },
      { label: 'C', text: 'Sur l\'accotement de gauche.', correct: true },
    ],
  },
  {
    prompt: 'Lorsque l\'arrêt est interdit :',
    answers: [
      { label: 'A', text: 'Le stationnement est interdit.', correct: true },
      { label: 'B', text: 'Le stationnement n\'est pas interdit.', correct: false },
      { label: 'C', text: 'Le stationnement temporaire est interdit.', correct: false },
      { label: 'D', text: 'Seul le stationnement temporaire est autorisé.', correct: false },
    ],
  },
  {
    prompt: 'Le contrôle de la durée d\'un stationnement payant peut se faire :',
    answers: [
      { label: 'A', text: 'Par horodateur.', correct: true },
      { label: 'B', text: 'Par parcmètre.', correct: true },
      { label: 'C', text: 'Par disque de stationnement.', correct: false },
    ],
  },
  {
    prompt: 'On appelle stationnement gênant le fait de stationner :',
    answers: [
      { label: 'A', text: 'Sur un pont.', correct: false },
      { label: 'B', text: 'Devant une sortie de propriété.', correct: true },
      { label: 'C', text: 'Dans une voie réservée aux bus.', correct: true },
      { label: 'D', text: 'À proximité d\'une voie ferrée.', correct: false },
    ],
  },
  {
    prompt: 'Ajuster sa vitesse aux circonstances, c\'est ralentir suffisamment :',
    answers: [
      { label: 'A', text: 'Chaque fois que l\'adhérence est réduite.', correct: true },
      { label: 'B', text: 'Chaque fois que la visibilité est réduite.', correct: true },
    ],
  },
  {
    prompt: 'Pour évaluer l\'allure d\'un autre usager venant en face, je prends en compte :',
    answers: [
      { label: 'A', text: 'Le type de véhicule.', correct: false },
      { label: 'B', text: 'L\'état du conducteur.', correct: false },
      { label: 'C', text: 'La vitesse de rapprochement.', correct: true },
    ],
  },
  {
    prompt: 'Le temps de réaction est le temps nécessaire au conducteur pour :',
    answers: [
      { label: 'A', text: 'Arrêter la voiture.', correct: false },
      { label: 'B', text: 'Percevoir et réagir.', correct: true },
      { label: 'C', text: 'Évaluer l\'allure d\'un autre usager.', correct: false },
    ],
  },
  {
    prompt: 'Le temps de réaction a une durée d\'environ :',
    answers: [
      { label: 'A', text: 'Un dixième de seconde.', correct: false },
      { label: 'B', text: 'Une seconde.', correct: true },
      { label: 'C', text: 'Dix secondes.', correct: false },
    ],
  },
  {
    prompt: 'Sur chaussée mouillée ou glissante, il y a augmentation de la distance :',
    answers: [
      { label: 'A', text: 'D\'arrêt.', correct: true },
      { label: 'B', text: 'De freinage.', correct: true },
      { label: 'C', text: 'Parcourue pendant le temps de réaction.', correct: false },
    ],
  },
  {
    prompt: 'À 90 km/h, dans des conditions normales, ma distance d\'arrêt est d\'environ :',
    answers: [
      { label: 'A', text: '25 mètres.', correct: false },
      { label: 'B', text: '54 mètres.', correct: false },
      { label: 'C', text: '81 mètres.', correct: true },
    ],
  },
  {
    prompt: 'La réglementation du stationnement a pour objet :',
    answers: [
      { label: 'A', text: 'La sécurité.', correct: true },
      { label: 'B', text: 'La fluidité de la circulation.', correct: true },
      { label: 'C', text: 'A et B.', correct: true },
    ],
  },
  {
    prompt: 'Je suis en infraction si je suis en stationnement :',
    answers: [
      { label: 'A', text: 'Dangereux.', correct: true },
      { label: 'B', text: 'Abusif.', correct: true },
      { label: 'C', text: 'Gênant.', correct: true },
    ],
  },
  {
    prompt: 'Dans quel cas faut-il réduire sa vitesse ?',
    answers: [
      { label: 'A', text: 'Lorsqu\'il n\'y a pas de panneau de signalisation.', correct: false },
      { label: 'B', text: 'À l\'approche des montées.', correct: false },
      { label: 'C', text: 'Dans les descentes rapides.', correct: true },
      { label: 'D', text: 'Lorsqu\'on aborde une intersection.', correct: true },
      { label: 'E', text: 'Lorsque la route n\'apparaît pas libre.', correct: true },
    ],
  },
  {
    prompt: 'Lorsque je quitte momentanément mon véhicule pour acheter mon journal, je suis considéré comme étant :',
    answers: [
      { label: 'A', text: 'En arrêt.', correct: false },
      { label: 'B', text: 'En stationnement.', correct: true },
    ],
  },
  {
    prompt: 'En général, se ranger en bataille s\'effectue :',
    answers: [
      { label: 'A', text: 'En marche arrière.', correct: true },
      { label: 'B', text: 'En marche avant.', correct: false },
    ],
  },
  {
    prompt: 'Pendant la durée de la période probatoire, la vitesse du conducteur sur une autoroute est ordinairement limitée à :',
    answers: [
      { label: 'A', text: '100 km/h.', correct: false },
      { label: 'B', text: '110 km/h.', correct: true },
      { label: 'C', text: '130 km/h.', correct: false },
    ],
  },
  {
    prompt: 'En cas de visibilité réduite à 50 mètres, la vitesse ne peut excéder :',
    answers: [
      { label: 'A', text: '50 km/h.', correct: true },
      { label: 'B', text: '60 km/h.', correct: false },
      { label: 'C', text: '90 km/h.', correct: false },
    ],
  },
  {
    prompt: 'Sur une route de montagne, je stationne de préférence :',
    answers: [
      { label: 'A', text: 'En descente sur la chaussée.', correct: false },
      { label: 'B', text: 'En côte sur la chaussée.', correct: false },
      { label: 'C', text: 'Sur une place d\'évitement.', correct: true },
    ],
  },
  {
    prompt: 'Un conducteur d\'un véhicule qui dérape doit :',
    answers: [
      { label: 'A', text: 'Freiner fort pour stopper le véhicule.', correct: false },
      { label: 'B', text: 'Accélérer franchement pour redonner de l\'adhérence aux roues arrière.', correct: false },
      { label: 'C', text: 'Braquer calmement pour ramener le véhicule sur sa trajectoire.', correct: true },
    ],
  },
  {
    prompt: 'Si mes roues mordent sur le bas-côté de la route :',
    answers: [
      { label: 'A', text: 'Je freine fort et je corrige rapidement ma trajectoire.', correct: false },
      { label: 'B', text: 'Je freine légèrement et je reviens progressivement sur la chaussée.', correct: true },
    ],
  },
]

function buildAnswers(questionIndex, answerData) {
  return answerData.map((a) => ({
    id: `hc-ch3-q${String(questionIndex).padStart(2, '0')}-${a.label.toLowerCase()}`,
    label: a.label,
    text: a.text,
    audioUrl: '',
    isCorrect: a.correct,
  }))
}

function buildQuestion(order, data) {
  return {
    id: `hc-ch3-q${String(order).padStart(2, '0')}`,
    chapterKey: CHAPITRE_03_KEY,
    chapterOrder: CHAPITRE_03_ORDER,
    order,
    published: true,
    prompt: {
      text: data.prompt,
      audioUrl: audioUrl(order),
      audioPublicId: '',
      imageUrls: QUESTIONS_WITH_IMAGES.has(order) ? [imageUrl(order)] : [],
    },
    answers: buildAnswers(order, data.answers),
  }
}

/**
 * 42 questions.
 * Q1 / Q9 / Q26 remplacées (énoncés ambigus ou image-dépendants).
 */
export const CHAPITRE_03_QUESTIONS = QUESTIONS_DATA.map((data, i) =>
  buildQuestion(i + 1, data)
)
