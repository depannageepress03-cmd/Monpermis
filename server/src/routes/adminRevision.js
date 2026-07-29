import { Chapter } from '../models/Chapter.js'
import { resolveCodeMediaFolder } from '../services/cloudinary.js'
import { createAdminChapterRouter } from './adminChapterContent.js'

const router = createAdminChapterRouter(Chapter, {
  mediaFolder: resolveCodeMediaFolder('monpermis/code'),
})

export default router
