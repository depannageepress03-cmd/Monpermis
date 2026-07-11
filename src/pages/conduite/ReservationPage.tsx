import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createReservation,
  fetchAvailableCreneaux,
  fetchPublicMoniteurs,
  lockCreneau,
  ReservationError,
  type MoniteurPublic,
  type ReservationSlot,
} from '../../api/reservations'
import { PageNavbar } from '../../components/PageNavbar'
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

export function ReservationPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>()
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [days, setDays] = useState<{ date: string; creneaux: ReservationSlot[] }[]>([])
  const [selected, setSelected] = useState<ReservationSlot | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [calendarUrl, setCalendarUrl] = useState('')

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || selected?.vehicleType || ''

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
      const data = await fetchAvailableCreneaux({
        ...(vehicleType ? { vehicleType } : {}),
        moniteurId,
      })
      setDays(data.days)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneaux indisponibles')
    } finally {
      setBusy(false)
    }
  }, [vehicleType, moniteurId])

  useEffect(() => {
    if (step === 'moniteur') void loadMoniteurs()
  }, [step, loadMoniteurs])

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

  const onConfirm = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      // Renouvelle le verrou juste avant confirmation (évite les échecs après attente)
      await lockCreneau(String(selected.id))
      const chosenMoniteurId = moniteurId || selected.moniteur?.id
      const data = await createReservation({
        creneauId: String(selected.id),
        vehicleType: selected.vehicleType || vehicleType || 'voiture',
        moniteurId: chosenMoniteurId ? String(chosenMoniteurId) : undefined,
        paymentRef: paymentRef.trim() || undefined,
      })
      setWhatsappLink(data.whatsappLink)
      const start = `${data.calendarHint.date.replace(/-/g, '')}T${data.calendarHint.startTime.replace(':', '')}00`
      const end = `${data.calendarHint.date.replace(/-/g, '')}T${data.calendarHint.endTime.replace(':', '')}00`
      setCalendarUrl(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          data.calendarHint.title,
        )}&dates=${start}/${end}`,
      )
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
                  Choisissez d’abord le moniteur avec lequel vous souhaitez conduire. Chaque
                  profil affiche la photo du véhicule, la marque et le type (voiture, moto,
                  etc.) pour vous aider à décider.
                </p>
                <p>
                  Une fois le moniteur sélectionné, vous pourrez consulter ses créneaux libres
                  sur les 14 prochains jours, puis confirmer la séance et transmettre votre
                  référence Mobile Money pour validation.
                </p>
              </div>

              <h3 className="section-title">1. Choisissez un moniteur</h3>
              <p className="subtitle">
                Touchez une carte pour la sélectionner. Le moniteur choisi apparaîtra en
                surbrillance avant d’ouvrir le calendrier.
              </p>
              {busy ? <p className="subtitle">Chargement des moniteurs…</p> : null}
              {!busy && moniteurs.length === 0 ? (
                <p className="subtitle">
                  Aucun moniteur n’est disponible pour le moment. Revenez plus tard ou
                  contactez l’auto-école.
                </p>
              ) : null}
              <div className="moniteur-choice-list">
                {moniteurs.map((moniteur) => {
                  const active = moniteurId === moniteur.id
                  const typeLabel = moniteur.vehicleTypes?.[0] || 'Véhicule'
                  return (
                    <button
                      key={moniteur.id}
                      type="button"
                      className={`moniteur-choice${active ? ' is-selected' : ''}`}
                      onClick={() => setMoniteurId(moniteur.id)}
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

              {selectedMoniteur ? (
                <p className="reservation-selected-hint">
                  Moniteur sélectionné : <strong>{selectedMoniteur.fullName}</strong>
                  {selectedMoniteur.vehicleBrand
                    ? ` · ${selectedMoniteur.vehicleBrand}`
                    : ''}{' '}
                  · {vehicleType || 'Véhicule'}. Vous pouvez maintenant ouvrir le calendrier.
                </p>
              ) : (
                <p className="reservation-selected-hint">
                  Sélectionnez un moniteur pour activer le bouton ci-dessous.
                </p>
              )}

              <button
                type="button"
                className="btn-primary reservation-calendar-btn"
                disabled={!moniteurId}
                onClick={() => setStep('calendar')}
              >
                Voir le calendrier
              </button>

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
            <form className="reservation-step" onSubmit={onConfirm}>
              <div className="reservation-intro">
                <h2>Confirmez et payez</h2>
                <p>
                  Vérifiez le récapitulatif ci-dessous. Indiquez la référence de votre
                  transaction Mobile Money (Moov ou MTN) pour que l’administration valide
                  le paiement. Sans référence, la demande reste en attente.
                </p>
              </div>

              <h3 className="section-title">3. Récapitulatif & paiement</h3>
              <div className="recap-card">
                {selectedMoniteur?.vehiclePhotoUrl || selected.moniteur?.vehiclePhotoUrl ? (
                  <img
                    className="recap-photo"
                    src={mediaSrc(
                      selectedMoniteur?.vehiclePhotoUrl ||
                        selected.moniteur?.vehiclePhotoUrl ||
                        '',
                    )}
                    alt=""
                  />
                ) : null}
                <p>
                  {selected.date} · {selected.startTime} – {selected.endTime}
                </p>
                <p>
                  {selectedMoniteur?.fullName || selected.moniteur?.fullName || 'Moniteur'} ·{' '}
                  {selectedMoniteur?.vehicleBrand || selected.moniteur?.vehicleBrand || 'Véhicule'} ·{' '}
                  {selected.vehicleType || vehicleType}
                </p>
                <p className="price">{selected.priceFcfa.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <label className="field-label">Référence Mobile Money</label>
              <p className="subtitle">
                Exemple : MTN-123456 ou le numéro de transaction reçu par SMS.
              </p>
              <input
                className="field-input"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Ex. MTN-123456"
              />
              <button type="submit" className="btn-primary reservation-calendar-btn" disabled={busy}>
                {busy ? 'Confirmation…' : 'Confirmer la réservation'}
              </button>
            </form>
          ) : null}

          {step === 'success' ? (
            <div className="success-box reservation-step">
              <div className="success-icon">
                <Check size={28} />
              </div>
              <h2>Séance réservée</h2>
              <p className="subtitle">
                Votre demande est enregistrée. Elle apparaît dans votre espace Conduite et
                sera traitée par l’administration pour la validation du paiement.
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
    </div>
  )
}
