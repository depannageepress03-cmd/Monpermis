/**
 * Remplace les chapitres de démo par un parcours code structuré + questions.
 * Usage: node scripts/seed-revision-content.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Chapter } from '../src/models/Chapter.js'
import { Question } from '../src/models/Question.js'
import { TestSubject, TEST_SUBJECT_SIZE } from '../src/models/TestSubject.js'
import { User } from '../src/models/User.js'

function moduleText(title, paragraphs) {
  return `<h2>${title}</h2>${paragraphs.map((p) => `<p>${p}</p>`).join('')}`
}

function q(prompt, answers, correctIndex) {
  return {
    prompt: { text: prompt, audioUrl: '', imageUrls: [] },
    answers: answers.map((text, index) => ({
      label: String.fromCharCode(97 + index),
      text,
      audioUrl: '',
      isCorrect: index === correctIndex,
    })),
  }
}

const CHAPTERS = [
  {
    name: 'Signalisation routière',
    courses: [
      {
        title: 'Panneaux de danger',
        modules: [
          {
            name: 'Reconnaître un danger',
            title: 'Forme et signification',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=VmwXQ_zIU-c',
            text: moduleText('Panneaux de danger', [
              'Les panneaux de danger sont généralement triangulaires, à bord rouge, fond blanc.',
              'Ils préviennent d’un risque à venir : virage, école, animaux, chaussée glissante…',
              'Adaptez votre vitesse dès que vous apercevez le panneau, sans attendre le danger.',
            ]),
          },
        ],
      },
      {
        title: 'Panneaux d’interdiction et d’obligation',
        modules: [
          {
            name: 'Interdictions',
            title: 'Ce qui est interdit',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=JDRh0v3l2zs',
            text: moduleText('Interdiction', [
              'Les panneaux d’interdiction sont ronds, à bord rouge.',
              'Exemples : sens interdit, vitesse limitée, interdiction de dépasser.',
              'Une interdiction reste valable jusqu’au prochain carrefour, sauf indication contraire.',
            ]),
          },
          {
            name: 'Obligations',
            title: 'Ce qui est obligatoire',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=T4ZdR-sJbYM',
            text: moduleText('Obligation', [
              'Les panneaux d’obligation sont ronds, fond bleu.',
              'Exemples : direction obligatoire, piste cyclable obligatoire, chaînes à neige.',
            ]),
          },
        ],
      },
      {
        title: 'Marquages au sol',
        modules: [
          {
            name: 'Lignes et passages',
            title: 'Lire la chaussée',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=TIVtWnFxUuA',
            text: moduleText('Marquages', [
              'Une ligne continue interdit de la franchir pour dépasser.',
              'Une ligne discontinue autorise le dépassement si les conditions le permettent.',
              'Le passage piéton impose de céder le passage aux piétons engagés.',
            ]),
          },
        ],
      },
    ],
    questions: [
      q('Quelle est la forme habituelle d’un panneau de danger ?', ['Rond', 'Triangulaire', 'Carré', 'Octogonal'], 1),
      q('Un panneau rond à bord rouge indique généralement :', ['Une obligation', 'Une information', 'Une interdiction', 'Un danger'], 2),
      q('Un panneau rond fond bleu indique :', ['Une interdiction', 'Une obligation', 'Un danger', 'Un stationnement'], 1),
      q('Face à un panneau « virage dangereux », vous devez :', ['Accélérer', 'Klaxonner', 'Réduire la vitesse', 'Allumer les feux de détresse'], 2),
      q('Une ligne continue au sol :', ['Autorise le dépassement', 'Interdit de la franchir pour dépasser', 'Indique une piste cyclable', 'N’a aucune valeur'], 1),
      q('Une ligne discontinue :', ['Interdit tout dépassement', 'Autorise le dépassement si possible', 'Oblige à s’arrêter', 'Indique un stationnement'], 1),
      q('Sur un passage piéton, vous devez :', ['Klaxonner', 'Accélérer', 'Céder le passage aux piétons engagés', 'Vous arrêter toujours 10 secondes'], 2),
      q('Un panneau de limitation de vitesse 50 signifie :', ['Vitesse minimale 50', 'Vitesse maximale 50', 'Vitesse conseillée 50', 'Stationnement 50 m'], 1),
      q('Le panneau « sens interdit » :', ['Autorise l’entrée', 'Interdit l’entrée dans la voie', 'Oblige à tourner à droite', 'Indique une zone 30'], 1),
      q('Un panneau « école » vous invite à :', ['Accélérer', 'Être particulièrement vigilant', 'Klaxonner', 'Utiliser le téléphone'], 1),
      q('Les feux de signalisation priment :', ['Sur les panneaux', 'Jamais sur les panneaux', 'Uniquement la nuit', 'Uniquement hors agglomération'], 0),
      q('Un panneau de fin d’interdiction est souvent :', ['Triangulaire rouge', 'Rond barré de noir', 'Bleu carré', 'Vert hexagonal'], 1),
      q('Le panneau « stop » impose :', ['Un ralentissement', 'Un arrêt complet', 'Un simple coup d’œil', 'Un klaxon'], 1),
      q('Le panneau « cédez le passage » impose :', ['Un arrêt obligatoire', 'De laisser la priorité sans arrêt obligatoire', 'D’accélérer', 'De stationner'], 1),
      q('Une bande cyclable est réservée :', ['Aux voitures', 'Aux piétons', 'Aux cycles', 'Aux bus uniquement'], 2),
      q('Un panneau de stationnement interdit :', ['Autorise 5 minutes', 'Interdit de stationner', 'Oblige à stationner', 'Indique un parking'], 1),
      q('En agglomération, sans panneau, la vitesse max est souvent :', ['30 km/h', '50 km/h', '70 km/h', '90 km/h'], 1),
      q('Un panneau « chaussée glissante » annonce :', ['Un virage', 'Un risque d’adhérence réduite', 'Un péage', 'Un parking'], 1),
      q('Franchir une ligne continue pour dépasser est :', ['Autorisé', 'Interdit', 'Conseillé', 'Obligatoire'], 1),
      q('Un panneau d’indication est souvent :', ['Rond rouge', 'Triangulaire', 'Carré ou rectangulaire', 'Octogonal'], 2),
    ],
  },
  {
    name: 'Priorités et intersections',
    courses: [
      {
        title: 'Règles de priorité',
        modules: [
          {
            name: 'Priorité à droite',
            title: 'Le principe de base',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=6ORtgRaKths',
            text: moduleText('Priorité à droite', [
              'En l’absence de signalisation, la priorité à droite s’applique.',
              'Vous devez céder le passage aux véhicules venant de votre droite.',
              'Restez vigilant aux intersections peu signalées.',
            ]),
          },
        ],
      },
      {
        title: 'Carrefours et ronds-points',
        modules: [
          {
            name: 'Ronds-points',
            title: 'Circuler dans un carrefour giratoire',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=O-GiYnZam_o',
            text: moduleText('Rond-point', [
              'Les véhicules déjà engagés dans l’anneau ont généralement la priorité.',
              'Signalez vos changements de direction et placez-vous correctement.',
              'Ne restez pas sur la voie intérieure si vous sortez bientôt.',
            ]),
          },
          {
            name: 'Feux et agents',
            title: 'Qui commande ?',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=KBTd5Vh-smw',
            text: moduleText('Ordre des priorités', [
              'Les indications d’un agent de police priment sur les feux et panneaux.',
              'Les feux priment sur la signalisation permanente.',
              'En cas de feu orange, arrêtez-vous si vous pouvez le faire en sécurité.',
            ]),
          },
        ],
      },
    ],
    questions: [
      q('Sans signalisation, la règle de base est :', ['Priorité à gauche', 'Priorité à droite', 'Priorité au plus rapide', 'Priorité aux poids lourds'], 1),
      q('Dans un rond-point, en général :', ['Vous avez toujours priorité', 'Les véhicules déjà engagés ont priorité', 'Les piétons n’ont jamais priorité', 'Il faut s’arrêter au centre'], 1),
      q('Un agent de circulation :', ['Est moins prioritaire que les feux', 'Prime sur feux et panneaux', 'N’a aucune autorité', 'S’applique seulement la nuit'], 1),
      q('Au feu orange, vous devez :', ['Toujours accélérer', 'Vous arrêter si possible en sécurité', 'Klaxonner', 'Tourner sans regarder'], 1),
      q('Au feu rouge, vous :', ['Pouvez passer avec prudence', 'Devez vous arrêter', 'Ralentissez seulement', 'Passez si personne ne vient'], 1),
      q('Au feu vert, vous :', ['Passez sans regarder', 'Pouvez passer en restant vigilant', 'Devez vous arrêter', 'Klaxonnez'], 1),
      q('À une intersection avec « stop » :', ['Ralentissez seulement', 'Arrêt complet obligatoire', 'Priorité automatique', 'Accélérez'], 1),
      q('« Cédez le passage » signifie :', ['Arrêt toujours obligatoire', 'Laisser la priorité sans arrêt systématique', 'Interdiction d’entrer', 'Stationnement'], 1),
      q('Quand deux véhicules arrivent face à face et veulent tourner :', ['Le plus gros passe', 'Chacun applique les règles et signale', 'On klaxonne', 'On passe ensemble'], 1),
      q('En sortant d’un chemin privé :', ['Vous avez priorité', 'Vous cédez le passage', 'Vous accélérez', 'Vous klaxonnez'], 1),
      q('Sur une route principale signalée :', ['Priorité à droite toujours', 'Les usagers des voies adjacentes cèdent souvent le passage', 'Personne n’a priorité', 'Les cyclistes ont priorité absolue'], 1),
      q('Avant de tourner à gauche, vous :', ['Coupez la trajectoire sans regarder', 'Contrôlez, signalez, cédez si besoin', 'Accélérez fort', 'Utilisez le téléphone'], 1),
      q('Un véhicule d’urgence en intervention :', ['N’a aucune priorité', 'Doit être facilité dans sa progression', 'Doit s’arrêter', 'Peut être dépassé n’importe où'], 1),
      q('Dans un embouteillage à une intersection :', ['Engagez-vous même bloqué', 'N’engagez pas si vous risquez de bloquer', 'Klaxonnez', 'Coupez les voies'], 1),
      q('Changer de direction sans clignotant :', ['Est recommandé', 'Est dangereux et incorrect', 'Est obligatoire', 'Est réservé la nuit'], 1),
      q('À un carrefour sans visibilité :', ['Accélérez', 'Approchez prudemment et soyez prêt à céder', 'Klaxonnez longtemps', 'Passez au milieu'], 1),
      q('La priorité à droite s’applique :', ['Toujours, même avec stop', 'Quand aucune autre règle ne s’applique', 'Uniquement sur autoroute', 'Jamais en ville'], 1),
      q('En entrant dans un rond-point :', ['Accélérez au maximum', 'Cédez aux usagers déjà engagés', 'Coupez la trajectoire', 'Stationnez'], 1),
      q('Feu rouge + flèche verte :', ['Interdit tout mouvement', 'Autorise le mouvement indiqué en cédant le passage', 'Oblige à s’arrêter 10 s', 'Annule le code'], 1),
      q('Un piéton engagé sur un passage :', ['N’a pas priorité', 'A priorité', 'Doit courir', 'Doit attendre votre passage'], 1),
    ],
  },
  {
    name: 'Sécurité et comportement',
    courses: [
      {
        title: 'Équipements et contrôles',
        modules: [
          {
            name: 'Avant de partir',
            title: 'Contrôles essentiels',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=mRT5Jyu9lG0',
            text: moduleText('Contrôles', [
              'Vérifiez pneus, feux, rétroviseurs et niveau de carburant.',
              'Attachez toujours votre ceinture avant de démarrer.',
              'Réglez le siège et les rétroviseurs pour une bonne visibilité.',
            ]),
          },
        ],
      },
      {
        title: 'Conduite responsable',
        modules: [
          {
            name: 'Distances et vitesse',
            title: 'Maîtriser son allure',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=ceg9LWC0_Zw',
            text: moduleText('Allure', [
              'Adaptez la vitesse aux conditions : pluie, nuit, circulation dense.',
              'Conservez une distance de sécurité suffisante avec le véhicule devant.',
              'Anticipez plutôt que de freiner brusquement.',
            ]),
          },
          {
            name: 'Distractions',
            title: 'Rester concentré',
            mediaType: 'video',
            videoUrl: 'https://www.youtube.com/watch?v=yCZdmXL5wGI',
            text: moduleText('Attention', [
              'Le téléphone au volant augmente fortement le risque d’accident.',
              'Évitez de manger, de régler le GPS en roulant, ou de discuter de façon distrayante.',
              'La fatigue impose une pause : ne forcez jamais.',
            ]),
          },
        ],
      },
    ],
    questions: [
      q('La ceinture de sécurité doit être attachée :', ['Seulement sur autoroute', 'Avant de démarrer', 'Uniquement à l’arrière', 'Jamais en ville'], 1),
      q('La distance de sécurité sert à :', ['Aller plus vite', 'Réagir à temps', 'Dépasser', 'Stationner'], 1),
      q('Par temps de pluie, vous devez :', ['Accélérer', 'Réduire la vitesse', 'Couper les feux', 'Coller au véhicule devant'], 1),
      q('Utiliser le téléphone en conduisant :', ['Est sans danger', 'Augmente le risque d’accident', 'Est obligatoire', 'Améliore la concentration'], 1),
      q('En cas de fatigue :', ['Continuez sans pause', 'Faites une pause', 'Accélérez pour arriver plus vite', 'Fermez les yeux 2 secondes'], 1),
      q('Les feux de croisement servent surtout :', ['À éblouir', 'À voir et être vu sans éblouir', 'À stationner', 'À klaxonner'], 1),
      q('Un freinage d’urgence :', ['Se fait sans regarder', 'Doit rester contrôlé et anticipé si possible', 'Est toujours interdit', 'Se fait en accélérant'], 1),
      q('Transporter un enfant :', ['Sans siège adapté est dangereux', 'Est toujours libre', 'N’a aucune règle', 'Se fait sur les genoux à l’avant'], 0),
      q('L’alcool au volant :', ['Améliore les réflexes', 'Diminue les capacités', 'Est recommandé', 'N’a aucun effet'], 1),
      q('Avant de démarrer, vous vérifiez :', ['Uniquement la radio', 'Rétroviseurs, ceinture, environnement', 'Le klaxon seulement', 'Rien'], 1),
      q('La nuit, hors agglomération, sans éclairage :', ['Feux de position suffisent', 'Feux de route si personne en face', 'Aucun feu', 'Feux de détresse en continu'], 1),
      q('En présence d’un véhicule en face, feux de route :', ['Restent allumés', 'Passent en croisement', 'Sont coupés totalement', 'Clignotent sans arrêt'], 1),
      q('Un pneu sous-gonflé :', ['Améliore la tenue', 'Augmente les risques', 'Réduit la consommation toujours', 'Est idéal'], 1),
      q('Le gilet et le triangle :', ['Sont inutiles', 'Servent en cas d’arrêt d’urgence', 'Sont décoratifs', 'S’utilisent seulement en ville'], 1),
      q('Dépasser un cycliste :', ['Sans écart', 'En laissant un écart suffisant', 'En klaxonnant fort', 'En le serrant'], 1),
      q('En zone scolaire :', ['Accélérez', 'Soyez très vigilant et ralentissez', 'Klaxonnez', 'Utilisez le téléphone'], 1),
      q('Un angle mort :', ['N’existe pas', 'Doit être contrôlé avant un changement de voie', 'Se voit toujours dans le rétroviseur central', 'Est réservé aux bus'], 1),
      q('En cas d’aquaplaning :', ['Freinez fort immédiatement', 'Relâchez l’accélérateur et gardez le contrôle', 'Tournez brusquement', 'Accélérez'], 1),
      q('Le klaxon sert à :', ['Exprimer sa colère', 'Avertir d’un danger', 'Saluer toujours', 'Remplacer les freins'], 1),
      q('Une conduite défensive consiste à :', ['Imposer sa priorité', 'Anticiper et réduire les risques', 'Rouler au maximum', 'Couper les trajectoires'], 1),
    ],
  },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connecté à MongoDB')

  const oldChapters = await Chapter.find({}, { _id: 1 }).lean()
  const oldIds = oldChapters.map((c) => String(c._id))
  console.log(`Suppression de ${oldIds.length} chapitre(s) existant(s)…`)

  await Question.deleteMany({})
  await TestSubject.deleteMany({})
  await Chapter.deleteMany({})

  if (oldIds.length) {
    await User.updateMany({}, [
      {
        $set: {
          completedCourses: {
            $filter: {
              input: { $ifNull: ['$completedCourses', []] },
              as: 'item',
              cond: { $not: { $in: ['$$item.chapterId', oldIds] } },
            },
          },
          completedTests: {
            $filter: {
              input: { $ifNull: ['$completedTests', []] },
              as: 'item',
              cond: { $not: { $in: ['$$item.chapterId', oldIds] } },
            },
          },
          courseSessions: {
            $filter: {
              input: { $ifNull: ['$courseSessions', []] },
              as: 'item',
              cond: { $not: { $in: ['$$item.chapterId', oldIds] } },
            },
          },
        },
      },
    ])
  }

  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex += 1) {
    const def = CHAPTERS[chapterIndex]
    const chapter = await Chapter.create({
      name: def.name,
      order: chapterIndex,
      published: true,
      courses: def.courses.map((course, courseIndex) => ({
        title: course.title,
        order: courseIndex,
        published: true,
        modules: course.modules.map((module, moduleIndex) => ({
          name: module.name,
          title: module.title,
          text: module.text,
          mediaType: module.mediaType || (module.videoUrl ? 'video' : ''),
          videoUrl: module.videoUrl || '',
          imageUrl: module.imageUrl || '',
          order: moduleIndex,
        })),
      })),
    })

    const createdQuestions = []
    for (let i = 0; i < def.questions.length; i += 1) {
      const item = def.questions[i]
      const question = await Question.create({
        chapterId: chapter._id,
        order: i,
        published: true,
        prompt: item.prompt,
        answers: item.answers,
      })
      createdQuestions.push(question)
    }

    const questionIds = createdQuestions.slice(0, TEST_SUBJECT_SIZE).map((q) => q._id)
    if (questionIds.length === TEST_SUBJECT_SIZE) {
      await TestSubject.create({
        chapterId: chapter._id,
        questionIds,
        published: true,
      })
    }

    console.log(
      `✓ ${def.name} — ${def.courses.length} cours, ${createdQuestions.length} questions, sujet test publié`,
    )
  }

  console.log('Seed terminé.')
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
