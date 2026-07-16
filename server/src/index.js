import 'dotenv/config'
import express from 'express'
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
import adminSubscriptionsRoutes from './routes/adminSubscriptions.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import fedapayWebhooksRoutes from './routes/fedapayWebhooks.js'
import { ensureReservationIndexes } from './models/Reservation.js'
import {
  ensureDefaultPlans,
  expireDueSubscriptions,
  grantGraceToUsersWithoutSubscription,
  notifyExpiringSubscriptions,
} from './utils/subscriptions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 5000

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
// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Trop de tentatives. R\u00e9essayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
// Corps brut requis pour vérifier la signature HMAC des webhooks FedaPay
app.use(
  '/api/webhooks/fedapay',
  express.raw({ type: 'application/json' }),
  fedapayWebhooksRoutes,
)
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.get('/api/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1
  res.status(dbReady ? 200 : 503).json({
    success: dbReady,
    message: dbReady
      ? 'API Monpermis.bj op\u00e9rationnelle'
      : 'Service temporairement indisponible',
    db: dbReady ? 'connected' : 'disconnected',
  })
})

app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/admin/auth', authLimiter, adminAuthRoutes)
app.use('/api/admin/revision', apiLimiter, adminRevisionRoutes)
app.use('/api/admin/revision', apiLimiter, adminQuestionsRoutes)
app.use('/api/admin/revision', apiLimiter, adminPracticeExamsRoutes)
app.use('/api/admin/ecodepermis', apiLimiter, adminEcodepermisExamsRoutes)
app.use('/api/admin/conduite', apiLimiter, adminConduiteRoutes)
app.use('/api/admin/conduite', apiLimiter, adminReservationsRoutes)
app.use('/api/admin/users', apiLimiter, adminUsersRoutes)
app.use('/api/admin/dashboard', apiLimiter, adminDashboardRoutes)
app.use('/api/admin/subscriptions', apiLimiter, adminSubscriptionsRoutes)
app.use('/api/subscriptions', apiLimiter, subscriptionsRoutes)
app.use('/api/content/revision', apiLimiter, contentRoutes)
app.use('/api/content/revision', apiLimiter, practiceExamsRoutes)
app.use('/api/content/ecodepermis', apiLimiter, ecodepermisExamsRoutes)
app.use('/api/content/conduite', apiLimiter, contentConduiteRoutes)
app.use('/api/reservations', apiLimiter, reservationsRoutes)

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  })
  logger.info('Connecté à MongoDB Atlas')
  await ensureReservationIndexes()
  try {
    await ensureDefaultPlans()
    const grace = await grantGraceToUsersWithoutSubscription()
    if (grace.granted > 0) {
      logger.info(`Période de grâce attribuée à ${grace.granted} apprenant(s)`)
    }
    await expireDueSubscriptions()
    const expiring = await notifyExpiringSubscriptions()
    if (expiring.sent > 0) {
      logger.info(`Avertissements expiration envoyés à ${expiring.sent} apprenant(s)`)
    }
    setInterval(async () => {
      try {
        await expireDueSubscriptions()
        const result = await notifyExpiringSubscriptions()
        if (result.sent > 0) logger.info(`Avertissements expiration envoyés à ${result.sent} apprenant(s)`)
      } catch (e) {
        logger.error('Erreur vérification expirations', { error: e.message })
      }
    }, 15 * 60 * 1000)
  } catch (err) {
    logger.error('Initialisation abonnements', { error: err.message })
  }
}

async function start() {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Serveur démarré sur http://localhost:${PORT}`)
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
