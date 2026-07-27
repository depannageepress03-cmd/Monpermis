import { Check, Clock, CreditCard, LoaderCircle, Lock, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createAccessRequest,
  declareAccessPayment,
  fetchAccessMe,
  fetchAccessModules,
  syncAccessRequest,
  AccessRequestError,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
  type AccessRequest,
} from '../api/accessRequests'
import { fetchSubscriptionMe, SubscriptionError, type SubscriptionAccess } from '../api/subscriptions'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value)) : '—'
}

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price)
}

const statusLabels: Record<AccessRequest['status'], string> = {
  en_attente: 'En attente',
  paiement_declare: 'Paiement déclaré, en vérification',
  en_verification: 'Paiement en cours de confirmation',
  valide: 'Validé',
  actif: 'Actif',
  expire: 'Expiré',
  rejete: 'Rejeté',
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

/** Modules couverts par un flag de l'ancien système d'abonnement (grandfathering). */
const legacyFlagByModule: Partial<Record<AccessModuleKey, keyof SubscriptionAccess>> = {
  code: 'accessCode',
  conduite_videos: 'accessConduite',
  ecodepermis: 'accessECodepermis',
  aiChat: 'accessAiChat',
}

export function AbonnementPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [legacyAccess, setLegacyAccess] = useState<SubscriptionAccess | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [me, setMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [busyModule, setBusyModule] = useState<AccessModuleKey | null>(null)
  const [quantityByModule, setQuantityByModule] = useState<Record<string, number>>({})
  const [manualFormFor, setManualFormFor] = useState<AccessModuleKey | null>(null)
  const [declaredReference, setDeclaredReference] = useState('')
  const [declareNote, setDeclareNote] = useState('')

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
      const [legacy, moduleCatalog, meResult] = await Promise.all([
        fetchSubscriptionMe().catch(() => null),
        fetchAccessModules(),
        fetchAccessMe(),
      ])
      setLegacyAccess(legacy)
      setModules(moduleCatalog)
      setMe(meResult)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  const pollPendingRequest = useCallback(
    (id: string) => {
      stopPolling()
      pollRef.current = window.setInterval(() => {
        void (async () => {
          try {
            const result = await syncAccessRequest(id)
            setMe(result.access)
            if (result.accessRequest.status !== 'en_verification') {
              stopPolling()
              if (result.accessRequest.status === 'actif' || result.accessRequest.status === 'valide') {
                setSuccess('Paiement confirmé. Votre accès est maintenant actif.')
              } else if (result.accessRequest.status === 'rejete') {
                setError('Le paiement n’a pas abouti. Vous pouvez réessayer.')
              }
            }
          } catch {
            /* ignore transient poll errors */
          }
        })()
      }, 4000)
    },
    [stopPolling],
  )

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    const accessRequestId = searchParams.get('accessRequest')
    if (!user || !accessRequestId) return

    void (async () => {
      setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
      try {
        const result = await syncAccessRequest(accessRequestId)
        setMe(result.access)
        if (result.accessRequest.status === 'actif' || result.accessRequest.status === 'valide') {
          setSuccess('Paiement confirmé. Votre accès est maintenant actif.')
        } else if (result.accessRequest.status === 'en_verification') {
          pollPendingRequest(accessRequestId)
        } else if (result.accessRequest.status === 'rejete') {
          setError('Le paiement n’a pas abouti. Vous pouvez réessayer.')
          setSuccess(null)
        }
      } catch (err) {
        setError(err instanceof AccessRequestError ? err.message : 'Vérification du paiement impossible')
        pollPendingRequest(accessRequestId)
      } finally {
        setSearchParams({}, { replace: true })
      }
    })()
  }, [user, searchParams, setSearchParams, pollPendingRequest])

  const buyWithFedaPay = async (module: AccessModule) => {
    setBusyModule(module.key)
    setError(null)
    setSuccess(null)
    try {
      const quantity = Math.max(1, quantityByModule[module.key] ?? 1)
      const result = await createAccessRequest({ module: module.key, quantity, method: 'fedapay' })
      if (!result.paymentUrl) {
        setError('Lien de paiement FedaPay indisponible. Réessayez dans un instant.')
        return
      }
      window.location.assign(result.paymentUrl)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Paiement impossible à initier')
    } finally {
      setBusyModule(null)
    }
  }

  const openManualForm = (module: AccessModuleKey) => {
    setManualFormFor(module)
    setDeclaredReference('')
    setDeclareNote('')
    setError(null)
  }

  const submitManualDeclaration = async (module: AccessModule) => {
    if (declaredReference.trim().length < 3) {
      setError('Indiquez une référence de paiement valide.')
      return
    }
    setBusyModule(module.key)
    setError(null)
    try {
      const quantity = Math.max(1, quantityByModule[module.key] ?? 1)
      const { accessRequest } = await createAccessRequest({ module: module.key, quantity, method: 'manual' })
      await declareAccessPayment(accessRequest.id, {
        declaredReference: declaredReference.trim(),
        note: declareNote.trim(),
      })
      setSuccess('Déclaration envoyée. Un administrateur va vérifier votre paiement.')
      setManualFormFor(null)
      const meResult = await fetchAccessMe()
      setMe(meResult)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Déclaration impossible')
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
      setMe(result.access)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Actualisation impossible')
    }
  }

  if (authLoading || !user) return null

  const legacyActive = legacyAccess?.subscription

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar title="Mon abonnement" icon={<CreditCard size={25} />} onBack={() => navigate('/accueil')} />

        <header className="auth-header learner-header">
          <p>Choisissez un accès et payez par Mobile Money, ou déclarez un paiement hors plateforme.</p>
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

            {legacyActive ? (
              <section className="auth-card learner-card subscription-status-card">
                <p className="learner-kicker">Abonnement actif (ancienne formule)</p>
                <h2>{legacyActive.planName}</h2>
                <p className="subscription-status-copy">Valable jusqu’au {formatDate(legacyActive.endAt)}.</p>
                <div className="subscription-rights">
                  {legacyActive.accessCode ? <span><Check size={15} /> Code</span> : null}
                  {legacyActive.accessConduite ? <span><Check size={15} /> Conduite</span> : null}
                  {legacyActive.accessECodepermis ? <span><Check size={15} /> E-Codepermis</span> : null}
                  {legacyActive.accessAiChat ? <span><Check size={15} /> Chat IA</span> : null}
                </div>
              </section>
            ) : null}

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
                      Demande « {me.pendingRequest.module} » : {statusLabels[me.pendingRequest.status]}
                    </p>
                    <button type="button" className="btn-outline" onClick={() => void refresh()}>
                      <RefreshCw size={16} aria-hidden="true" />
                      Actualiser le statut
                    </button>
                  </>
                ) : null}
              </section>
            ) : null}

            <section className="subscription-catalog">
              <h2>Nos accès</h2>
              {modules.length === 0 ? (
                <p className="subtitle">Aucun accès n’est disponible pour le moment.</p>
              ) : (
                <div className="subscription-plan-list">
                  {modules.map((module) => {
                    const legacyFlag = legacyFlagByModule[module.key]
                    const isActive =
                      me?.access[module.key] || (legacyFlag ? Boolean(legacyAccess?.[legacyFlag]) : false)
                    const quantity = quantityByModule[module.key] ?? 1
                    const showsQuantity = module.unit === 'hour' || module.unit === 'week'
                    const isBusy = busyModule === module.key

                    return (
                      <article className="subscription-plan" key={module.key}>
                        <div>
                          <h3>{module.label}</h3>
                          <span className="subscription-duration">
                            {module.unit === 'hour' ? 'À l’heure' : module.unit === 'week' ? 'À la semaine' : 'Mensuel'}
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
                              onClick={() => void buyWithFedaPay(module)}
                            >
                              {isBusy ? 'Ouverture du paiement…' : 'Payer par Mobile Money'}
                            </button>

                            {manualFormFor === module.key ? (
                              <div className="access-manual-form">
                                <label>
                                  Référence de paiement
                                  <input
                                    type="text"
                                    value={declaredReference}
                                    onChange={(event) => setDeclaredReference(event.target.value)}
                                    placeholder="Référence Mobile Money, reçu…"
                                  />
                                </label>
                                <label>
                                  Note (facultatif)
                                  <textarea
                                    rows={2}
                                    value={declareNote}
                                    onChange={(event) => setDeclareNote(event.target.value)}
                                    placeholder="Précisez le mode de paiement utilisé"
                                  />
                                </label>
                                <div className="access-manual-actions">
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={isBusy}
                                    onClick={() => void submitManualDeclaration(module)}
                                  >
                                    {isBusy ? 'Envoi…' : 'Envoyer la déclaration'}
                                  </button>
                                  <button type="button" className="btn-outline" onClick={() => setManualFormFor(null)}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" className="btn-outline" onClick={() => openManualForm(module.key)}>
                                J’ai déjà payé autrement
                              </button>
                            )}
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {!legacyActive && !modules.some((m) => me?.access[m.key]) ? (
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
