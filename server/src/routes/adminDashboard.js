import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { User } from '../models/User.js'
import { Chapter } from '../models/Chapter.js'
import { ConduiteChapter } from '../models/ConduiteChapter.js'
import { Question } from '../models/Question.js'
import { Moniteur } from '../models/Moniteur.js'
import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { Admin } from '../models/Admin.js'

const router = Router()
router.use(requireAdminAuth)

router.get('/summary', async (_req, res) => {
  try {
    const [
      users,
      codeChapters,
      conduiteChapters,
      questionsCount,
      moniteurs,
      reservations,
      creneauxLibre,
      adminsCount,
    ] = await Promise.all([
      User.find().select('isActive'),
      Chapter.find().select('published courses'),
      ConduiteChapter.find().select('published courses'),
      Question.countDocuments(),
      Moniteur.find().select('active'),
      Reservation.find().select('status paymentStatus'),
      Creneau.countDocuments({ status: 'libre' }),
      Admin.countDocuments(),
    ])

    const usersTotal = users.length
    const usersActive = users.filter((item) => item.isActive !== false).length
    const usersSuspended = usersTotal - usersActive

    const codeCourses = codeChapters.reduce(
      (sum, chapter) => sum + (chapter.courses?.length || 0),
      0,
    )
    const codePublished = codeChapters.filter((chapter) => chapter.published).length

    const conduiteCourses = conduiteChapters.reduce(
      (sum, chapter) => sum + (chapter.courses?.length || 0),
      0,
    )
    const conduitePublished = conduiteChapters.filter((chapter) => chapter.published).length

    const moniteursActive = moniteurs.filter((item) => item.active !== false).length

    const reservationsPending = reservations.filter(
      (item) =>
        item.paymentStatus === 'pending_validation' || item.status === 'pending_payment',
    ).length
    const reservationsConfirmed = reservations.filter(
      (item) => item.status === 'confirmed' || item.paymentStatus === 'paid',
    ).length

    res.json({
      success: true,
      data: {
        summary: {
          users: {
            total: usersTotal,
            active: usersActive,
            suspended: usersSuspended,
          },
          code: {
            chapters: codeChapters.length,
            published: codePublished,
            courses: codeCourses,
            questions: questionsCount,
          },
          conduite: {
            chapters: conduiteChapters.length,
            published: conduitePublished,
            courses: conduiteCourses,
            moniteurs: moniteurs.length,
            moniteursActive,
            creneauxLibre,
            reservations: reservations.length,
            reservationsPending,
            reservationsConfirmed,
          },
          admins: {
            total: adminsCount,
          },
        },
      },
    })
  } catch (error) {
    console.error('Erreur résumé dashboard:', error)
    res.status(500).json({ success: false, error: 'Chargement du résumé impossible' })
  }
})

export default router
