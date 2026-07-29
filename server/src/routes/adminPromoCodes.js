import { Router } from 'express'
import { requireAdminAuth } from '../middleware/adminAuth.js'
import { PromoCode, PROMO_CREATABLE_MODULES, PROMO_DURATION_UNITS } from '../models/PromoCode.js'
import { logger } from '../utils/logger.js'

const router = Router()
router.use(requireAdminAuth)

function parseModules(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((item) => PROMO_CREATABLE_MODULES.includes(item)))]
}

router.get('/', async (_req, res) => {
  try {
    const codes = await PromoCode.find().sort({ createdAt: -1 })
    res.json({ success: true, data: { promoCodes: codes.map((c) => c.toAdminJSON()) } })
  } catch (error) {
    logger.error('Erreur liste codes promo:', { error: error.message })
    res.status(500).json({ success: false, error: 'Chargement impossible' })
  }
})

router.post('/', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase()
    const modules = parseModules(req.body.modules)

    if (code.length < 3) {
      return res.status(400).json({ success: false, error: 'Code trop court (3 caractères minimum)' })
    }
    if (!modules.length) {
      return res.status(400).json({ success: false, error: 'Sélectionnez au moins un module' })
    }
    const heuresBonus = Number(req.body.heuresBonus) || 0
    if (modules.includes('conduite_heures') && heuresBonus <= 0) {
      return res.status(400).json({ success: false, error: 'Indiquez un nombre d’heures bonus supérieur à 0' })
    }

    const durationUnit = PROMO_DURATION_UNITS.includes(req.body.durationUnit)
      ? req.body.durationUnit
      : 'month'
    const durationQuantity = Math.max(1, Number(req.body.durationQuantity) || 1)
    const maxUses = req.body.maxUses != null && req.body.maxUses !== ''
      ? Math.max(1, Number(req.body.maxUses) || 1)
      : null

    const promo = await PromoCode.create({
      code,
      label: String(req.body.label || '').trim(),
      modules,
      durationQuantity,
      durationUnit,
      heuresBonus,
      maxUses,
      createdByAdminId: req.admin._id,
    })

    res.status(201).json({ success: true, data: { promoCode: promo.toAdminJSON() } })
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, error: 'Ce code existe déjà' })
    }
    logger.error('Erreur création code promo:', { error: error.message })
    res.status(500).json({ success: false, error: 'Création impossible' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id)
    if (!promo) {
      return res.status(404).json({ success: false, error: 'Code promo introuvable' })
    }

    if (req.body.label !== undefined) promo.label = String(req.body.label).trim()
    if (req.body.modules !== undefined) {
      const modules = parseModules(req.body.modules)
      if (!modules.length) {
        return res.status(400).json({ success: false, error: 'Sélectionnez au moins un module' })
      }
      promo.modules = modules
    }
    if (req.body.durationQuantity !== undefined) {
      promo.durationQuantity = Math.max(1, Number(req.body.durationQuantity) || 1)
    }
    if (req.body.durationUnit !== undefined && PROMO_DURATION_UNITS.includes(req.body.durationUnit)) {
      promo.durationUnit = req.body.durationUnit
    }
    if (req.body.heuresBonus !== undefined) {
      promo.heuresBonus = Math.max(0, Number(req.body.heuresBonus) || 0)
    }
    if (req.body.maxUses !== undefined) {
      promo.maxUses = req.body.maxUses === null || req.body.maxUses === ''
        ? null
        : Math.max(1, Number(req.body.maxUses) || 1)
    }
    if (req.body.active !== undefined) promo.active = Boolean(req.body.active)

    await promo.save()
    res.json({ success: true, data: { promoCode: promo.toAdminJSON() } })
  } catch (error) {
    logger.error('Erreur maj code promo:', { error: error.message })
    res.status(500).json({ success: false, error: 'Mise à jour impossible' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id)
    if (!promo) {
      return res.status(404).json({ success: false, error: 'Code promo introuvable' })
    }
    res.json({ success: true, data: { deleted: true } })
  } catch (error) {
    logger.error('Erreur suppression code promo:', { error: error.message })
    res.status(500).json({ success: false, error: 'Suppression impossible' })
  }
})

export default router
