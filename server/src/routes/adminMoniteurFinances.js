import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAdminAuth, requireSuperAdmin } from '../middleware/adminAuth.js'
import { audit } from '../middleware/audit.js'
import { Moniteur } from '../models/Moniteur.js'
import { MoniteurPayout } from '../models/MoniteurPayout.js'
import {
  computeAllMoniteursEarningsSummary,
  computeMoniteurEarnings,
} from '../utils/moniteurEarnings.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth, requireSuperAdmin)

/** Synthèse des gains / restes dus par moniteur. */
router.get('/moniteurs', async (_req, res) => {
  try {
    const moniteurs = await Moniteur.find().sort({ lastName: 1, firstName: 1 })
    const rows = await computeAllMoniteursEarningsSummary(moniteurs)
    const totals = rows.reduce(
      (acc, row) => {
        acc.totalEarned += row.totalEarned
        acc.totalPaid += row.totalPaid
        acc.outstanding += row.outstanding
        acc.completedSessions += row.completedSessions
        return acc
      },
      { totalEarned: 0, totalPaid: 0, outstanding: 0, completedSessions: 0 },
    )
    res.json({ success: true, data: { moniteurs: rows, totals } })
  } catch (error) {
    logger.error('Erreur finances moniteurs:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.get('/moniteurs/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Identifiant invalide' })
    }
    const moniteur = await Moniteur.findById(req.params.id)
    if (!moniteur) {
      return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
    }
    const earnings = await computeMoniteurEarnings(moniteur._id)
    res.json({
      success: true,
      data: {
        moniteur: moniteur.toJSONSafe(),
        ...earnings,
      },
    })
  } catch (error) {
    logger.error('Erreur détail finances moniteur:', error)
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post(
  '/moniteurs/:id/payouts',
  audit('create', 'moniteur_payout'),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Identifiant invalide' })
      }
      const moniteur = await Moniteur.findById(req.params.id)
      if (!moniteur) {
        return res.status(404).json({ success: false, error: 'Moniteur introuvable' })
      }

      const amountFcfa = Math.round(Number(req.body.amountFcfa))
      if (!Number.isFinite(amountFcfa) || amountFcfa < 1) {
        return res.status(400).json({ success: false, error: 'Montant invalide' })
      }

      const earnings = await computeMoniteurEarnings(moniteur._id)
      if (amountFcfa > earnings.totals.outstanding + 1) {
        return res.status(400).json({
          success: false,
          error: `Montant supérieur au reste dû (${earnings.totals.outstanding} FCFA)`,
        })
      }

      const paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date()
      if (Number.isNaN(paidAt.getTime())) {
        return res.status(400).json({ success: false, error: 'Date de versement invalide' })
      }

      const payout = await MoniteurPayout.create({
        moniteurId: moniteur._id,
        amountFcfa,
        paidAt,
        note: String(req.body.note || '').trim().slice(0, 500),
        periodLabel: String(req.body.periodLabel || '').trim().slice(0, 80),
        createdByAdminId: req.admin?._id || null,
      })

      const refreshed = await computeMoniteurEarnings(moniteur._id)
      res.status(201).json({
        success: true,
        data: {
          payout: payout.toJSONSafe(),
          totals: refreshed.totals,
        },
      })
    } catch (error) {
      logger.error('Erreur versement moniteur:', error)
      res.status(500).json({ success: false, error: 'Enregistrement impossible' })
    }
  },
)

export default router
