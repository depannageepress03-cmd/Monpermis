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
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
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
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

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
          <p>Choisissez Code et/ou Chat IA, puis payez par Mobile Money (MTN, Moov, Celtiis).</p>
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
          <div className="auth-card learner-card learner-empty">
            <LoaderCircle className="subscription-spinner" aria-hidden="true" />
            <p>Chargement…</p>
          </div>
        ) : (
          <>
            {error ? <p className="form-error">{error}</p> : null}

            {me ? (
              <section className="auth-card learner-card subscription-status-card">
                <p className="learner-kicker">
                  <Clock size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                  Solde heures de conduite
                </p>
                <h2>{me.user.soldeHeures} h</h2>
                {me.pendingRequest ? (
                  <p className="subscription-status-copy">
                    Paiement en confirmation… Actualisez après validation sur votre téléphone.
                  </p>
                ) : null}
              </section>
            ) : null}

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
