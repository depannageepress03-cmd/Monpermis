import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { createAdminChapterRouter } from './adminChapterContent.js'

/** Même pipeline d’upload que le code — dossier Cloudinary dédié conduite. */
const router = createAdminChapterRouter(ConduiteChapter, {
  mediaFolder: 'monpermis/conduite',
})

export default router
