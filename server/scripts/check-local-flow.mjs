/**
 * Vérifie sur l'API locale les règles de tarification, l'affichage des créneaux,
 * l'historique des paiements et la visibilité admin. À lancer après
 * `node scripts/seed-local-test.mjs`, serveur démarré.
 */
import 'dotenv/config'

const API = `http://localhost:${process.env.PORT || 5000}/api`
const ADMIN_PHONE = process.env.ADMIN_PHONE || '0147880143'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'
const pad = (n) => String(n).padStart(2, '0')
const dateStr = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function call(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

const results = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok, detail })
  console.log(`${ok ? 'OK  ' : 'KO  '} ${label}${detail ? ` — ${detail}` : ''}`)
}

const login = await call('/auth/login', {
  method: 'POST',
  body: { email: 'eleve@test.local', password: 'Test1234' },
})
const token = login.json?.data?.token
check('Connexion apprenant', Boolean(token), `HTTP ${login.status}`)
if (!token) process.exit(1)

const moniteurs = await call('/reservations/moniteurs', { token })
const moniteur = (moniteurs.json?.data?.moniteurs || []).find((m) => m.phone === '0166000010')
check('Moniteur disponible', Boolean(moniteur), moniteur ? `${moniteur.fullName} · ${moniteur.defaultPriceFcfa} FCFA/h` : `HTTP ${moniteurs.status}`)

const today = dateStr(0)
const tomorrow = dateStr(1)
const availability = await call(
  `/reservations/availability?moniteurId=${moniteur.id}&from=${today}&days=3`,
  { token },
)
const days = availability.json?.data?.days || []
const todayDay = days.find((d) => d.date === today)
const now = new Date()
const nowMinutes = now.getHours() * 60 + now.getMinutes()
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const earliestToday = todayDay ? Math.min(...todayDay.windows.map((w) => toMin(w.start))) : null

check(
  'Créneaux du jour à partir de maintenant + 1 h',
  earliestToday === null || earliestToday >= nowMinutes + 60,
  todayDay
    ? `il est ${pad(now.getHours())}:${pad(now.getMinutes())}, 1re fenêtre ${todayDay.windows[0].start}`
    : 'aucune fenêtre restante aujourd’hui',
)

const tomorrowDay = days.find((d) => d.date === tomorrow)
const windows = tomorrowDay?.windows || []
const covers = (hhmm) => windows.some((w) => toMin(w.start) <= toMin(hhmm) && toMin(hhmm) < toMin(w.end))
check('Séance payée d’un autre apprenant masquée (09:00)', !covers('09:00'), `fenêtres : ${windows.map((w) => `${w.start}-${w.end}`).join(', ')}`)
check('Séance déjà réservée masquée (10:00)', !covers('10:00'))
check('Séance en attente de paiement masquée (14:00)', !covers('14:00'))
check('Créneau libre proposé (16:00)', covers('16:00'))

const oneHour = await call('/reservations/request-slot', {
  method: 'POST',
  token,
  body: { moniteurId: moniteur.id, date: tomorrow, startTime: '16:00', endTime: '17:00' },
})
check(
  'Tarif 1 h = 5 000 FCFA',
  oneHour.json?.data?.amountFcfa === 5000,
  `amountFcfa=${oneHour.json?.data?.amountFcfa} (HTTP ${oneHour.status})`,
)

const twoHours = await call('/reservations/request-slot', {
  method: 'POST',
  token,
  body: { moniteurId: moniteur.id, date: tomorrow, startTime: '18:00', endTime: '20:00' },
})
check(
  'Tarif 2 h = 9 000 FCFA (remise −1 000)',
  twoHours.json?.data?.amountFcfa === 9000 && twoHours.json?.data?.hoursDiscountFcfa === 1000,
  `amountFcfa=${twoHours.json?.data?.amountFcfa}, remise=${twoHours.json?.data?.hoursDiscountFcfa}`,
)

const past = await call('/reservations/request-slot', {
  method: 'POST',
  token,
  body: { moniteurId: moniteur.id, date: today, startTime: '00:00', endTime: '01:00' },
})
check('Créneau passé refusé par l’API', past.status >= 400, `HTTP ${past.status} — ${past.json?.error || ''}`)

const history = await call('/payments/me', { token })
const payments = history.json?.data?.payments || []
const sub = payments.find((p) => p.kind === 'abonnement')
const resa = payments.find((p) => p.kind === 'reservation')
check('Historique : abonnement payé visible', Boolean(sub), sub ? `${sub.title} · ${sub.amount} FCFA · ${sub.status}` : `${payments.length} entrée(s)`)
check('Historique : réservation payée visible', Boolean(resa), resa ? `${resa.title} · ${resa.amount} FCFA · ${resa.status}` : '')

const adminLogin = await call('/admin/auth/login', {
  method: 'POST',
  body: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
})
const adminToken = adminLogin.json?.data?.token
check('Connexion admin', Boolean(adminToken), `HTTP ${adminLogin.status} ${adminLogin.json?.error || ''}`)

if (adminToken) {
  const list = await call('/admin/conduite/reservations?limit=50', { token: adminToken })
  const rows = list.json?.data?.reservations || []
  const paid = rows.filter((r) => r.paymentStatus === 'paid')
  const pending = rows.filter((r) => r.paymentStatus === 'pending_validation')
  check('Admin : réservations payées identifiables', paid.length >= 2, `${paid.length} payée(s), ref ex. « ${paid[0]?.paymentRef || '—'} »`)
  check('Admin : paiement en attente identifiable', pending.length >= 1, `${pending.length} en attente`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} vérifications passées`)
process.exit(failed.length === 0 ? 0 : 1)
