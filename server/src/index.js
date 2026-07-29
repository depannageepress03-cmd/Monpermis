import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import mongoose from 'mongoose'
import path from 'path'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import { logger } from './utils/logger.js'
import authRoutes from './routes/auth.js'
import adminAuthRoutes from './routes/adminAuth.js'
import adminRevisionRoutes from './routes/adminRevision.js'
import adminQuestionsRoutes from './routes/adminQuestions.js'
import adminConduiteRoutes from './routes/adminConduite.js'
import adminReservationsRoutes from './routes/adminReservations.js'
import adminUsersRoutes from './routes/adminUsers.js'
import adminDashboardRoutes from './routes/adminDashboard.js'
import contentRoutes from './routes/content.js'
import practiceExamsRoutes from './routes/practiceExams.js'
import ecodepermisExamsRoutes from './routes/ecodepermisExams.js'
import contentConduiteRoutes from './routes/contentConduite.js'
import reservationsRoutes from './routes/reservations.js'
import adminPracticeExamsRoutes from './routes/adminPracticeExams.js'
import adminEcodepermisExamsRoutes from './routes/adminEcodepermisExams.js'
import aiTutorRoutes from './routes/aiTutor.js'
import notificationsRoutes from './routes/notifications.js'
import announcementsRoutes from './routes/announcements.js'
import adminAnnouncementsRoutes from './routes/adminAnnouncements.js'
import fedapayWebhooksRoutes from './routes/fedapayWebhooks.js'
import accessRequestsRoutes from './routes/accessRequests.js'
import paymentsRoutes from './routes/payments.js'
import adminAccessRequestsRoutes from './routes/adminAccessRequests.js'
import promoCodesRoutes from './routes/promoCodes.js'
import adminPromoCodesRoutes from './routes/adminPromoCodes.js'
import { fedapayKeyFingerprint, isFedaPayConfigured } from './services/fedapay.js'
import { sendMediaAsset } from './middleware/upload.js'
import { ensureReservationIndexes } from './models/Reservation.js'
import { ensureAccessModulePricing, expireDueAccessRequests } from './utils/accessRequests.js'
import { expireStalePendingReservations } from './utils/reservationPayments.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000
/** Build web Vite copié ici au deploy Render (voir render.yaml). */
const webDistPath = path.join(__dirname, '../web-dist')
const serveWebApp = fs.existsSync(path.join(webDistPath, 'index.html'))

function parseAllowedOrigins() {
  const clean = (value) =>
    String(value || '')
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\/$/, '')
  const fromList = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(clean)
    .filter(Boolean)
  const singles = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].map(clean).filter(Boolean)
  // Origines de prod connues (filet de sécurité si env incomplet)
  const defaults = [
    'https://monpermis-admin.onrender.com',
    'https://monpermis-web.onrender.com',
    'https://monpermis-api.onrender.com',
  ]
  return [...new Set([...fromList, ...singles, ...defaults])]
}

const allowedOrigins = parseAllowedOrigins()
logger.info('CORS origines', { origins: allowedOrigins })

function isOriginAllowed(origin) {
  if (!origin) return false
  if (allowedOrigins.includes(origin)) return true
  return false
}

// Render / reverse-proxy : sans ça, toutes les requêtes partagent la même IP → 429 globaux
app.set('trust proxy', 1)

// CORS manuel — plus fiable qu’avec Express 5 + package cors sur OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization',
    )
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  return next()
})
// Security headers (CSP off : SPA Vite + PWA sur le même host que l’API)
// COOP same-origin casse le popup Google Sign-In → allow-popups obligatoire
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: false,
  }),
)
// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Trop de tentatives. R\u00e9essayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Math.max(120, Number(process.env.API_RATE_LIMIT_MAX) || 900),
  message: { success: false, error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
// Corps brut requis pour vérifier la signature HMAC des webhooks FedaPay.
// Toujours raw sur ce path (ne dépend pas du Content-Type exact de FedaPay).
app.use(
  '/api/webhooks/fedapay',
  express.raw({ type: () => true }),
  fedapayWebhooksRoutes,
)
app.use(express.json())
// Disque local d’abord, puis MongoDB (Render n’a pas de disque persistant).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
app.get('/uploads/:kind/:filename', sendMediaAsset)

app.get('/api/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1
  const fingerprint = fedapayKeyFingerprint()
  const webhookSecretSet = Boolean(String(process.env.FEDAPAY_WEBHOOK_SECRET || '').trim())
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    message: dbReady
      ? 'API Monpermis.bj op\u00e9rationnelle'
      : 'Service temporairement indisponible',
    db: dbReady ? 'connected' : 'disconnected',
    fedapay: isFedaPayConfigured() ? 'configured' : 'missing',
    fedapayEnvironment: process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live',
    fedapayKeyHint: fingerprint.secretSuffix ? `…${fingerprint.secretSuffix}` : null,
    fedapayWebhookSecret: webhookSecretSet ? 'configured' : 'missing',
    mobileMoneyModes: { mtn: 'mtn_open', moov: 'moov', celtiis: 'sbin' },
  })
})

// Un seul limiteur API (évite le double comptage sur les mounts /admin/revision répétés).
// Les routes /api/admin/* (hors login) sont déjà protégées par JWT → pas de rate-limit ici.
app.use('/api', (req, res, next) => {
  if (
    req.path.startsWith('/auth') ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/webhooks') ||
    req.path === '/health'
  ) {
    return next()
  }
  return apiLimiter(req, res, next)
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/admin/auth', authLimiter, adminAuthRoutes)
app.use('/api/admin/revision', adminRevisionRoutes)
app.use('/api/admin/revision', adminQuestionsRoutes)
app.use('/api/admin/revision', adminPracticeExamsRoutes)
app.use('/api/admin/ecodepermis', adminEcodepermisExamsRoutes)
app.use('/api/admin/conduite', adminConduiteRoutes)
app.use('/api/admin/conduite', adminReservationsRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/access-requests', adminAccessRequestsRoutes)
app.use('/api/access-requests', accessRequestsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/admin/promo-codes', adminPromoCodesRoutes)
app.use('/api/promo-codes', promoCodesRoutes)
app.use('/api/ai', aiTutorRoutes)
app.use('/api/content/revision', contentRoutes)
app.use('/api/content/revision', practiceExamsRoutes)
app.use('/api/content/ecodepermis', ecodepermisExamsRoutes)
app.use('/api/content/conduite', contentConduiteRoutes)
app.use('/api/reservations', reservationsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/content/announcements', announcementsRoutes)
app.use('/api/admin/announcements', adminAnnouncementsRoutes)

// Hors SW (navigateFallback ignore /api) : purge cache client puis redirige
app.get('/api/client-reset', (req, res) => {
  const next = typeof req.query.next === 'string' && req.query.next.startsWith('/')
    ? req.query.next
    : '/code-de-la-route'
  res.setHeader('Clear-Site-Data', '"cache", "storage"')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.type('html').send(`<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="Cache-Control" content="no-store"/>
<title>Mise à jour Monpermis…</title>
</head><body style="margin:0;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#001030;color:#fff;text-align:center;padding:2rem">
<div>
  <p style="font-size:1.25rem;font-weight:700;margin:0 0 .5rem">Cache vidé</p>
  <p style="opacity:.85;margin:0 0 1.25rem">Chargement de la nouvelle version…</p>
  <p style="font-size:.85rem;opacity:.55">Si rien ne se passe, <a href="${next}" style="color:#ffc000">cliquez ici</a>.</p>
</div>
<script>
(async function () {
  try {
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(function (r) { return r.unregister() }))
    }
    if (window.caches) {
      var keys = await caches.keys()
      await Promise.all(keys.map(function (k) { return caches.delete(k) }))
    }
    try { localStorage.removeItem('vite-plugin-pwa') } catch (e) {}
  } catch (e) {}
  setTimeout(function () {
    var dest = ${JSON.stringify(next)}
    dest += (dest.indexOf('?') >= 0 ? '&' : '?') + 'v=afrique3'
    location.replace(dest)
  }, 400)
})()
</script>
</body></html>`)
})

// App web apprenant (SPA) — filet si monpermis-web static est indisponible
if (serveWebApp) {
  logger.info('SPA web servie depuis web-dist', { path: webDistPath })

  // Tue les anciens SW : 404 + Clear-Site-Data (ne jamais renvoyer index.html pour /sw.js)
  app.get(['/sw.js', '/registerSW.js', '/manifest.webmanifest'], (req, res) => {
    res.setHeader('Clear-Site-Data', '"cache", "storage"')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(404).type('text/plain').send('PWA disabled')
  })
  app.get(/^\/workbox-.*\.js$/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(404).type('text/plain').send('PWA disabled')
  })

  app.use(
    '/assets',
    express.static(path.join(webDistPath, 'assets'), {
      maxAge: '1h',
      immutable: false,
      fallthrough: false,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate')
      },
    }),
  )
  app.use(
    express.static(webDistPath, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        const base = path.basename(filePath)
        if (base === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
          res.setHeader('Clear-Site-Data', '"cache"')
        } else if (/\.(jpe?g|png|webp|gif|svg)$/i.test(base)) {
          // Images du diaporama / cartes : éviter un cache navigateur trop long
          res.setHeader('Cache-Control', 'public, max-age=120, must-revalidate')
        }
      },
    }),
  )

  app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)|\/assets(?:\/|$)).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    // Aide les navigateurs à lâcher les vieux caches HTML/SW
    if (req.query.purge === '1') {
      res.setHeader('Clear-Site-Data', '"cache", "storage"')
    }
    return res.sendFile(path.join(webDistPath, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
} else {
  logger.info('SPA web absente (web-dist) — API seule')
}

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  })
  logger.info('Connecté à MongoDB Atlas')
  await ensureReservationIndexes()
  try {
    const pricingSeed = await ensureAccessModulePricing()
    if (pricingSeed.created > 0) {
      logger.info(`Tarifs modules d'accès initialisés (${pricingSeed.created})`)
    }
    await expireDueAccessRequests()
    await expireStalePendingReservations()

    setInterval(async () => {
      try {
        await expireDueAccessRequests()
      } catch (e) {
        logger.error('Erreur vérification expirations', { error: e.message })
      }
      try {
        await expireStalePendingReservations()
      } catch (e) {
        logger.error('Erreur libération réservations en attente de paiement', { error: e.message })
      }
    }, 15 * 60 * 1000)
  } catch (err) {
    logger.error('Initialisation accès modules', { error: err.message })
  }
}

async function start() {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Serveur démarré sur http://localhost:${PORT}`)
    if (isFedaPayConfigured()) {
      logger.info('FedaPay configuré', {
        environment: process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live',
        callback: process.env.FEDAPAY_CALLBACK_URL || process.env.CLIENT_URL || '(défaut)',
        webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET ? 'présent' : 'manquant',
      })
    } else {
      logger.error('FedaPay NON configuré — les paiements en ligne échoueront')
    }
  })

  try {
    await connectMongo()
  } catch (error) {
    logger.error('MongoDB inaccessible au démarrage', { error: error.message })
    if (error?.name === 'MongooseServerSelectionError') {
      logger.error(
        '→ Autorisez votre IP actuelle dans MongoDB Atlas',
      )
    }
    logger.info('Nouvelle tentative de connexion dans 15s')
    let retryTimer
    function scheduleRetry() {
      retryTimer = setTimeout(async () => {
        if (mongoose.connection.readyState === 1) {
          clearTimeout(retryTimer)
          return
        }
        try {
          await connectMongo()
        } catch (err) {
          logger.error('Nouvelle tentative MongoDB échouée', { error: err.message })
          scheduleRetry()
        }
      }, 15000)
    }
    scheduleRetry()
  }
}

start()
