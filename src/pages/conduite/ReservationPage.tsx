import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useHoldTimer } from '../../hooks/useHoldTimer'
import {
  computeDrivingAmount,
  createReservation,
  earliestBookableTime,
  fetchMoniteurAvailability,
  fetchPublicMoniteurs,
  HOURS_DISCOUNT_FCFA,
  HOURS_DISCOUNT_MIN_HOURS,
  requestReservationSlot,
  ReservationError,
  type AvailabilityDay,
  type MoniteurPublic,
  type ReservationSlot,
} from '../../api/reservations'
import { fetchAccessMe } from '../../api/accessRequests'
import { PageNavbar } from '../../components/PageNavbar'
import { PageLoader } from '../../components/PageLoader'
import { ReservationMobileMoneyCheckout } from '../../components/ReservationMobileMoneyCheckout'
import { SuccessCelebration } from '../../components/SuccessCelebration'
import { useAuth } from '../../hooks/useAuth'
import { AppShell, userInitialsOf, type AppTab } from '../../components/layout/AppShell'
import { Badge, Button, Card, IconBadge, SectionTitle, StatCard } from '../../components/ui'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'
import '../../styles/reservation.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

type Step = 'moniteur' | 'calendar' | 'payment' | 'success'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

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

function estimateHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map((v) => parseInt(v, 10) || 0)
  const [eh, em] = end.split(':').map((v) => parseInt(v, 10) || 0)
  const raw = eh - sh + (em - sm) / 60
  return Math.max(0.5, Math.round(raw * 2) / 2)
}

export function ReservationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>()
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [cityFilter, setCityFilter] = useState<string>('')
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [hourlyPriceFcfa, setHourlyPriceFcfa] = useState(5000)
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selected, setSelected] = useState<ReservationSlot | null>(null)
  const [selectedAmount, setSelectedAmount] = useState(0)
  const [slotLockedUntil, setSlotLockedUntil] = useState<string | null>(null)
  const [hoursDiscount, setHoursDiscount] = useState(HOURS_DISCOUNT_FCFA)
  const [hoursDiscountMin, setHoursDiscountMin] = useState(HOURS_DISCOUNT_MIN_HOURS)
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

  const selectedHoursNeeded = useMemo(() => {
    if (!selected) return 0
    return estimateHours(selected.startTime, selected.endTime)
  }, [selected])

  const selectedDay = useMemo(
    () => availabilityDays.find((day) => day.date === selectedDate) ?? null,
    [availabilityDays, selectedDate],
  )

  /**
   * Filet de sécurité si la page reste ouverte : on retronque les fenêtres du jour
   * pour ne jamais proposer une heure devenue passée entre-temps.
   */
  const visibleWindows = useMemo(() => {
    const windows = selectedDay?.windows ?? []
    const floor = selectedDate ? earliestBookableTime(selectedDate) : null
    if (!floor) return windows
    return windows
      .map((window) => (window.start >= floor ? window : { start: floor, end: window.end }))
      .filter((window) => window.end > window.start)
  }, [selectedDay, selectedDate])

  const previewHours = useMemo(() => {
    if (!startTime || !endTime || endTime <= startTime) return 0
    return estimateHours(startTime, endTime)
  }, [startTime, endTime])

  const previewPrice = useMemo(
    () => computeDrivingAmount(hourlyPriceFcfa, previewHours, hoursDiscount, hoursDiscountMin),
    [hourlyPriceFcfa, previewHours, hoursDiscount, hoursDiscountMin],
  )

  const previewDiscount = useMemo(
    () => Math.max(0, Math.round(hourlyPriceFcfa * previewHours) - previewPrice),
    [hourlyPriceFcfa, previewHours, previewPrice],
  )

  /** Aucun créneau avant maintenant + préavis : le serveur refuserait la réservation. */
  const minTimeToday = useMemo(
    () => (selectedDate ? earliestBookableTime(selectedDate) : null),
    [selectedDate],
  )

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

  const loadAvailability = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurAvailability({ moniteurId, days: 14 })
      const days = data.days ?? []
      setAvailabilityDays(days)
      setHourlyPriceFcfa(data.hourlyPriceFcfa || data.moniteur?.defaultPriceFcfa || 5000)
      if (data.hoursDiscountFcfa !== undefined) setHoursDiscount(data.hoursDiscountFcfa)
      if (data.hoursDiscountMinHours !== undefined) setHoursDiscountMin(data.hoursDiscountMinHours)
      const first = days[0]
      if (first) {
        setSelectedDate(first.date)
        setStartTime(first.windows[0]?.start || '')
        setEndTime(first.windows[0]?.end || '')
      } else {
        setSelectedDate('')
        setStartTime('')
        setEndTime('')
      }
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Disponibilités indisponibles')
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
    if (step === 'calendar') void loadAvailability()
  }, [step, loadAvailability])

  useEffect(() => {
    if (!visibleWindows.length) return
    const first = visibleWindows[0]
    setStartTime(first.start)
    setEndTime(first.end)
  }, [visibleWindows])

  const onRequestSlot = async () => {
    if (!moniteurId || !selectedDate || !startTime || !endTime) {
      setError('Choisissez un jour et une plage horaire')
      return
    }
    if (endTime <= startTime) {
      setError('L’heure de fin doit être après l’heure de début')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await requestReservationSlot({
        moniteurId,
        date: selectedDate,
        startTime,
        endTime,
        vehicleType,
      })
      if (!data.creneau) {
        throw new ReservationError('Ce créneau vient d’être pris. Choisissez un autre horaire.')
      }
      setSelected(data.creneau)
      setSelectedAmount(data.amountFcfa ?? data.creneau.priceFcfa)
      setSlotLockedUntil(data.lockedUntil || null)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Plage indisponible')
      setSlotLockedUntil(null)
      void loadAvailability()
    } finally {
      setBusy(false)
    }
  }

  const onHoldExpired = useCallback(() => {
    setShowMobileMoney(false)
    setSelected(null)
    setSlotLockedUntil(null)
    setStep('calendar')
    setError(
      'Créneau libéré — le délai de réservation est écoulé. Choisissez un autre horaire.',
    )
    void loadAvailability()
  }, [loadAvailability])

  const hold = useHoldTimer(step === 'payment' ? slotLockedUntil : null, onHoldExpired)

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

  if (loading || !user) return <PageLoader />

  return (
    <AppShell
      activeTab="conduite"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Nouvelle séance"
          icon={<CalendarPlus size={22} />}
          tone="drive"
          onBack={() => navigate('/conduite')}
        />

        <Card className="reservation-card">
          {error ? <p className="form-error">{error}</p> : null}

          {step === 'moniteur' ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <SectionTitle>Réserver votre prochaine séance</SectionTitle>
                <p>
                  Choisissez d’abord le moniteur avec lequel vous souhaitez conduire. Touchez une
                  carte pour consulter son profil complet (photo, véhicule) avant de décider.
                </p>
                <p>
                  Ensuite, consultez ses jours libres et indiquez l’horaire que vous souhaitez
                  (de telle heure à telle heure).
                </p>
              </div>

              <SectionTitle>1. Choisissez un moniteur</SectionTitle>
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
                    <Card key={moniteur.id}>
                    <button
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
                        <em><Badge tone="orange">{typeLabel}</Badge></em>
                      </span>
                    </button>
                    </Card>
                  )
                })}
              </div>

              <Card className="reservation-tips">
                <SectionTitle>À savoir avant de réserver</SectionTitle>
                <ul>
                  <li>Présentez-vous à l’heure avec vos documents d’identité.</li>
                  <li>Vous pouvez annuler jusqu’à 24 h avant la séance, avec une justification.</li>
                  <li>
                    Après confirmation, la réservation apparaît dans votre tableau de bord
                    Conduite et chez l’administration.
                  </li>
                </ul>
              </Card>
            </div>
          ) : null}

          {step === 'calendar' ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <SectionTitle>Choisissez vos horaires</SectionTitle>
                <p>
                  Voici les jours où le moniteur est libre. Sélectionnez un jour, puis indiquez
                  de quelle heure à quelle heure vous souhaitez conduire dans sa disponibilité.
                </p>
              </div>

              <SectionTitle>2. Jour et plage horaire</SectionTitle>
              {selectedMoniteur ? (
                <Card className="moniteur-recap-strip">
                  <IconBadge icon={<CalendarPlus size={18} />} tone="orange" />
                  {moniteurPhoto(selectedMoniteur) ? (
                    <img src={mediaSrc(moniteurPhoto(selectedMoniteur))} alt="" />
                  ) : null}
                  <div>
                    <strong>{selectedMoniteur.fullName}</strong>
                    <small>
                      {selectedMoniteur.vehicleBrand || 'Véhicule'} · {vehicleType}
                    </small>
                  </div>
                </Card>
              ) : null}

              {busy ? <p className="subtitle">Chargement des disponibilités…</p> : null}
              {!busy && availabilityDays.length === 0 ? (
                <p className="subtitle">
                  Aucune disponibilité sur les 14 prochains jours pour ce moniteur.
                </p>
              ) : null}

              <div className="availability-days-row">
                {availabilityDays.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={`availability-day-chip${selectedDate === day.date ? ' is-selected' : ''}`}
                    disabled={busy}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    {formatDateLabel(day.date)}
                  </button>
                ))}
              </div>

              {selectedDay ? (
                <Card className="availability-panel">
                  <strong>{formatDateLabel(selectedDay.date)}</strong>
                  <p className="subtitle" style={{ marginTop: 6 }}>
                    Plages libres — touchez pour préremplir, puis ajustez si besoin.
                  </p>
                  {visibleWindows.length === 0 ? (
                    <p className="subtitle">
                      Plus de créneau disponible aujourd’hui. Choisissez un autre jour.
                    </p>
                  ) : null}
                  <div className="slots-row">
                    {visibleWindows.map((window) => {
                      const active = startTime === window.start && endTime === window.end
                      return (
                        <button
                          key={`${window.start}-${window.end}`}
                          type="button"
                          className={`slot-btn${active ? ' is-selected' : ''}`}
                          onClick={() => {
                            setStartTime(window.start)
                            setEndTime(window.end)
                          }}
                        >
                          {window.start} – {window.end}
                        </button>
                      )
                    })}
                  </div>
                  <div className="availability-time-row">
                    <label>
                      De
                      <input
                        type="time"
                        value={startTime}
                        min={minTimeToday ?? undefined}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </label>
                    <label>
                      À
                      <input
                        type="time"
                        value={endTime}
                        min={startTime || minTimeToday || undefined}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </label>
                  </div>
                  {minTimeToday ? (
                    <p className="subtitle">
                      Réservation possible à partir de {minTimeToday} aujourd’hui.
                    </p>
                  ) : null}
                  {previewHours > 0 ? (
                    <>
                    <StatCard
                      icon={<CalendarPlus size={14} />}
                      label={`Durée : ${previewHours} h`}
                      value={new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'XOF',
                        maximumFractionDigits: 0,
                      }).format(previewPrice)}
                    />
                    {previewDiscount > 0 ? (
                      <p className="subtitle">
                        Remise {new Intl.NumberFormat('fr-FR').format(previewDiscount)} FCFA incluse
                      </p>
                    ) : null}
                    </>
                  ) : null}
                  <Button
                    variant="cta"
                    tone="orange"
                    icon={<CalendarPlus size={16} />}
                    disabled={busy || !startTime || !endTime || visibleWindows.length === 0}
                    onClick={() => void onRequestSlot()}
                  >
                    {busy ? 'Vérification…' : 'Continuer vers le paiement'}
                  </Button>
                </Card>
              ) : null}

              <Button variant="outline" onClick={() => setStep('moniteur')}>
                Changer de moniteur
              </Button>
            </div>
          ) : null}

          {step === 'payment' && selected ? (
            <div className="reservation-step">
              <div className="reservation-intro">
                <SectionTitle>Confirmez votre réservation</SectionTitle>
                <p>Vérifiez le récapitulatif ci-dessous, puis réglez cette séance pour la confirmer.</p>
              </div>

              {hold.expired ? (
                <div className="slot-hold-banner is-expired" role="alert">
                  Créneau libéré — choisissez un autre horaire.
                </div>
              ) : hold.label ? (
                <div
                  className={`slot-hold-banner${(hold.remainingMs ?? 0) <= 60_000 ? ' is-urgent' : ''}`}
                >
                  <span>Créneau réservé pour vous</span>
                  <strong>{hold.label}</strong>
                </div>
              ) : null}

              <SectionTitle>3. Récapitulatif</SectionTitle>
              <Card className="recap-card">
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
                <StatCard
                  icon={<CalendarPlus size={14} />}
                  label="Montant à régler"
                  value={new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF',
                    maximumFractionDigits: 0,
                  }).format(selectedAmount)}
                />
                {selected.priceFcfa > selectedAmount ? (
                  <p className="subtitle">
                    Remise de {new Intl.NumberFormat('fr-FR').format(selected.priceFcfa - selectedAmount)}{' '}
                    FCFA appliquée dès {hoursDiscountMin} h.
                  </p>
                ) : null}
              </Card>

              <div className="payment-choice">
                {soldeHeures !== null && soldeHeures >= selectedHoursNeeded && selectedHoursNeeded > 0 ? (
                  <Button
                    variant="cta"
                    tone="orange"
                    className="reservation-calendar-btn"
                    disabled={busy}
                    onClick={() => void onConfirm()}
                  >
                    {busy
                      ? 'Confirmation…'
                      : `Payer avec mon solde (${soldeHeures} h disponible${soldeHeures > 1 ? 's' : ''})`}
                  </Button>
                ) : null}
                <Button
                  variant={soldeHeures !== null && soldeHeures >= selectedHoursNeeded ? 'outline' : 'cta'}
                  tone="orange"
                  className="reservation-calendar-btn"
                  disabled={busy}
                  onClick={() => setShowMobileMoney(true)}
                >
                  Payer maintenant (Mobile Money)
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSlotLockedUntil(null)
                  setSelected(null)
                  setStep('calendar')
                }}
              >
                Changer d’horaire
              </Button>
            </div>
          ) : null}

          {step === 'success' ? (
            <SuccessCelebration
              title="Séance réservée"
              subtitle={
                <>
                  <p className="subtitle">
                    Votre séance est confirmée et apparaît dans votre espace Conduite.
                  </p>
                  <p className="subtitle">
                    Pensez à ajouter la séance à votre agenda et, si besoin, à notifier votre
                    moniteur via WhatsApp.
                  </p>
                </>
              }
            >
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
              <Button variant="cta" tone="green" onClick={() => navigate('/conduite')}>
                Retour au tableau de bord
              </Button>
            </SuccessCelebration>
          ) : null}
        </Card>
      </div>

      {selected && moniteurId ? (
        <ReservationMobileMoneyCheckout
          open={showMobileMoney}
          label={`${selected.date} · ${selected.startTime} avec ${selectedMoniteur?.fullName || selected.moniteur?.fullName || 'le moniteur'}`}
          amount={selectedAmount}
          creneauId={String(selected.id)}
          vehicleType={selected.vehicleType || vehicleType}
          moniteurId={moniteurId}
          hoursNeeded={selectedHoursNeeded}
          defaultPhone={user?.phone || ''}
          onClose={() => setShowMobileMoney(false)}
          onSoldeChange={setSoldeHeures}
          onSuccess={() => {
            setShowMobileMoney(false)
            setWhatsappLink('')
            setCalendarUrl(selected ? buildCalendarUrl(selected) : '')
            setStep('success')
          }}
          onSoldeSuccess={(result) => {
            setShowMobileMoney(false)
            setWhatsappLink(result.whatsappLink || '')
            setCalendarUrl(selected ? buildCalendarUrl(selected) : '')
            setStep('success')
          }}
        />
      ) : null}
    </div>
    </AppShell>
  )
}
