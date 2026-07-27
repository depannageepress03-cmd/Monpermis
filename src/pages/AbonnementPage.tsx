import { Check, Clock, CreditCard, LoaderCircle, Lock, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  cancelAccessRequest,
  createAccessRequest,
  fetchAccessMe,
  fetchAccessModules,
  syncAccessRequest,
  AccessRequestError,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
  type AccessRequest,
} from '../api/accessRequests'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price)
}

const statusLabels: Record<AccessRequest['status'], string> = {
  en_attente: 'En attente',
  paiement_declare: 'Paiement déclaré, en vérification',
  en_verification: 'Paiement Mobile Money en confirmation',
  valide: 'Validé',
  actif: 'Actif',
  expire: 'Expiré',
  rejete: 'Rejeté',
}

const moduleLabels: Record<AccessModuleKey, string> = {
  code: 'Code de la route',
  conduite_heures: 'Heures de conduite',
  conduite_videos: 'Vidéos conduite',
  ecodepermis: 'E-Codepermis',
  aiChat: 'Chat IA',
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

export function AbonnementPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [modules, setModules] = useState<AccessModule[]>([])
  const [me, setMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [busyModule, setBusyModule] = useState<AccessModuleKey | null>(null)
  const [quantityByModule, setQuantityByModule] = useState<Record<string, number>>({})
  const [cancelling, setCancelling] = useState(false)

  const pollRef = useRef<number | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const applySyncResult = useCallback(
    (result: { accessRequest: AccessRequest; access: AccessMe }) => {
      setMe(result.access)
      if (result.accessRequest.status === 'actif' || result.accessRequest.status === 'valide') {
        stopPolling()
        setSuccess('Paiement confirmé. Votre accès est maintenant actif.')
        setError(null)
        return 'done'
      }
      if (result.accessRequest.status === 'rejete') {
        stopPolling()
        setError('Le paiement n’a pas abouti. Vous pouvez réessayer.')
        setSuccess(null)
        return 'done'
      }
      return 'pending'
    },
    [stopPolling],
  )

  const pollPendingRequest = useCallback(
    (id: string) => {
      stopPolling()
      let ticks = 0
      pollRef.current = window.setInterval(() => {
        void (async () => {
          ticks += 1
          try {
            const result = await syncAccessRequest(id)
            const state = applySyncResult(result)
            if (state === 'done' || ticks >= 45) stopPolling()
          } catch {
            /* ignore transient poll errors */
          }
        })()
      }, 3000)
    },
    [applySyncResult, stopPolling],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [moduleCatalog, meResult] = await Promise.all([fetchAccessModules(), fetchAccessMe()])
      setModules(moduleCatalog)
      setMe(meResult)
      if (meResult.pendingRequest?.status === 'en_verification') {
        setSuccess('Paiement Mobile Money en confirmation…')
        pollPendingRequest(meResult.pendingRequest.id)
      }
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [pollPendingRequest])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    const accessRequestId = searchParams.get('accessRequest')
    if (!user || !accessRequestId) return

    void (async () => {
      setSuccess('Confirmation du paiement Mobile Money…')
      try {
        const result = await syncAccessRequest(accessRequestId)
        const state = applySyncResult(result)
        if (state === 'pending') {
          setSuccess('Paiement en cours de confirmation Mobile Money…')
          pollPendingRequest(accessRequestId)
        }
      } catch (err) {
        setError(err instanceof AccessRequestError ? err.message : 'Vérification du paiement impossible')
        pollPendingRequest(accessRequestId)
      } finally {
        setSearchParams({}, { replace: true })
      }
    })()
  }, [user, searchParams, setSearchParams, pollPendingRequest, applySyncResult])

  const buyWithFedaPay = async (module: AccessModule, replace = false) => {
    setBusyModule(module.key)
    setError(null)
    setSuccess(null)
    try {
      const quantity = Math.max(1, quantityByModule[module.key] ?? 1)
      const result = await createAccessRequest({ module: module.key, quantity, replace })
      if (result.alreadyActive && result.access) {
        setMe(result.access)
        setSuccess('Votre accès est déjà actif.')
        return
      }
      if (!result.paymentUrl) {
        setError('Lien de paiement Mobile Money indisponible. Réessayez dans un instant.')
        return
      }
      setSuccess(
        result.resumed
          ? 'Reprise du paiement Mobile Money en cours…'
          : 'Redirection vers Mobile Money…',
      )
      window.location.assign(result.paymentUrl)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Paiement impossible à initier')
    } finally {
      setBusyModule(null)
    }
  }

  const refresh = async () => {
    const pending = me?.pendingRequest
    if (!pending) {
      await load()
      return
    }
    try {
      const result = await syncAccessRequest(pending.id)
      const state = applySyncResult(result)
      if (state === 'pending') {
        setSuccess('Paiement toujours en cours de confirmation…')
        pollPendingRequest(pending.id)
      }
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Actualisation impossible')
    }
  }

  const cancelPending = async () => {
    if (!me?.pendingRequest) return
    setCancelling(true)
    setError(null)
    try {
      const result = await cancelAccessRequest(me.pendingRequest.id)
      stopPolling()
      setMe(result.access)
      setSuccess('Paiement annulé. Vous pouvez relancer un paiement en ligne.')
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Annulation impossible')
    } finally {
      setCancelling(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar title="Mes accès" icon={<CreditCard size={25} />} onBack={() => navigate('/accueil')} />

        <header className="auth-header learner-header">
          <p>Payez uniquement en ligne par Mobile Money (FedaPay).</p>
        </header>

        {loading ? (
          <div className="auth-card learner-card learner-empty">
            <LoaderCircle className="subscription-spinner" aria-hidden="true" />
            <p>Chargement…</p>
          </div>
        ) : (
          <>
            {error ? <p className="form-error">{error}</p> : null}
            {success ? <p className="form-success">{success}</p> : null}

            {me ? (
              <section className="auth-card learner-card subscription-status-card">
                <p className="learner-kicker">
                  <Clock size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  Solde heures de conduite
                </p>
                <h2>{me.user.soldeHeures} h</h2>
                {me.pendingRequest ? (
                  <>
                    <p className="subscription-status-copy">
                      {moduleLabels[me.pendingRequest.module] || me.pendingRequest.module}
                      {' · '}
                      {formatPrice(me.pendingRequest.amount, me.pendingRequest.currency)}
                      <br />
                      {statusLabels[me.pendingRequest.status]}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {me.pendingRequest.status === 'en_verification' ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={Boolean(busyModule)}
                          onClick={() => {
                            const module = modules.find((item) => item.key === me.pendingRequest?.module)
                            if (module) void buyWithFedaPay(module, false)
                          }}
                        >
                          Reprendre le paiement
                        </button>
                      ) : null}
                      <button type="button" className="btn-outline" onClick={() => void refresh()}>
                        <RefreshCw size={16} aria-hidden="true" />
                        Actualiser
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={cancelling}
                        onClick={() => void cancelPending()}
                      >
                        {cancelling ? 'Annulation…' : 'Annuler'}
                      </button>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            <section className="subscription-catalog">
              <h2>Paiement en ligne</h2>
              {modules.length === 0 ? (
                <p className="subtitle">Aucun accès n’est disponible pour le moment.</p>
              ) : (
                <div className="subscription-plan-list">
                  {modules.map((module) => {
                    const isActive = Boolean(me?.access[module.key])
                    const quantity = quantityByModule[module.key] ?? 1
                    const showsQuantity = module.unit === 'hour' || module.unit === 'week'
                    const isBusy = busyModule === module.key
                    const hasPendingSame =
                      me?.pendingRequest?.module === module.key &&
                      me.pendingRequest.status === 'en_verification'

                    return (
                      <article className="subscription-plan" key={module.key}>
                        <div>
                          <h3>{module.label}</h3>
                          <span className="subscription-duration">
                            {module.unit === 'hour'
                              ? 'À l’heure'
                              : module.unit === 'week'
                                ? 'À la semaine'
                                : 'Mensuel'}
                          </span>
                        </div>
                        <strong className="subscription-price">
                          {formatPrice(module.price)}
                          {unitSuffix[module.unit]}
                        </strong>

                        {isActive ? (
                          <p className="subscription-free-used" style={{ color: 'var(--green, #00b050)' }}>
                            <Check size={15} /> Accès actif
                          </p>
                        ) : (
                          <>
                            {showsQuantity ? (
                              <label className="access-quantity-field">
                                {module.unit === 'hour' ? 'Nombre d’heures' : 'Nombre de semaines'}
                                <input
                                  type="number"
                                  min={1}
                                  value={quantity}
                                  onChange={(event) =>
                                    setQuantityByModule((current) => ({
                                      ...current,
                                      [module.key]: Math.max(1, Number(event.target.value) || 1),
                                    }))
                                  }
                                />
                              </label>
                            ) : null}
                            <p className="subscription-price" style={{ fontSize: '15px' }}>
                              Total : {formatPrice(module.price * (showsQuantity ? quantity : 1))}
                            </p>

                            <button
                              type="button"
                              className="btn-primary"
                              disabled={isBusy}
                              onClick={() => void buyWithFedaPay(module, false)}
                            >
                              {isBusy
                                ? 'Ouverture Mobile Money…'
                                : hasPendingSame
                                  ? 'Continuer le paiement'
                                  : 'Payer en ligne (Mobile Money)'}
                            </button>
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
              <section className="auth-card learner-card subscription-status-card">
                <Lock size={28} className="subscription-lock-icon" aria-hidden="true" />
                <p className="subscription-status-copy">
                  Achetez un accès ci-dessus pour débloquer le code, la conduite ou l’E-Codepermis.
                </p>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
