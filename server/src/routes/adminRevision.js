import { Chapter } from '../models/Chapter.js'
import { resolveCodeMediaFolder } from '../services/cloudinary.js'
import { ensureStandardRevisionChapters } from '../services/standardRevisionChapters.js'
import { createAdminChapterRouter } from './adminChapterContent.js'

const router = createAdminChapterRouter(Chapter, {
  mediaFolder: resolveCodeMediaFolder('monpermis/code'),
  lockChapterStructure: true,
  ensureChapters: ensureStandardRevisionChapters,
})

export default router
