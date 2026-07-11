/**
 * Crée un parcours de leçons de conduite structuré (chapitres + cours + vidéos).
 * Remplace le contenu ConduiteChapter existant sans toucher au code / révision.
 * Usage: node scripts/seed-conduite-content.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { ConduiteChapter } from '../src/models/ConduiteChapter.js'
import { User } from '../src/models/User.js'

function moduleText(title, paragraphs) {
  return `<h2>${title}</h2>${paragraphs.map((p) => `<p>${p}</p>`).join('')}`
}

function mod({ name, title, videoUrl, paragraphs }) {
  return {
    name,
    title,
    mediaType: 'video',
    videoUrl,
    text: moduleText(title, paragraphs),
  }
}

const CHAPTERS = [
  {
    name: 'Premiers pas au volant',
    courses: [
      {
        title: 'Installation au poste de conduite',
        modules: [
          mod({
            name: 'S’installer correctement',
            title: 'Réglages avant de démarrer',
            videoUrl: 'https://www.youtube.com/watch?v=QUzsHjdQsKc',
            paragraphs: [
              'Réglez le siège, le volant et les rétroviseurs avant de mettre le contact.',
              'La ceinture doit être attachée, le dossier assez droit, les pieds bien posés sur les pédales.',
              'Vérifiez que vous pouvez freiner à fond sans décoller le dos du siège.',
            ],
          }),
        ],
      },
      {
        title: 'Démarrer et s’arrêter',
        modules: [
          mod({
            name: 'Démarrage et arrêt',
            title: 'Contrôler le véhicule dès le départ',
            videoUrl: 'https://www.youtube.com/watch?v=t0Becb5kqGU',
            paragraphs: [
              'Contrôlez l’environnement, serrez le frein de parking si besoin, puis démarrez progressivement.',
              'Pour s’arrêter : anticipez, freinez progressivement, débrayez avant l’arrêt complet.',
              'Gardez le pied prêt à freiner et regardez loin devant vous.',
            ],
          }),
        ],
      },
      {
        title: 'Boîte de vitesses',
        modules: [
          mod({
            name: 'Passer les vitesses',
            title: 'Manipuler le levier en douceur',
            videoUrl: 'https://www.youtube.com/watch?v=yH5mIrdFz2Y',
            paragraphs: [
              'Débrayez à fond avant de changer de rapport, puis relâchez progressivement l’embrayage.',
              'Écoutez le moteur : un régime trop bas ou trop haut indique qu’il faut changer de vitesse.',
              'Ne regardez pas le levier : gardez les yeux sur la route.',
            ],
          }),
        ],
      },
    ],
  },
  {
    name: 'Trajectoire et placement',
    courses: [
      {
        title: 'Positionnement sur la chaussée',
        modules: [
          mod({
            name: 'Trajectoire',
            title: 'Se placer correctement',
            videoUrl: 'https://www.youtube.com/watch?v=r7Dan4TZEmo',
            paragraphs: [
              'Maintenez une trajectoire stable au centre de votre voie, sans coller le bas-côté ni la ligne médiane.',
              'Regardez loin : le regard guide les mains et corrige naturellement la trajectoire.',
              'Anticipez les courbes en plaçant le véhicule avant d’arriver dans le virage.',
            ],
          }),
        ],
      },
      {
        title: 'Marche arrière',
        modules: [
          mod({
            name: 'Reculer en sécurité',
            title: 'Contrôles et allure',
            videoUrl: 'https://www.youtube.com/watch?v=x84KjwarfeI',
            paragraphs: [
              'Avant de reculer : rétroviseurs, angles morts, environnement immédiat.',
              'Avancez très lentement, une main en bas du volant, et arrêtez-vous dès qu’un doute apparaît.',
              'La marche arrière sert aussi de base aux manœuvres de stationnement.',
            ],
          }),
        ],
      },
    ],
  },
  {
    name: 'Manœuvres',
    courses: [
      {
        title: 'Stationnement',
        modules: [
          mod({
            name: 'Créneau et bataille',
            title: 'Se garer en créneau et en bataille',
            videoUrl: 'https://www.youtube.com/watch?v=4HNBUQ6oE6A',
            paragraphs: [
              'Le créneau : alignez-vous, reculez en braquant au bon moment, puis redressez.',
              'Le stationnement en bataille : placez-vous, contrôlez, puis entrez lentement dans l’emplacement.',
              'Prenez le temps : une manœuvre réussie est lente, contrôlée et bien signalée.',
            ],
          }),
        ],
      },
      {
        title: 'Demi-tour',
        modules: [
          mod({
            name: 'Demi-tour en trois temps',
            title: 'Faire demi-tour en sécurité',
            videoUrl: 'https://www.youtube.com/watch?v=W_DQ1RJCg6Y',
            paragraphs: [
              'Choisissez un endroit sûr, large et peu fréquenté.',
              'Signalez, contrôlez, puis enchaînez les trois temps sans précipitation.',
              'Ne bloquez jamais la circulation : laissez passer si un véhicule arrive.',
            ],
          }),
        ],
      },
    ],
  },
  {
    name: 'Circulation avancée',
    courses: [
      {
        title: 'Ronds-points en pratique',
        modules: [
          mod({
            name: 'Franchir un giratoire',
            title: 'Entrer, circuler, sortir',
            videoUrl: 'https://www.youtube.com/watch?v=UYM5AxrwvbQ',
            paragraphs: [
              'Cédez le passage aux usagers déjà engagés, puis insérez-vous sans freiner brusquement.',
              'Placez-vous selon votre sortie et utilisez le clignotant pour signaler votre intention.',
              'Ne changez pas de voie au dernier moment dans l’anneau.',
            ],
          }),
        ],
      },
      {
        title: 'Voies rapides',
        modules: [
          mod({
            name: 'S’insérer',
            title: 'Insertion sur voie rapide',
            videoUrl: 'https://www.youtube.com/watch?v=sdyy-4Yfojc',
            paragraphs: [
              'Accélérez sur la voie d’insertion pour vous aligner sur le flux.',
              'Contrôlez les rétroviseurs et l’angle mort, puis changez de voie quand l’espace est suffisant.',
              'Ne vous arrêtez jamais sur la bande d’accélération sauf danger immédiat.',
            ],
          }),
        ],
      },
      {
        title: 'Conditions difficiles',
        modules: [
          mod({
            name: 'Conduite de nuit',
            title: 'Voir et être vu la nuit',
            videoUrl: 'https://www.youtube.com/watch?v=DUHfH2xlUNc',
            paragraphs: [
              'Utilisez les feux adaptés : croisement en agglomération, route hors agglomération si personne en face.',
              'Réduisez la vitesse : la visibilité est limitée par la portée des phares.',
              'Méfiez-vous de la fatigue et des éblouissements.',
            ],
          }),
          mod({
            name: 'Conduite sous la pluie',
            title: 'Adhérence et distances',
            videoUrl: 'https://www.youtube.com/watch?v=kuYZHuVQpfI',
            paragraphs: [
              'Allongez les distances de sécurité : le freinage est plus long sur chaussée mouillée.',
              'Évitez les manœuvres brusques et surveillez l’aquaplaning.',
              'Allumez les feux de croisement pour être mieux vu.',
            ],
          }),
        ],
      },
    ],
  },
]

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connecté à MongoDB')

  const oldChapters = await ConduiteChapter.find({}, { _id: 1 }).lean()
  const oldIds = oldChapters.map((c) => String(c._id))
  console.log(`Suppression de ${oldIds.length} chapitre(s) conduite existant(s)…`)

  await ConduiteChapter.deleteMany({})

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
    await ConduiteChapter.create({
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
          imageUrl: '',
          order: moduleIndex,
        })),
      })),
    })

    const courseCount = def.courses.length
    const moduleCount = def.courses.reduce((sum, c) => sum + c.modules.length, 0)
    console.log(`✓ ${def.name} — ${courseCount} cours, ${moduleCount} module(s)`)
  }

  console.log('Seed conduite terminé.')
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
