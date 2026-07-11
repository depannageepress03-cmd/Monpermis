/**
 * Attache des vidéos YouTube aux modules des cours de révision existants
 * (sans supprimer chapitres / questions / progression).
 * Usage: node scripts/attach-course-videos.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Chapter } from '../src/models/Chapter.js'

const VIDEOS_BY_COURSE = {
  'Panneaux de danger': [
    { moduleName: 'Reconnaître un danger', videoUrl: 'https://www.youtube.com/watch?v=VmwXQ_zIU-c' },
  ],
  'Panneaux d’interdiction et d’obligation': [
    { moduleName: 'Interdictions', videoUrl: 'https://www.youtube.com/watch?v=JDRh0v3l2zs' },
    { moduleName: 'Obligations', videoUrl: 'https://www.youtube.com/watch?v=T4ZdR-sJbYM' },
  ],
  'Marquages au sol': [
    { moduleName: 'Lignes et passages', videoUrl: 'https://www.youtube.com/watch?v=TIVtWnFxUuA' },
  ],
  'Règles de priorité': [
    { moduleName: 'Priorité à droite', videoUrl: 'https://www.youtube.com/watch?v=6ORtgRaKths' },
  ],
  'Carrefours et ronds-points': [
    { moduleName: 'Ronds-points', videoUrl: 'https://www.youtube.com/watch?v=O-GiYnZam_o' },
    { moduleName: 'Feux et agents', videoUrl: 'https://www.youtube.com/watch?v=KBTd5Vh-smw' },
  ],
  'Équipements et contrôles': [
    { moduleName: 'Avant de partir', videoUrl: 'https://www.youtube.com/watch?v=mRT5Jyu9lG0' },
  ],
  'Conduite responsable': [
    { moduleName: 'Distances et vitesse', videoUrl: 'https://www.youtube.com/watch?v=ceg9LWC0_Zw' },
    { moduleName: 'Distractions', videoUrl: 'https://www.youtube.com/watch?v=yCZdmXL5wGI' },
  ],
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  const chapters = await Chapter.find({})
  let updated = 0

  for (const chapter of chapters) {
    let dirty = false
    for (const course of chapter.courses) {
      const specs = VIDEOS_BY_COURSE[course.title]
      if (!specs) continue
      for (const spec of specs) {
        const module = course.modules.find((m) => m.name === spec.moduleName)
        if (!module) {
          console.warn(`Module introuvable: ${course.title} / ${spec.moduleName}`)
          continue
        }
        module.mediaType = 'video'
        module.videoUrl = spec.videoUrl
        module.imageUrl = ''
        dirty = true
        updated += 1
        console.log(`✓ ${chapter.name} › ${course.title} › ${module.name}`)
      }
    }
    if (dirty) await chapter.save()
  }

  console.log(`Terminé: ${updated} module(s) mis à jour.`)
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
