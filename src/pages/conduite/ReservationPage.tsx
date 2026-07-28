import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, Minus, Plus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createReservation,
  fetchAvailableCreneaux,
  fetchPublicMoniteurs,
  lockCreneauxRange,
  quoteReservation,
  ReservationError,
  type MoniteurPublic,
  type ReservationItem,
  type ReservationQuote,
  type ReservationSlot,
} from '../../api/reservations'
import { PageNavbar } from '../../components/PageNavbar'
import { ReservationMobileMoneyCheckout } from '../../components/ReservationMobileMoneyCheckout'
import { useAuth } from '../../hooks/useAuth'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'
import '../../styles/reservation.css'

type Step = 'moniteur' | 'calendar' | 'payment' | 'success'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

function formatPrice(amount: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  )
}

export function ReservationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>()
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [days, setDays] = useState<{ date: string; creneaux: ReservationSlot[] }[]>([])
  const [hours, setHours] = useState(1)
  const [lockedRange, setLockedRange] = useState<ReservationSlot[]>([])
  const [quote, setQuote] = useState<ReservationQuote | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [showMobileMoney, setShowMobileMoney] = useState(false)

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || lockedRange[0]?.vehicleType || 'voiture'

  const loadMoniteurs = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchPublicMoniteurs()
      setMoniteurs(data.moniteurs)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Moniteurs indisponibles')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadCreneaux = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchAvailableCreneaux({ moniteurId })
      setDays(data.days)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneaux indisponibles')
    } finally {
      setBusy(false)
    }
  }, [moniteurId])

  useEffect(() => {
    void loadMoniteurs()
  }, [loadMoniteurs])

  useEffect(() => {
    const fromQuery = searchParams.get('moniteurId')
    if (fromQuery) {
      setMoniteurId(fromQuery)
      setStep('calendar')
    }
  }, [searchParams])

  useEffect(() => {
    if (step === 'calendar') void loadCreneaux()
  }, [step, loadCreneaux])

  const onSelectSlot = async (slot: ReservationSlot) => {
    if (!slot.available || !moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const locked = await lockCreneauxRange({
        moniteurId,
        startCreneauId: String(slot.id),
        hours,
      })
      setLockedRange(locked.creneaux)
      const quoteData = await quoteReservation(locked.creneaux.map((c) => String(c.id)))
      setQuote(quoteData)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneau indisponible')
      void loadCreneaux()
    } finally {
      setBusy(false)
    }
  }

  const onSuccessReservations = (reservations: ReservationItem[], link?: string, calendar?: { title: string; date: string; startTime: string; endTime: string }) => {
    setWhatsappLink(link || '')
    if (calendar) {
      const start = `${calendar.date.replace(/-/g, '')}T${calendar.startTime.replace(':', '')}00`
      const end = `${calendar.date.replace(/-/g, '')}T${calendar.endTime.replace(':', '')}00`
      setCalendarUrl(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          calendar.title,
        )}&dates=${start}/${end}`,
      )
    }
    void reservations
    setStep('success')
  }

  const onPaySolde = async () => {
    if (!lockedRange.length || !moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await createReservation({
        creneauIds: lockedRange.map((c) => String(c.id)),
        vehicleType,
        moniteurId,
        paymentMethod: 'solde',
      })
      onSuccessReservations(data.reservations || [], data.whatsappLink, data.calendarHint)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Réservation impossible')
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Nouvelle séance"
          icon={<CalendarPlus size={22} />}
          tone="drive"
          onBack={() => navigate('/conduite')}
        />

        <div className="auth-card learner-card reservation-card">
          {error ? <p className="form-error">{error}</p> : null}

          {step === 'moniteur' ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <h2>Réserver votre prochaine séance</h2>
                <p>
                  Choisissez d’abord le moniteur avec lequel vous souhaitez conduire. Touchez une
                  carte pour consulter son profil complet (photos, vidéos, véhicule) avant de
                  décider.
                </p>
              </div>

              <h3 className="section-title">1. Choisissez un moniteur</h3>
              {busy ? <p className="subtitle">Chargement des moniteurs…</p> : null}
              {!busy && moniteurs.length === 0 ? (
                <p className="subtitle">
                  Aucun moniteur n’est disponible pour le moment. Revenez plus tard ou
                  contactez l’auto-école.
                </p>
              ) : null}
              <div className="moniteur-choice-list">
                {moniteurs.map((moniteur) => {
                  const typeLabel = moniteur.vehicleTypes?.[0] || 'Véhicule'
                  return (
                    <button
                      key={moniteur.id}
                      type="button"
                      className="moniteur-choice"
                      onClick={() => navigate(`/conduite/moniteurs/${moniteur.id}`)}
                    >
                      {moniteur.vehiclePhotoUrl ? (
                        <img src={mediaSrc(moniteur.vehiclePhotoUrl)} alt="" />
                      ) : (
                        <div className="moniteur-choice-placeholder">Véhicule</div>
                      )}
                      <span className="moniteur-choice-meta">
                        <strong>{moniteur.fullName}</strong>
                        <small>{moniteur.vehicleBrand || 'Marque non renseignée'}</small>
                        <em>{typeLabel}</em>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="reservation-tips">
                <h4>À savoir avant de réserver</h4>
                <ul>
                  <li>Présentez-vous à l’heure avec vos documents d’identité.</li>
                  <li>Vous pouvez annuler jusqu’à 24 h avant la séance, avec une justification.</li>
                  <li>
                    Payez avec votre solde d’heures prépayées, ou directement par Mobile Money
                    pour cette réservation.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}

          {step === 'calendar' ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <h2>Choisissez un créneau libre</h2>
                <p>
                  Les horaires verts sont disponibles. Sélectionnez le nombre d’heures souhaité,
                  puis l’heure de départ : les créneaux consécutifs nécessaires seront réservés
                  pour vous le temps de confirmer.
                </p>
              </div>

              <h3 className="section-title">2. Créneaux disponibles</h3>
              {selectedMoniteur ? (
                <div className="moniteur-recap-strip">
                  {selectedMoniteur.vehiclePhotoUrl ? (
                    <img src={mediaSrc(selectedMoniteur.vehiclePhotoUrl)} alt="" />
                  ) : null}
                  <div>
                    <strong>{selectedMoniteur.fullName}</strong>
                    <small>
                      {selectedMoniteur.vehicleBrand || 'Véhicule'} · {vehicleType}
                    </small>
                  </div>
                </div>
              ) : null}

              <div className="hours-stepper">
                <span>Nombre d’heures</span>
                <div className="hours-stepper-control">
                  <button
                    type="button"
                    onClick={() => setHours((h) => Math.max(1, h - 1))}
                    disabled={hours <= 1}
                  >
                    <Minus size={16} />
                  </button>
                  <strong>{hours}</strong>
                  <button
                    type="button"
                    onClick={() => setHours((h) => Math.min(6, h + 1))}
                    disabled={hours >= 6}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {busy ? <p className="subtitle">Chargement des créneaux…</p> : null}
              {!busy && days.length === 0 ? (
                <p className="subtitle">
                  Aucun créneau libre sur cette période. Changez de moniteur ou réessayez
                  plus tard.
                </p>
              ) : null}
              {days.map((day) => (
                <div key={day.date} className="day-card">
                  <strong>{formatDateLabel(day.date)}</strong>
                  <div className="slots-row">
                    {day.creneaux.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.available || busy}
                        className={`slot-btn${!slot.available ? ' is-unavailable' : ''}`}
                        onClick={() => void onSelectSlot(slot)}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" className="btn-outline" onClick={() => setStep('moniteur')}>
                Changer de moniteur
              </button>
            </div>
          ) : null}

          {step === 'payment' && quote ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <h2>Confirmez votre réservation</h2>
                <p>Une facture est générée automatiquement à partir de votre sélection.</p>
              </div>

              <h3 className="section-title">3. Facture</h3>
              <div className="recap-card">
                {quote.moniteur?.vehiclePhotoUrl ? (
                  <img className="recap-photo" src={mediaSrc(quote.moniteur.vehiclePhotoUrl)} alt="" />
                ) : null}
                <p>
                  {quote.date} · {quote.startTime} – {quote.endTime}
                </p>
                <p>
                  {quote.moniteur?.fullName || 'Moniteur'} ·{' '}
                  {quote.moniteur?.vehicleBrand || 'Véhicule'} · {quote.hours} h
                </p>
                <p className="price">{formatPrice(quote.amount, quote.currency)}</p>
              </div>

              <div className="payment-choice">
                <button
                  type="button"
                  className="btn-primary reservation-calendar-btn"
                  disabled={busy || !quote.soldeSuffisant}
                  onClick={() => void onPaySolde()}
                >
                  {busy
                    ? 'Confirmation…'
                    : `Payer avec mon solde (${quote.soldeHeures} h disponible${quote.soldeHeures > 1 ? 's' : ''})`}
                </button>
                {!quote.soldeSuffisant ? (
                  <p className="subtitle payment-choice-hint">
                    Solde insuffisant pour ces {quote.hours} h.{' '}
                    <a href="/abonnement">Acheter un pack d’heures</a> ou payez directement
                    ci-dessous.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn-outline reservation-calendar-btn"
                  disabled={busy}
                  onClick={() => setShowMobileMoney(true)}
                >
                  Payer maintenant (Mobile Money)
                </button>
              </div>

              <button type="button" className="btn-outline" onClick={() => setStep('calendar')}>
                Changer d’horaire
              </button>
            </div>
          ) : null}

          {step === 'success' ? (
            <div className="success-box reservation-step">
              <div className="success-icon">
                <Check size={28} />
              </div>
              <h2>Séance réservée</h2>
              <p className="subtitle">
                Votre séance est confirmée et apparaît dans votre espace Conduite.
              </p>
              {calendarUrl ? (
                <a className="btn-outline" href={calendarUrl} target="_blank" rel="noreferrer">
                  Ajouter à mon agenda
                </a>
              ) : null}
              {whatsappLink ? (
                <a className="btn-outline" href={whatsappLink} target="_blank" rel="noreferrer">
                  Notifier par WhatsApp
                </a>
              ) : null}
              <button type="button" className="btn-primary" onClick={() => navigate('/conduite')}>
                Retour au tableau de bord
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {quote && moniteurId ? (
        <ReservationMobileMoneyCheckout
          open={showMobileMoney}
          quote={quote}
          creneauIds={lockedRange.map((c) => String(c.id))}
          vehicleType={vehicleType}
          moniteurId={moniteurId}
          defaultPhone={user?.phone || ''}
          onClose={() => setShowMobileMoney(false)}
          onSuccess={(reservations) => {
            setShowMobileMoney(false)
            onSuccessReservations(reservations)
          }}
        />
      ) : null}
    </div>
  )
}
