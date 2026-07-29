import { Router } from 'express'
import { requireUserAuth } from '../middleware/userAuth.js'
import { PromoCode } from '../models/PromoCode.js'
import { PromoCodeRedemption } from '../models/PromoCodeRedemption.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { User } from '../models/User.js'
import { transitionAccessRequest, getUserModuleAccess } from '../utils/accessRequests.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireUserAuth)

router.post('/redeem', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase()
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code promo requis' })
    }

    const promo = await PromoCode.findOne({ code })
    if (!promo || !promo.active) {
      return res.status(404).json({ success: false, error: 'Code promo invalide' })
    }

    // 1) Réserve la rédemption (index unique) — empêche le double-clic / courses parallèles.
    let redemption
    try {
      redemption = await PromoCodeRedemption.create({
        promoCodeId: promo._id,
        userId: req.user._id,
      })
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, error: 'Vous avez déjà utilisé ce code promo' })
      }
      throw error
    }

    // 2) Incrémente usesCount atomiquement avec plafond maxUses.
    const useFilter = { _id: promo._id, active: true }
    if (promo.maxUses != null) {
      useFilter.usesCount = { $lt: promo.maxUses }
    }
    const claimed = await PromoCode.findOneAndUpdate(useFilter, { $inc: { usesCount: 1 } }, { new: true })
    if (!claimed) {
      await PromoCodeRedemption.deleteOne({ _id: redemption._id })
      return res
        .status(410)
        .json({ success: false, error: 'Ce code promo a atteint son nombre maximal d’utilisations' })
    }

    // 3) Crédite modules / heures (après claim unique).
    const unlockedModules = []
    try {
      for (const module of claimed.modules) {
        if (module === 'conduite_heures') {
          if (claimed.heuresBonus > 0) {
            await User.findByIdAndUpdate(req.user._id, { $inc: { soldeHeures: claimed.heuresBonus } })
          }
          unlockedModules.push(module)
          continue
        }

        const request = await AccessRequest.create({
          userId: req.user._id,
          module,
          status: 'en_attente',
          amount: 0,
          quantity: claimed.durationQuantity,
          unit: claimed.durationUnit,
        })
        await transitionAccessRequest(request, 'en_verification', {
          actor: 'system',
          actorLabel: 'Code promo',
          note: claimed.code,
        })
        await transitionAccessRequest(request, 'valide', {
          actor: 'system',
          actorLabel: 'Code promo',
          note: claimed.code,
        })
        unlockedModules.push(module)
      }
    } catch (creditError) {
      // Compensation best-effort si le crédit échoue après claim.
      try {
        await PromoCodeRedemption.deleteOne({ _id: redemption._id })
        await PromoCode.findByIdAndUpdate(claimed._id, { $inc: { usesCount: -1 } })
      } catch (compensateError) {
        logger.error('Compensation rédemption promo échouée', {
          error: compensateError.message,
          promoId: String(claimed._id),
          userId: String(req.user._id),
        })
      }
      throw creditError
    }

    const access = await getUserModuleAccess(req.user._id)
    const user = await User.findById(req.user._id).select('soldeHeures')

    res.json({
      success: true,
      data: {
        modules: unlockedModules,
        access: {
          ...access,
          user: { soldeHeures: user?.soldeHeures || 0 },
        },
      },
    })
  } catch (error) {
    logger.error('Erreur rédemption code promo:', { error: error.message })
    res.status(500).json({ success: false, error: 'Rédemption impossible' })
  }
})

export default router
