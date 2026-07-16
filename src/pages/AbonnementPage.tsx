import { Check, CreditCard, Lock, LoaderCircle, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchPaymentStatus,
  fetchSubscriptionMe,
  fetchSubscriptionPlans,
  subscribeToPlan,
  syncPaymentStatus,
  SubscriptionError,
  type PaymentTransaction,
  type SubscriptionAccess,
  type SubscriptionPlan,
} from '../api/subscriptions'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
    : '—'
}

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price)
}

function paymentStatusLabel(status: PaymentTransaction['status']) {
  switch (status) {
    case 'approved':
      return 'Payé'
    case 'declined':
      return 'Refusé'
    case 'canceled':
      return 'Annulé'
    case 'failed':
      return 'Échoué'
    default:
      return 'En cours de traitement'
  }
}

export function AbonnementPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [access, setAccess] = useState<SubscriptionAccess | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [trackingPaymentId, setTrackingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [currentAccess, catalog] = await Promise.all([
        fetchSubscriptionMe(),
        fetchSubscriptionPlans(),
      ])
      setAccess(currentAccess)
      setPlans(catalog)
      return currentAccess
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Chargement impossible')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const applyPaymentResult = useCallback(
    (payment: PaymentTransaction, nextAccess: SubscriptionAccess) => {
      setAccess(nextAccess)
      if (payment.status === 'approved') {
        setSuccess('Paiement confirmé. Votre abonnement est maintenant actif.')
        setError(null)
        setTrackingPaymentId(null)
        stopPolling()
        return
      }
      if (payment.status === 'declined' || payment.status === 'canceled' || payment.status === 'failed') {
        setError(
          payment.errorMessage ||
            'Le paiement n’a pas abouti. Vous pouvez réessayer avec Mobile Money.',
        )
        setSuccess(null)
        setTrackingPaymentId(null)
        stopPolling()
        return
      }
      setTrackingPaymentId(payment.id)
      setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
    },
    [stopPolling],
  )

  const pollPayment = useCallback(
    (paymentId: string) => {
      setTrackingPaymentId(paymentId)
      stopPolling()
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const result = await fetchPaymentStatus(paymentId)
            applyPaymentResult(result.payment, result.access)
          } catch {
            /* ignore transient poll errors */
          }
        })()
      }, 4000)
    },
    [applyPaymentResult, stopPolling],
  )

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    const paymentId = searchParams.get('payment')
    if (!user || !paymentId) return

    void (async () => {
      setTrackingPaymentId(paymentId)
      setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
      try {
        const result = await syncPaymentStatus(paymentId)
        applyPaymentResult(result.payment, result.access)
        if (result.payment.status === 'pending') pollPayment(paymentId)
      } catch (err) {
        setError(err instanceof SubscriptionError ? err.message : 'Vérification du paiement impossible')
        pollPayment(paymentId)
      } finally {
        setSearchParams({}, { replace: true })
      }
    })()
  }, [user, searchParams, setSearchParams, applyPaymentResult, pollPayment])

  const openCheckout = (url: string) => {
    if (!url) {
      setError('Lien de paiement FedaPay indisponible. Réessayez dans un instant.')
      return
    }
    window.location.assign(url)
  }

  const subscribe = async (planId: string) => {
    setSubscribingPlanId(planId)
    setError(null)
    setSuccess(null)
    try {
      const result = await subscribeToPlan(planId)
      setAccess(result.access)
      setSuccess(result.message)
      if (result.payment?.status === 'approved') {
        setTrackingPaymentId(null)
        sessionStorage.removeItem('pendingPaymentId')
      } else if (result.payment?.id) {
        setTrackingPaymentId(result.payment.id)
        sessionStorage.setItem('pendingPaymentId', result.payment.id)
        openCheckout(result.payment.paymentUrl || '')
      }
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Souscription impossible')
    } finally {
      setSubscribingPlanId(null)
    }
  }

  const resumePayment = () => {
    const payment = access?.latestPayment
    if (payment?.paymentUrl && payment.status === 'pending') {
      setTrackingPaymentId(payment.id)
      openCheckout(payment.paymentUrl)
      return
    }
    setError('Aucun paiement à reprendre. Choisissez une offre pour payer.')
  }

  const refreshPayment = async () => {
    const paymentId =
      trackingPaymentId ||
      access?.latestPayment?.id ||
      sessionStorage.getItem('pendingPaymentId')
    if (!paymentId) {
      await load()
      return
    }
    try {
      const result = await syncPaymentStatus(paymentId)
      applyPaymentResult(result.payment, result.access)
      if (result.payment.status === 'pending') pollPayment(paymentId)
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Actualisation impossible')
    }
  }

  if (authLoading || !user) return null

  const active = access?.subscription
  const pending = access?.pendingSubscription
  const latestPayment = access?.latestPayment
  const payments = access?.payments || []
  const paymentPending = latestPayment?.status === 'pending'
  const paymentFailed =
    latestPayment &&
    (latestPayment.status === 'declined' ||
      latestPayment.status === 'canceled' ||
      latestPayment.status === 'failed')

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Mon abonnement"
          icon={<CreditCard size={25} />}
          onBack={() => navigate('/accueil')}
        />

        <header className="auth-header learner-header">
          <p>Choisissez une formule et payez par Mobile Money (MTN ou Moov).</p>
        </header>

        {loading ? (
          <div className="auth-card learner-card learner-empty">
            <LoaderCircle className="subscription-spinner" aria-hidden="true" />
            <p>Chargement de votre abonnement…</p>
          </div>
        ) : (
          <>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}

            <section className="auth-card learner-card subscription-status-card">
              {active ? (
                <>
                  <p className="learner-kicker">Abonnement actif</p>
                  <h2>{active.planName}</h2>
                  <p className="subscription-status-copy">
                    Valable jusqu’au {formatDate(active.endAt)}.
                  </p>
                  <div className="subscription-rights">
                    {active.accessCode ? <span><Check size={15} /> Code</span> : null}
                    {active.accessConduite ? <span><Check size={15} /> Conduite</span> : null}
                    {active.accessECodepermis ? <span><Check size={15} /> E-Codepermis</span> : null}
                  </div>
                </>
              ) : pending ? (
                <>
                  <p className="learner-kicker">
                    {paymentPending || trackingPaymentId
                      ? 'Paiement en cours'
                      : paymentFailed
                        ? 'Paiement non abouti'
                        : 'En attente de paiement'}
                  </p>
                  <h2>{pending.planName}</h2>
                  <p className="subscription-status-copy">
                    {paymentPending || trackingPaymentId
                      ? 'Validez le paiement sur votre téléphone (MTN / Moov). L’abonnement s’activera automatiquement.'
                      : paymentFailed
                        ? latestPayment?.errorMessage ||
                          'Le paiement a échoué ou a été annulé. Vous pouvez réessayer.'
                        : 'Cliquez sur Payer pour ouvrir le checkout FedaPay sécurisé.'}
                  </p>
                  <div className="subscription-payment-actions">
                    {paymentPending && latestPayment?.paymentUrl ? (
                      <button type="button" className="btn-primary" onClick={resumePayment}>
                        Reprendre le paiement
                      </button>
                    ) : null}
                    <button type="button" className="btn-outline" onClick={() => void refreshPayment()}>
                      <RefreshCw size={16} aria-hidden="true" />
                      Actualiser le statut
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Lock size={28} className="subscription-lock-icon" aria-hidden="true" />
                  <h2>Vos parcours sont verrouillés</h2>
                  <p className="subscription-status-copy">
                    Souscrivez à une offre et payez par Mobile Money pour accéder au code et à la conduite.
                  </p>
                </>
              )}
            </section>

            <section className="subscription-catalog">
              <h2>Nos offres</h2>
              {plans.length === 0 ? (
                <p className="subtitle">Aucune offre n’est disponible pour le moment.</p>
              ) : (
                <div className="subscription-plan-list">
                  {plans.map((plan) => {
                    const isCurrentPending = pending && String(pending.planId) === String(plan.id)
                    const freeOfferBlocked = plan.isFreeOffer && access?.freeOfferUsed && !isCurrentPending
                    return (
                      <article className="subscription-plan" key={plan.id}>
                        <div>
                          <h3>{plan.name}</h3>
                          {plan.description ? <p>{plan.description}</p> : null}
                          <span className="subscription-duration">{plan.durationLabel}</span>
                        </div>
                        <strong className="subscription-price">
                          {formatPrice(plan.price, plan.currency)}
                        </strong>
                        <ul className="subscription-plan-rights">
                          {plan.accessCode ? <li><Check size={15} /> Code</li> : null}
                          {plan.accessConduite ? <li><Check size={15} /> Conduite</li> : null}
                          {plan.accessECodepermis ? <li><Check size={15} /> E-Codepermis</li> : null}
                          {plan.heuresIncluses > 0 ? (
                            <li><Check size={15} /> {plan.heuresIncluses} h de conduite</li>
                          ) : null}
                        </ul>
                        {freeOfferBlocked ? (
                          <p className="subscription-free-used">Offre gratuite déjà utilisée</p>
                        ) : null}
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={Boolean(active) || subscribingPlanId !== null || freeOfferBlocked}
                          onClick={() => void subscribe(plan.id)}
                        >
                          {subscribingPlanId === plan.id
                            ? plan.isFreeOffer
                              ? 'Activation…'
                              : 'Ouverture du paiement…'
                            : freeOfferBlocked
                              ? 'Offre gratuite déjà utilisée'
                              : isCurrentPending
                                ? paymentFailed
                                  ? 'Réessayer le paiement'
                                  : plan.isFreeOffer
                                    ? 'Essayer l’offre gratuite'
                                    : 'Payer'
                                : plan.isFreeOffer
                                  ? 'Essayer l’offre gratuite'
                                  : 'Payer'}
                        </button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {payments.length > 0 ? (
              <section className="subscription-payments">
                <h2>Historique des paiements</h2>
                <ul className="subscription-payment-list">
                  {payments.map((payment) => (
                    <li key={payment.id}>
                      <div>
                        <strong>{formatPrice(payment.amount, payment.currency)}</strong>
                        <span>{paymentStatusLabel(payment.status)}</span>
                      </div>
                      <p>
                        {formatDateTime(payment.createdAt)}
                        {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ' · Mobile Money'}
                        {payment.fedapayReference ? ` · réf. ${payment.fedapayReference}` : ''}
                      </p>
                      {payment.errorMessage ? (
                        <p className="subscription-payment-error">{payment.errorMessage}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
