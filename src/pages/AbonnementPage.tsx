import { Check, Clock, CreditCard, History, LoaderCircle, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeModuleAmount,
  fetchAccessMe,
  fetchAccessModules,
  redeemPromoCode,
  AccessRequestError,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
  type CheckoutCartItem,
} from '../api/accessRequests'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/PageLoader'
import { PageNavbar } from '../components/PageNavbar'
import { PageSkeleton } from '../components/PageSkeleton'
import { Reveal } from '../components/Reveal'
import { useAuth } from '../hooks/useAuth'
import { useFocusRefresh } from '../hooks/useFocusRefresh'
import {
  formatSubscriptionEndDate,
  getActiveSubscriptions,
} from '../utils/subscriptionSummary'
import '../styles/auth.css'
import '../styles/learner.css'

function formatPrice(price: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price)
}

const unitSuffix: Record<AccessModule['unit'], string> = {
  flat: '',
  day: ' / jour',
  month: ' / mois',
  hour: ' / heure',
  week: ' / semaine',
}

/** Offres self-service sur cette page (heures conduite = espace Conduite). */
const PRIMARY_KEYS: AccessModuleKey[] = ['code']

export function AbonnementPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [modules, setModules] = useState<AccessModule[]>([])
  const [me, setMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Partial<Record<AccessModuleKey, boolean>>>({})
  const [quantityByModule, setQuantityByModule] = useState<Record<string, number>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [moduleCatalog, meResult] = await Promise.all([fetchAccessModules(), fetchAccessMe()])
      setModules(moduleCatalog.filter((m) => m.key !== 'aiChat'))
      setMe(meResult)
    } catch (err) {
      setError(err instanceof AccessRequestError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load()
  })

  if (authLoading || !user) return <PageLoader />

  const activeSubscriptions = getActiveSubscriptions(me)

  const cartItems: CheckoutCartItem[] = modules
    .filter((module) => {
      if (!PRIMARY_KEYS.includes(module.key)) return false
      if (!selected[module.key]) return false
      if (me?.access[module.key]) return false
      return true
    })
    .map((module) => ({
      module: module.key,
      quantity: Math.max(1, quantityByModule[module.key] ?? 1),
    }))

  const cartTotal = cartItems.reduce((sum, item) => {
    const module = modules.find((m) => m.key === item.module)
    if (!module) return sum
    return sum + computeModuleAmount(item.module, module.price, item.quantity)
  }, 0)

  const toggle = (key: AccessModuleKey) => {
    setSelected((current) => ({ ...current, [key]: !current[key] }))
  }

  const handleRedeemPromo = async () => {
    const trimmed = promoCode.trim()
    if (!trimmed) return
    setPromoBusy(true)
    setPromoError(null)
    setPromoSuccess(null)
    try {
      const result = await redeemPromoCode(trimmed)
      setMe(result.access)
      const labels = result.modules
        .map((key) => modules.find((m) => m.key === key)?.label || key)
        .join(', ')
      setPromoSuccess(`Code activé : ${labels} débloqué${result.modules.length > 1 ? 's' : ''}.`)
      setPromoCode('')
    } catch (err) {
      setPromoError(err instanceof AccessRequestError ? err.message : 'Code invalide')
    } finally {
      setPromoBusy(false)
    }
  }

  const sortedModules = [...modules].sort((a, b) => {
    const ai = PRIMARY_KEYS.indexOf(a.key)
    const bi = PRIMARY_KEYS.indexOf(b.key)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar title="Mes accès" icon={<CreditCard size={25} />} onBack={() => navigate('/accueil')} />

        <header className="auth-header learner-header">
          <p>
            Achète l’accès Code par Mobile Money (MTN, Moov, Celtiis). Les cours vidéo de
            conduite sont gratuits dans l’espace Conduite ; les heures moniteur s’achètent
            aussi là-bas.
          </p>
        </header>

        <button
          type="button"
          className="btn-outline"
          onClick={() => navigate('/abonnement/historique')}
        >
          <History size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Historique des paiements
        </button>

        {loading ? (
          <PageSkeleton variant="list" />
        ) : (
          <>
            {error ? (
              <EmptyState
                tone="error"
                icon={<LoaderCircle size={28} />}
                title="Chargement impossible"
                message={error}
                action={
                  <button type="button" className="btn-primary" onClick={() => void load()}>
                    Réessayer
                  </button>
                }
              />
            ) : null}

            {me ? (
              <Reveal delay={60}>
              <section className="auth-card learner-card subscription-status-card">
                <p className="learner-kicker">
                  <Clock size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  Solde heures moniteur (espace Conduite)
                </p>
                <h2>{me.user.soldeHeures} h</h2>
                <p className="subscription-status-copy">
                  Ce solde sert aux séances moniteur — pas à l’abonnement Code.{' '}
                  <button type="button" className="btn-outline" style={{ display: 'inline', padding: '2px 8px', fontSize: 13 }} onClick={() => navigate('/conduite')}>
                    Ouvrir Conduite
                  </button>
                </p>
                {activeSubscriptions.length > 0 ? (
                  <div className="subscription-active-list">
                    {activeSubscriptions.map((sub) => (
                      <p key={sub.module} className="subscription-status-copy">
                        <strong>{sub.label}</strong> — expire le{' '}
                        {formatSubscriptionEndDate(sub.endAt)} ({sub.remainingLabel} restant
                        {sub.daysLeft > 1 ? 's' : ''})
                        {sub.daysLeft <= 7 ? (
                          <>
                            {' '}
                            ·{' '}
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ display: 'inline', padding: '2px 8px', marginLeft: 4, fontSize: 13 }}
                              onClick={() => {
                                setSelected({ [sub.module]: true })
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                            >
                              Renouveler
                            </button>
                          </>
                        ) : null}
                      </p>
                    ))}
                  </div>
                ) : null}
                {me.pendingRequest ? (
                  <p className="subscription-status-copy">
                    Paiement en confirmation… Actualisez après validation sur votre téléphone.
                  </p>
                ) : null}
              </section>
              </Reveal>
            ) : null}

            <Reveal delay={120}>
            <section className="subscription-catalog">
              <h2>Offres disponibles</h2>
              {sortedModules.filter((module) => PRIMARY_KEYS.includes(module.key)).length === 0 ? (
                <p className="subtitle">Aucun accès n’est disponible pour le moment.</p>
              ) : (
                <div className="offer-pick-list">
                  {sortedModules
                    .filter((module) => PRIMARY_KEYS.includes(module.key))
                    .map((module) => {
                    const isActive = Boolean(me?.access[module.key])
                    const showsQuantity = module.unit === 'hour'
                    const quantity = quantityByModule[module.key] ?? 1
                    const amount = computeModuleAmount(module.key, module.price, showsQuantity ? quantity : 1)
                    const checked = Boolean(selected[module.key])

                    return (
                      <button
                        key={module.key}
                        type="button"
                        className={`offer-pick${checked ? ' is-selected' : ''}`}
                        disabled={isActive}
                        onClick={() => toggle(module.key)}
                      >
                        <h3>
                          {module.label}
                          {isActive ? ' · Actif' : ''}
                        </h3>
                        <p>
                          {formatPrice(module.price)}
                          {unitSuffix[module.unit]}
                          {!isActive ? ` · total ${formatPrice(amount)}` : ''}
                        </p>
                        {showsQuantity && !isActive ? (
                          <label
                            className="access-quantity-field"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            Nombre d’heures
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
                        {isActive ? (
                          <p className="subscription-free-used" style={{ color: 'var(--green, #00b050)' }}>
                            <Check size={15} /> Accès actif
                          </p>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                className="btn-primary"
                disabled={cartItems.length === 0}
                onClick={() => setCheckoutOpen(true)}
                style={{ marginTop: 16 }}
              >
                Payer {formatPrice(cartTotal)}
              </button>
            </section>
            </Reveal>

            <section className="auth-card learner-card subscription-status-card">
              <p className="learner-kicker">Vous avez un code promo ?</p>
              <div className="promo-code-field">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  placeholder="CODE PROMO"
                  disabled={promoBusy}
                />
                <button
                  type="button"
                  className="btn-outline"
                  disabled={promoBusy || !promoCode.trim()}
                  onClick={() => void handleRedeemPromo()}
                >
                  {promoBusy ? 'Vérification…' : 'Valider'}
                </button>
              </div>
              {promoError ? <p className="form-error">{promoError}</p> : null}
              {promoSuccess ? <p className="form-success">{promoSuccess}</p> : null}
            </section>

            {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
              <section className="auth-card learner-card subscription-status-card">
                <Lock size={28} className="subscription-lock-icon" aria-hidden="true" />
                <p className="subscription-status-copy">
                  Sélectionnez au moins une offre ci-dessus pour débloquer vos parcours.
                </p>
              </section>
            ) : null}

            <MobileMoneyCheckout
              open={checkoutOpen}
              items={cartItems}
              modules={modules}
              defaultPhone={user.phone}
              onClose={() => setCheckoutOpen(false)}
              onSuccess={(access) => {
                setMe(access)
                setSelected({})
                setCheckoutOpen(false)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
