import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { createAdminChapterRouter } from './adminChapterContent.js'

const router = createAdminChapterRouter(ConduiteChapter)

export default router
