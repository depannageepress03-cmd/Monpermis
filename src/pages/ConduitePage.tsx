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
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { DriveModuleIcon } from '../components/ModuleIcons'
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

export function ConduitePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [progress, setProgress] = useState<DrivingProgress | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

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
    void fetchSubscriptionMe()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [user])

  useEffect(() => {
    if (subscription?.accessConduite) void load()
  }, [subscription, load])

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

        {subscriptionLoading ? (
          <div className="auth-card learner-card learner-empty">
            <p>Vérification de votre accès…</p>
          </div>
        ) : !subscription?.accessConduite ? (
          <div className="auth-card learner-card learner-empty subscription-locked-state">
            <BookOpen size={32} aria-hidden="true" />
            <h2>Le module Conduite est verrouillé</h2>
            <p>Votre abonnement doit inclure l’accès aux leçons et réservations de conduite.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/abonnement')}>
              Voir les offres
            </button>
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
