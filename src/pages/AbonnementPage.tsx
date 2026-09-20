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
import { AppShell, userInitialsOf, type AppTab } from '../components/layout/AppShell'
import { Badge, Button, Card, IconBadge, SectionTitle, StatCard } from '../components/ui'
import '../styles/auth.css'
import '../styles/learner.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

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
    <AppShell
      activeTab="profil"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
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

          <Button
            variant="outline"
            icon={<History size={16} />}
            onClick={() => navigate('/abonnement/historique')}
          >
            Historique des paiements
          </Button>

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
                    <Button variant="cta" tone="green" onClick={() => void load()}>
                      Réessayer
                    </Button>
                  }
                />
              ) : null}

              {me ? (
                <Reveal delay={60}>
                <Card>
                  <section className="subscription-status-card">
                    <StatCard
                      icon={<Clock size={14} />}
                      label="Solde heures moniteur (espace Conduite)"
                      value={`${me.user.soldeHeures} h`}
                    />
                    <p className="subscription-status-copy">
                      Ce solde sert aux séances moniteur — pas à l’abonnement Code.{' '}
                      <Button variant="outline" style={{ display: 'inline', padding: '2px 8px', fontSize: 13 }} onClick={() => navigate('/conduite')}>
                        Ouvrir Conduite
                      </Button>
                    </p>
                    {activeSubscriptions.length > 0 ? (
                      <div className="subscription-active-list">
                        {activeSubscriptions.map((sub) => (
                          <p key={sub.module} className="subscription-status-copy">
                            <strong>{sub.label}</strong> — expire le{' '}
                            {formatSubscriptionEndDate(sub.endAt)} ({sub.remainingLabel} restant
                            {sub.daysLeft > 1 ? 's' : ''}){' '}
                            <Badge tone={sub.daysLeft <= 7 ? 'orange' : 'green'}>
                              {sub.daysLeft <= 7 ? 'Expire bientôt' : 'Actif'}
                            </Badge>
                            {sub.daysLeft <= 7 ? (
                              <>
                                {' '}
                                <Button
                                  variant="outline"
                                  style={{ display: 'inline', padding: '2px 8px', marginLeft: 4, fontSize: 13 }}
                                  onClick={() => {
                                    setSelected({ [sub.module]: true })
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                  }}
                                >
                                  Renouveler
                                </Button>
                              </>
                            ) : null}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {me.pendingRequest ? (
                      <p className="subscription-status-copy">
                        <Badge tone="orange">Paiement en confirmation</Badge>{' '}
                        Actualisez après validation sur votre téléphone.
                      </p>
                    ) : null}
                  </section>
                </Card>
                </Reveal>
              ) : null}

              <Reveal delay={120}>
              <section className="subscription-catalog">
                <SectionTitle>Offres disponibles</SectionTitle>
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
                        <Card key={module.key}>
                          <button
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
                              <Badge tone="green" icon={<Check size={15} />}>
                                Accès actif
                              </Badge>
                            ) : null}
                          </button>
                        </Card>
                      )
                    })}
                  </div>
                )}

                <Button
                  variant="cta"
                  tone="green"
                  disabled={cartItems.length === 0}
                  onClick={() => setCheckoutOpen(true)}
                  style={{ marginTop: 16 }}
                >
                  Payer {formatPrice(cartTotal)}
                </Button>
              </section>
              </Reveal>

              <Card>
                <section className="subscription-status-card">
                  <SectionTitle>Vous avez un code promo ?</SectionTitle>
                  <div className="promo-code-field">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      placeholder="CODE PROMO"
                      disabled={promoBusy}
                    />
                    <Button
                      variant="outline"
                      disabled={promoBusy || !promoCode.trim()}
                      onClick={() => void handleRedeemPromo()}
                    >
                      {promoBusy ? 'Vérification…' : 'Valider'}
                    </Button>
                  </div>
                  {promoError ? <p className="form-error">{promoError}</p> : null}
                  {promoSuccess ? <p className="form-success">{promoSuccess}</p> : null}
                </section>
              </Card>

              {!modules.some((m) => me?.access[m.key]) && !(me && me.user.soldeHeures > 0) ? (
                <Card>
                  <section className="subscription-status-card">
                    <IconBadge icon={<Lock size={28} aria-hidden="true" />} tone="orange" />
                    <p className="subscription-status-copy">
                      Sélectionnez au moins une offre ci-dessus pour débloquer vos parcours.
                    </p>
                  </section>
                </Card>
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
    </AppShell>
  )
}
