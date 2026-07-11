import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
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
import contentConduiteRoutes from './routes/contentConduite.js'
import reservationsRoutes from './routes/reservations.js'
import adminPracticeExamsRoutes from './routes/adminPracticeExams.js'
import adminSubscriptionsRoutes from './routes/adminSubscriptions.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import fedapayWebhooksRoutes from './routes/fedapayWebhooks.js'
import { ensureReservationIndexes } from './models/Reservation.js'
import {
  ensureDefaultPlans,
  grantGraceToUsersWithoutSubscription,
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
console.log(`CORS origines: ${allowedOrigins.join(', ') || '(aucune)'}`)

function isOriginAllowed(origin) {
  if (!origin) return false
  if (allowedOrigins.includes(origin)) return true
  // Autoriser aussi les previews Render du même compte si besoin
  if (/^https:\/\/monpermis[\w-]*\.onrender\.com$/i.test(origin)) return true
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
      ? 'API Monpermis.bj opérationnelle'
      : 'API démarrée, mais MongoDB Atlas est inaccessible',
    db: dbReady ? 'connected' : 'disconnected',
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin/auth', adminAuthRoutes)
app.use('/api/admin/revision', adminQuestionsRoutes)
app.use('/api/admin/revision', adminRevisionRoutes)
app.use('/api/admin/revision', adminPracticeExamsRoutes)
app.use('/api/admin/conduite', adminConduiteRoutes)
app.use('/api/admin/conduite', adminReservationsRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/subscriptions', adminSubscriptionsRoutes)
app.use('/api/subscriptions', subscriptionsRoutes)
app.use('/api/content/revision', contentRoutes)
app.use('/api/content/revision', practiceExamsRoutes)
app.use('/api/content/conduite', contentConduiteRoutes)
app.use('/api/reservations', reservationsRoutes)

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  })
  console.log('Connecté à MongoDB Atlas')
  await ensureReservationIndexes()
  try {
    await ensureDefaultPlans()
    const grace = await grantGraceToUsersWithoutSubscription()
    if (grace.granted > 0) {
      console.log(`Période de grâce attribuée à ${grace.granted} apprenant(s)`)
    }
  } catch (err) {
    console.error('Initialisation abonnements:', err.message)
  }
}

async function start() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`)
  })

  try {
    await connectMongo()
  } catch (error) {
    console.error('MongoDB inaccessible au démarrage:', error.message)
    if (error?.name === 'MongooseServerSelectionError') {
      console.error(
        '→ Autorisez votre IP actuelle dans MongoDB Atlas : Network Access → Add IP Address (ou 0.0.0.0/0 en local)',
      )
    }
    console.error('Nouvelle tentative de connexion dans 15s…')
    setInterval(() => {
      if (mongoose.connection.readyState === 1) return
      connectMongo().catch((err) => {
        console.error('Nouvelle tentative MongoDB échouée:', err.message)
      })
    }, 15000)
  }
}

start()
