import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createReservation,
  fetchAvailableCreneaux,
  fetchPublicMoniteurs,
  lockCreneau,
  ReservationError,
  type MoniteurPublic,
  type ReservationSlot,
} from '../../api/reservations'
import { fetchAccessMe } from '../../api/accessRequests'
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

/** Photo du moniteur lui-même ; à défaut, photo du véhicule. */
function moniteurPhoto(m: { photoUrl?: string; vehiclePhotoUrl?: string }) {
  return m.photoUrl || m.vehiclePhotoUrl || ''
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

export function ReservationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>()
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [cityFilter, setCityFilter] = useState<string>('')
  const [days, setDays] = useState<{ date: string; creneaux: ReservationSlot[] }[]>([])
  const [selected, setSelected] = useState<ReservationSlot | null>(null)
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')
  const [showMobileMoney, setShowMobileMoney] = useState(false)

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const cities = useMemo(
    () => Array.from(new Set(moniteurs.map((m) => m.city).filter((c): c is string => Boolean(c)))).sort(),
    [moniteurs],
  )

  const visibleMoniteurs = useMemo(
    () => (cityFilter ? moniteurs.filter((m) => m.city === cityFilter) : moniteurs),
    [moniteurs, cityFilter],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || selected?.vehicleType || 'voiture'

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
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null))
  }, [])

  useEffect(() => {
    if (step === 'calendar') void loadCreneaux()
  }, [step, loadCreneaux])

  const onSelectSlot = async (slot: ReservationSlot) => {
    if (!slot.available) return
    setBusy(true)
    setError(null)
    try {
      await lockCreneau(String(slot.id))
      setSelected(slot)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneau indisponible')
      void loadCreneaux()
    } finally {
      setBusy(false)
    }
  }

  const buildCalendarUrl = (slot: ReservationSlot) => {
    const start = `${slot.date.replace(/-/g, '')}T${slot.startTime.replace(':', '')}00`
    const end = `${slot.date.replace(/-/g, '')}T${slot.endTime.replace(':', '')}00`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      'Séance de conduite — Monpermis.bj',
    )}&dates=${start}/${end}`
  }

  const onConfirm = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      // Renouvelle le verrou juste avant confirmation (évite les échecs après attente)
      await lockCreneau(String(selected.id))
      const chosenMoniteurId = moniteurId || selected.moniteur?.id
      const data = await createReservation({
        creneauIds: [String(selected.id)],
        vehicleType: selected.vehicleType || vehicleType,
        moniteurId: chosenMoniteurId ? String(chosenMoniteurId) : undefined,
        paymentMethod: 'solde',
      })
      setWhatsappLink(data.whatsappLink || '')
      setCalendarUrl(selected ? buildCalendarUrl(selected) : '')
      setStep('success')
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
                  carte pour consulter son profil complet (photo, véhicule) avant de décider.
                </p>
                <p>
                  Une fois le moniteur sélectionné, vous pourrez consulter ses créneaux libres et
                  choisir directement celui qui vous convient.
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

              {cities.length > 1 ? (
                <div className="city-filter-row">
                  <button
                    type="button"
                    className={!cityFilter ? 'city-filter-chip is-active' : 'city-filter-chip'}
                    onClick={() => setCityFilter('')}
                  >
                    Toutes les villes
                  </button>
                  {cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      className={cityFilter === city ? 'city-filter-chip is-active' : 'city-filter-chip'}
                      onClick={() => setCityFilter(city)}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              ) : null}

              {!busy && moniteurs.length > 0 && visibleMoniteurs.length === 0 ? (
                <p className="subtitle">Aucun moniteur dans cette ville pour le moment.</p>
              ) : null}

              <div className="moniteur-choice-list">
                {visibleMoniteurs.map((moniteur) => {
                  const typeLabel = moniteur.vehicleTypes?.[0] || 'Véhicule'
                  const photo = moniteurPhoto(moniteur)
                  return (
                    <button
                      key={moniteur.id}
                      type="button"
                      className="moniteur-choice"
                      onClick={() => navigate(`/conduite/moniteurs/${moniteur.id}`)}
                    >
                      {photo ? (
                        <img src={mediaSrc(photo)} alt="" />
                      ) : (
                        <div className="moniteur-choice-placeholder">Moniteur</div>
                      )}
                      <span className="moniteur-choice-meta">
                        <strong>{moniteur.fullName}</strong>
                        <small>
                          {moniteur.city ? `${moniteur.city} · ` : ''}
                          {moniteur.vehicleBrand || 'Marque non renseignée'}
                        </small>
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
                    Après confirmation, la réservation apparaît dans votre tableau de bord
                    Conduite et chez l’administration.
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
                  Les horaires verts sont disponibles. Les créneaux grisés sont déjà pris ou
                  temporairement verrouillés par un autre élève. Sélectionnez l’horaire qui
                  vous convient : le créneau est réservé pour vous le temps de confirmer.
                </p>
              </div>

              <h3 className="section-title">2. Créneaux disponibles</h3>
              {selectedMoniteur ? (
                <div className="moniteur-recap-strip">
                  {moniteurPhoto(selectedMoniteur) ? (
                    <img src={mediaSrc(moniteurPhoto(selectedMoniteur))} alt="" />
                  ) : null}
                  <div>
                    <strong>{selectedMoniteur.fullName}</strong>
                    <small>
                      {selectedMoniteur.vehicleBrand || 'Véhicule'} · {vehicleType}
                    </small>
                  </div>
                </div>
              ) : null}
              <p className="subtitle">
                Affichage sur les 14 prochains jours pour{' '}
                {selectedMoniteur?.fullName || 'ce moniteur'}.
              </p>
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
                        className={`slot-btn${!slot.available ? ' is-unavailable' : ''}${
                          selected?.id === slot.id ? ' is-selected' : ''
                        }`}
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

          {step === 'payment' && selected ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <h2>Confirmez votre réservation</h2>
                <p>Vérifiez le récapitulatif ci-dessous, puis réglez cette séance pour la confirmer.</p>
              </div>

              <h3 className="section-title">3. Récapitulatif</h3>
              <div className="recap-card">
                {selectedMoniteur && moniteurPhoto(selectedMoniteur) ? (
                  <img className="recap-photo" src={mediaSrc(moniteurPhoto(selectedMoniteur))} alt="" />
                ) : selected.moniteur?.vehiclePhotoUrl ? (
                  <img className="recap-photo" src={mediaSrc(selected.moniteur.vehiclePhotoUrl)} alt="" />
                ) : null}
                <p>
                  {selected.date} · {selected.startTime} – {selected.endTime}
                </p>
                <p>
                  {selectedMoniteur?.fullName || selected.moniteur?.fullName || 'Moniteur'} ·{' '}
                  {selectedMoniteur?.vehicleBrand || selected.moniteur?.vehicleBrand || 'Véhicule'} ·{' '}
                  {selected.vehicleType || vehicleType}
                </p>
                <p className="price">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(selected.priceFcfa)}
                </p>
              </div>

              <div className="payment-choice">
                {soldeHeures !== null && soldeHeures > 0 ? (
                  <button
                    type="button"
                    className="btn-primary reservation-calendar-btn"
                    disabled={busy}
                    onClick={() => void onConfirm()}
                  >
                    {busy
                      ? 'Confirmation…'
                      : `Payer avec mon solde (${soldeHeures} h disponible${soldeHeures > 1 ? 's' : ''})`}
                  </button>
                ) : null}
                <button
                  type="button"
                  className={soldeHeures ? 'btn-outline reservation-calendar-btn' : 'btn-primary reservation-calendar-btn'}
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
              <p className="subtitle">
                Pensez à ajouter la séance à votre agenda et, si besoin, à notifier votre
                moniteur via WhatsApp.
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

      {selected && moniteurId ? (
        <ReservationMobileMoneyCheckout
          open={showMobileMoney}
          label={`${selected.date} · ${selected.startTime} avec ${selectedMoniteur?.fullName || selected.moniteur?.fullName || 'le moniteur'}`}
          amount={selected.priceFcfa}
          creneauId={String(selected.id)}
          vehicleType={selected.vehicleType || vehicleType}
          moniteurId={moniteurId}
          defaultPhone={user?.phone || ''}
          onClose={() => setShowMobileMoney(false)}
          onSuccess={() => {
            setShowMobileMoney(false)
            setWhatsappLink('')
            setCalendarUrl(selected ? buildCalendarUrl(selected) : '')
            setStep('success')
          }}
        />
      ) : null}
    </div>
  )
}
