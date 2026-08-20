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
import { fetchAccessMe, fetchAccessModules, computeModuleAmount, claimFreeAccess, type AccessMe, type AccessModule, type CheckoutCartItem } from '../api/accessRequests'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CancelReservationModal } from '../components/CancelReservationModal'
import { EmptyState } from '../components/EmptyState'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { Reveal } from '../components/Reveal'
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
  const [pickHours, setPickHours] = useState(false)
  const [hoursQty, setHoursQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)

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
      (accessMe.access?.conduite_videos ||
        accessMe.access?.conduite_heures ||
        (accessMe.user?.soldeHeures || 0) > 0),
  )

  useEffect(() => {
    if (conduiteUnlocked) void load()
  }, [conduiteUnlocked, load])

  const hoursModule = modules.find((m) => m.key === 'conduite_heures')
  const hoursPrice = hoursModule
    ? computeModuleAmount('conduite_heures', hoursModule.price, hoursQty)
    : hoursQty >= 2
      ? hoursQty * 5000 - 1000
      : hoursQty * 5000

  // Les cours vidéo sont gratuits : seul le pack d’heures moniteur passe au paiement.
  const cartItems: CheckoutCartItem[] = pickHours
    ? [{ module: 'conduite_heures', quantity: hoursQty }]
    : []
  const cartTotal = pickHours ? hoursPrice : 0

  const activateFreeVideos = async () => {
    setClaimingFree(true)
    setError(null)
    try {
      const result = await claimFreeAccess(['conduite_videos'])
      setAccessMe(result.access)
      navigate('/conduite/lecons')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible')
    } finally {
      setClaimingFree(false)
    }
  }

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

  if (loading || !user) return <PageLoader />

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
            <h2>Choisir tes accès conduite</h2>
            <p>
              Les cours vidéo sont gratuits. Les heures avec moniteur restent payantes.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="offer-pick-list">
              {!accessMe?.access?.conduite_videos ? (
                <button
                  type="button"
                  className="offer-pick is-selected"
                  disabled={claimingFree}
                  onClick={() => void activateFreeVideos()}
                >
                  <h3>Cours vidéo de conduite</h3>
                  {claimingFree ? <p>Activation…</p> : null}
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
            {pickHours ? (
              <button
                type="button"
                className="btn-primary"
                disabled={claimingFree}
                onClick={() => setCheckoutOpen(true)}
              >
                Payer {formatPrice(cartTotal)}
              </button>
            ) : null}
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
        <Reveal delay={80}>
        <header className="auth-header learner-header learner-anim-header">
          <div className="learner-courses-accents" aria-hidden="true">
            <span className="learner-accent learner-accent-green" />
            <span className="learner-accent learner-accent-gold" />
            <span className="learner-accent learner-accent-navy" />
          </div>
          <p>Tableau de bord, réservations et leçons pratiques.</p>
        </header>
        </Reveal>

        <Reveal delay={140}>
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
                <small>Solde heures moniteur : {progress.soldeHeures} h (≠ abonnement Code)</small>
              </div>
            ) : null}

            <div className="upcoming-block">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Mes réservations</h3>
                <button type="button" className="btn-outline" style={{ padding: '0.35rem 0.7rem', fontSize: '0.85rem' }} onClick={() => navigate('/conduite/mes-reservations')}>
                  Voir tout
                </button>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  title="Aucune séance"
                  message="Aucune séance réservée pour le moment."
                  action={
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => navigate('/conduite/reservation')}
                    >
                      Réserver
                    </button>
                  }
                />
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
        </Reveal>
          </>
        )}
      </div>

      {conduiteUnlocked && cancelTarget ? (
        <CancelReservationModal
          target={cancelTarget}
          reason={cancelReason}
          cancelling={cancelling}
          onReasonChange={setCancelReason}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => void submitCancel()}
        />
      ) : null}
    </div>
  )
}
