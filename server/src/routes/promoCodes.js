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
    if (promo.maxUses != null && promo.usesCount >= promo.maxUses) {
      return res.status(410).json({ success: false, error: 'Ce code promo a atteint son nombre maximal d’utilisations' })
    }

    const already = await PromoCodeRedemption.findOne({ promoCodeId: promo._id, userId: req.user._id })
    if (already) {
      return res.status(409).json({ success: false, error: 'Vous avez déjà utilisé ce code promo' })
    }

    const unlockedModules = []
    for (const module of promo.modules) {
      if (module === 'conduite_heures') {
        if (promo.heuresBonus > 0) {
          await User.findByIdAndUpdate(req.user._id, { $inc: { soldeHeures: promo.heuresBonus } })
        }
        unlockedModules.push(module)
        continue
      }

      const request = await AccessRequest.create({
        userId: req.user._id,
        module,
        status: 'en_attente',
        amount: 0,
        quantity: promo.durationQuantity,
        unit: promo.durationUnit,
      })
      await transitionAccessRequest(request, 'en_verification', {
        actor: 'system',
        actorLabel: 'Code promo',
        note: promo.code,
      })
      await transitionAccessRequest(request, 'valide', {
        actor: 'system',
        actorLabel: 'Code promo',
        note: promo.code,
      })
      unlockedModules.push(module)
    }

    promo.usesCount += 1
    await promo.save()
    await PromoCodeRedemption.create({ promoCodeId: promo._id, userId: req.user._id })

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
