import { useCallback, useEffect, useState } from 'react'
import { BookOpen, CalendarPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  cancelReservation,
  fetchDrivingDashboard,
  ReservationError,
  type DrivingProgress,
  type ReservationItem,
} from '../api/reservations'
import { fetchAccessMe, fetchAccessModules, computeModuleAmount, type AccessMe, type AccessModule, type CheckoutCartItem } from '../api/accessRequests'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'
import '../styles/reservation.css'

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ConduitePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [progress, setProgress] = useState<DrivingProgress | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [pickVideos, setPickVideos] = useState(true)
  const [pickHours, setPickHours] = useState(false)
  const [hoursQty, setHoursQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchDrivingDashboard()
      setProgress(data.progress)
      setUpcoming(data.upcoming || [])
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void Promise.all([fetchAccessMe(), fetchAccessModules()])
      .then(([me, catalog]) => {
        setAccessMe(me)
        setModules(catalog)
      })
      .catch(() => {
        setAccessMe(null)
        setModules([])
      })
      .finally(() => setAccessLoading(false))
  }, [user])

  const conduiteUnlocked = Boolean(
    accessMe &&
      (accessMe.access.conduite_videos ||
        accessMe.access.conduite_heures ||
        accessMe.user.soldeHeures > 0),
  )

  useEffect(() => {
    if (conduiteUnlocked) void load()
  }, [conduiteUnlocked, load])

  const videosModule = modules.find((m) => m.key === 'conduite_videos')
  const hoursModule = modules.find((m) => m.key === 'conduite_heures')
  const videosPrice = videosModule ? computeModuleAmount('conduite_videos', videosModule.price, 1) : 1500
  const hoursPrice = hoursModule
    ? computeModuleAmount('conduite_heures', hoursModule.price, hoursQty)
    : hoursQty >= 2
      ? hoursQty * 5000 - 1000
      : hoursQty * 5000

  const cartItems: CheckoutCartItem[] = []
  if (pickVideos && !accessMe?.access.conduite_videos) {
    cartItems.push({ module: 'conduite_videos', quantity: 1 })
  }
  if (pickHours) {
    cartItems.push({ module: 'conduite_heures', quantity: hoursQty })
  }
  const cartTotal =
    (pickVideos && !accessMe?.access.conduite_videos ? videosPrice : 0) + (pickHours ? hoursPrice : 0)

  const openCancel = (item: ReservationItem) => {
    setError(null)
    setCancelReason('')
    setCancelTarget(item)
  }

  const submitCancel = async () => {
    if (!cancelTarget) return
    const reason = cancelReason.trim()
    if (reason.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères')
      return
    }
    setCancelling(true)
    setError(null)
    try {
      await cancelReservation(String(cancelTarget.id), reason)
      setCancelTarget(null)
      setCancelReason('')
      await load()
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Annulation impossible')
    } finally {
      setCancelling(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Conduite"
          icon={<DriveModuleIcon size={28} />}
          tone="drive"
          onBack={() => navigate('/accueil')}
        />

        {accessLoading ? (
          <div className="auth-card learner-card learner-empty">
            <p>Vérification de votre accès…</p>
          </div>
        ) : !conduiteUnlocked ? (
          <div className="auth-card learner-card learner-empty subscription-locked-state">
            <BookOpen size={32} aria-hidden="true" />
            <h2>Choisir vos accès conduite</h2>
            <p>Sélectionnez une ou deux offres. Chaque abonnement est indépendant.</p>
            <div className="offer-pick-list">
              {!accessMe?.access.conduite_videos ? (
                <button
                  type="button"
                  className={`offer-pick${pickVideos ? ' is-selected' : ''}`}
                  onClick={() => setPickVideos((v) => !v)}
                >
                  <h3>Cours vidéo de conduite</h3>
                  <p>{formatPrice(videosPrice)} / mois</p>
                </button>
              ) : null}
              <button
                type="button"
                className={`offer-pick${pickHours ? ' is-selected' : ''}`}
                onClick={() => setPickHours((v) => !v)}
              >
                <h3>Heure avec moniteur</h3>
                <p>
                  {formatPrice(hoursModule?.price || 5000)} / heure
                  {hoursQty >= 2 ? ` · total ${formatPrice(hoursPrice)} (−1 000)` : ''}
                </p>
              </button>
            </div>
            {pickHours ? (
              <label className="access-quantity-field">
                Nombre d’heures
                <input
                  type="number"
                  min={1}
                  value={hoursQty}
                  onChange={(event) => setHoursQty(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
            ) : null}
            <button
              type="button"
              className="btn-primary"
              disabled={cartItems.length === 0}
              onClick={() => setCheckoutOpen(true)}
            >
              Payer {formatPrice(cartTotal)}
            </button>
            <MobileMoneyCheckout
              open={checkoutOpen}
              items={cartItems}
              modules={modules}
              defaultPhone={user.phone}
              onClose={() => setCheckoutOpen(false)}
              onSuccess={(access) => {
                setAccessMe(access)
                setCheckoutOpen(false)
              }}
            />
          </div>
        ) : (
          <>
        <header className="auth-header learner-header learner-anim-header">
          <div className="learner-courses-accents" aria-hidden="true">
            <span className="learner-accent learner-accent-green" />
            <span className="learner-accent learner-accent-gold" />
            <span className="learner-accent learner-accent-navy" />
          </div>
          <p>Tableau de bord, réservations et leçons pratiques.</p>
        </header>

        <div className="auth-card learner-card conduite-card">
          {error ? <p className="form-error">{error}</p> : null}

          <div className="conduite-top-row learner-anim-item" style={{ animationDelay: '0.12s' }}>
            {progress ? (
              <div className="progress-card">
                <strong>
                  Progression : {progress.heuresEffectuees} / {progress.heuresObjectif} h
                </strong>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                </div>
                <small>Solde disponible : {progress.soldeHeures} h</small>
              </div>
            ) : null}

            <div className="upcoming-block">
              <h3 className="section-title">Mes réservations</h3>
              {upcoming.length === 0 ? (
                <p className="subtitle">Aucune séance réservée pour le moment.</p>
              ) : (
                <ul className="upcoming-list">
                  {upcoming.map((item) => (
                    <li key={String(item.id)}>
                      <div className="upcoming-item-main">
                        <strong>
                          {item.creneau
                            ? `${item.creneau.date} · ${item.creneau.startTime}`
                            : 'Séance'}
                        </strong>
                        <span>
                          {item.moniteur?.fullName || 'Moniteur'} · {statusLabel(item)}
                        </span>
                      </div>
                      {item.canCancel ? (
                        <button
                          type="button"
                          className="upcoming-cancel-btn"
                          onClick={() => openCancel(item)}
                        >
                          Annuler
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="conduite-actions-row learner-anim-item" style={{ animationDelay: '0.18s' }}>
            <button
              type="button"
              className="conduite-action conduite-action-reserve"
              onClick={() => navigate('/conduite/reservation')}
            >
              <span className="conduite-action-icon" aria-hidden="true">
                <CalendarPlus size={22} />
              </span>
              <span className="conduite-action-copy">
                <strong>Réserver</strong>
                <small>Choisir un créneau avec un moniteur</small>
              </span>
            </button>
            <button
              type="button"
              className="conduite-action conduite-action-lessons"
              onClick={() => navigate('/conduite/lecons')}
            >
              <span className="conduite-action-icon" aria-hidden="true">
                <BookOpen size={22} />
              </span>
              <span className="conduite-action-copy">
                <strong>Leçons</strong>
                <small>Manœuvres, circulation et examen</small>
              </span>
            </button>
          </div>

          <div className="conduite-copy learner-anim-item" style={{ animationDelay: '0.22s' }}>
            <h2>Votre parcours de conduite</h2>
            <p>
              Bienvenue dans l’espace conduite de Monpermis. Ici, vous suivez vos heures
              pratiques, réservez vos séances avec un moniteur et consultez les leçons pour
              progresser étape par étape jusqu’à l’examen.
            </p>
            <p>
              Vous pouvez annuler une séance jusqu’à 24 h avant, en indiquant une
              justification. L’administration est informée du motif.
            </p>
          </div>
        </div>
          </>
        )}
      </div>

      {subscription?.accessConduite && cancelTarget ? (
        <div
          className="cancel-modal-backdrop"
          role="presentation"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="cancel-modal-title">Annuler la séance</h3>
            <p className="subtitle">
              {cancelTarget.creneau
                ? `${cancelTarget.creneau.date} · ${cancelTarget.creneau.startTime}`
                : 'Séance'}{' '}
              — {cancelTarget.moniteur?.fullName || 'Moniteur'}
            </p>
            <label className="field-label" htmlFor="cancel-reason">
              Justification (obligatoire)
            </label>
            <textarea
              id="cancel-reason"
              className="field-input cancel-reason-input"
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex. Empêchement familial, maladie, problème de transport…"
              maxLength={500}
              disabled={cancelling}
            />
            <div className="cancel-modal-actions">
              <button
                type="button"
                className="btn-outline"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={cancelling || cancelReason.trim().length < 5}
                onClick={() => void submitCancel()}
              >
                {cancelling ? 'Annulation…' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
