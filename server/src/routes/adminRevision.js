import { Chapter } from '../models/Chapter.js'
import { createAdminChapterRouter } from './adminChapterContent.js'

const router = createAdminChapterRouter(Chapter)

export default router
