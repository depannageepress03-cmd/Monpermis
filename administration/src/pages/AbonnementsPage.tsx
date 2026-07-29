import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Bot,
  BookOpen,
  Car,
  CheckCircle2,
  Gift,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Video,
  Wallet,
  Wifi,
  X,
} from 'lucide-react'
import {
  fetchAccessModulePricing,
  fetchAccessStats,
  fetchApprovedPayments,
  fetchSubscribers,
  grantSubscription,
  paymentChannelLabel,
  subscribeToPaymentStream,
  unitLabel,
  updateAccessModulePricing,
  type AccessModuleKey,
  type AccessModulePricing,
  type AccessPayment,
  type AccessStats,
  type Subscriber,
} from '../api/accessRequests'
import { fetchUsers, type AppUser } from '../api/users'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

type Tab = 'subscribers' | 'payments' | 'pricing'

const moduleOptions: { value: AccessModuleKey | ''; label: string }[] = [
  { value: '', label: 'Tous les abonnements' },
  { value: 'code', label: 'Code de la route' },
  { value: 'conduite_heures', label: 'Heures de conduite' },
  { value: 'conduite_videos', label: 'Vidéos conduite' },
  { value: 'ecodepermis', label: 'E-Codepermis' },
]

const grantModules: AccessModuleKey[] = [
  'code',
  'conduite_videos',
  'conduite_heures',
  'ecodepermis',
]

function moduleLabel(module: AccessModuleKey) {
  if (module === 'aiChat') return 'Chat IA tuteur (retiré)'
  return moduleOptions.find((option) => option.value === module)?.label ?? module
}

const moduleIcons: Record<AccessModuleKey, typeof BookOpen> = {
  code: BookOpen,
  conduite_heures: Car,
  conduite_videos: Video,
  ecodepermis: ShieldCheck,
  aiChat: Bot,
}

function ModuleChip({ module }: { module: AccessModuleKey }) {
  const Icon = moduleIcons[module] || BookOpen
  return (
    <span className="ar-module-chip">
      <Icon size={14} />
      {moduleLabel(module)}
    </span>
  )
}

function initials(learner: { firstName?: string; lastName?: string } | null | undefined) {
  if (!learner) return '?'
  const a = (learner.firstName || '').trim().charAt(0)
  const b = (learner.lastName || '').trim().charAt(0)
  return (a + b).toUpperCase() || '?'
}

function formatMoney(value: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function learnerName(learner: { firstName?: string; lastName?: string } | null | undefined) {
  if (!learner) return 'Apprenant'
  return `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Apprenant'
}

export function AbonnementsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) || 'subscribers'
  const [tab, setTab] = useState<Tab>(
    initialTab === 'payments' || initialTab === 'pricing' ? initialTab : 'subscribers',
  )

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [payments, setPayments] = useState<AccessPayment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [stats, setStats] = useState<AccessStats | null>(null)
  const [pricing, setPricing] = useState<AccessModulePricing[]>([])
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, string>>({})
  const [pricingBusy, setPricingBusy] = useState<string | null>(null)

  const [moduleFilter, setModuleFilter] = useState<AccessModuleKey | ''>('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [liveConnected, setLiveConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [grantOpen, setGrantOpen] = useState(false)
  const [grantUserId, setGrantUserId] = useState('')
  const [grantModule, setGrantModule] = useState<AccessModuleKey>('code')
  const [grantQuantity, setGrantQuantity] = useState('1')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting] = useState(false)
  const [userQuery, setUserQuery] = useState('')

  const unsubscribeRef = useRef<(() => void) | null>(null)

  const setActiveTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'subscribers') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const loadSubscribers = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { subscribers: rows } = await fetchSubscribers(token, {
      module: moduleFilter,
      q: query.trim() || undefined,
    })
    setSubscribers(rows)
  }, [moduleFilter, query])

  const loadPayments = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { payments: rows } = await fetchApprovedPayments(token)
    setPayments(rows)
  }, [])

  const loadPricing = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { modules } = await fetchAccessModulePricing(token)
    setPricing(modules.filter((m) => m.key !== 'aiChat'))
    setPricingDrafts(
      Object.fromEntries(modules.filter((m) => m.key !== 'aiChat').map((m) => [m.key, String(m.price)])),
    )
  }, [])

  const loadStats = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setStats(await fetchAccessStats(token))
  }, [])

  const loadUsers = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { users: rows } = await fetchUsers(token)
    setUsers(rows.filter((u) => u.isActive))
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadSubscribers(), loadPayments(), loadPricing(), loadStats(), loadUsers()])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [loadSubscribers, loadPayments, loadPricing, loadStats, loadUsers])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    unsubscribeRef.current?.()
    unsubscribeRef.current = subscribeToPaymentStream(token, {
      onStatusChange: setLiveConnected,
      onPayment: (payment) => {
        if (payment.status !== 'approved') return
        setPayments((current) => {
          const without = current.filter((item) => item.id !== payment.id)
          return [payment, ...without]
        })
        void loadSubscribers()
        void loadStats()
      },
      onSubscriber: () => {
        void loadSubscribers()
        void loadStats()
      },
    })
    return () => unsubscribeRef.current?.()
  }, [loadSubscribers, loadStats])

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users.slice(0, 40)
    return users
      .filter((u) => {
        const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 40)
  }, [users, userQuery])

  const activeCount = subscribers.length
  const approvedRevenue = stats?.revenueByMethod.reduce((sum, row) => sum + row.total, 0) ?? 0

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    void loadSubscribers().catch((err) => {
      setError(isAuthError(err) ? err.message : 'Recherche impossible.')
    })
  }

  const handleGrant = async (event: FormEvent) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const quantity = Math.max(1, Math.floor(Number(grantQuantity) || 1))
    if (!grantUserId) {
      setError('Choisis un apprenant.')
      return
    }
    setGranting(true)
    setError(null)
    setSuccess(null)
    try {
      await grantSubscription(token, {
        userId: grantUserId,
        module: grantModule,
        quantity,
        note: grantNote.trim() || undefined,
      })
      setSuccess('Abonnement attribué.')
      setGrantOpen(false)
      setGrantNote('')
      setGrantQuantity('1')
      await Promise.all([loadSubscribers(), loadStats()])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Attribution impossible.')
    } finally {
      setGranting(false)
    }
  }

  const handlePricingSave = async (key: AccessModuleKey) => {
    const token = getAdminToken()
    if (!token) return
    const price = Number(pricingDrafts[key])
    if (!Number.isFinite(price) || price < 0) {
      setError('Prix invalide.')
      return
    }
    setPricingBusy(key)
    setError(null)
    try {
      const { module } = await updateAccessModulePricing(token, key, { price })
      setPricing((current) => current.map((item) => (item.key === key ? module : item)))
      setSuccess(`Tarif « ${module.label} » mis à jour.`)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible.')
    } finally {
      setPricingBusy(null)
    }
  }

  const handlePricingToggleActive = async (module: AccessModulePricing) => {
    const token = getAdminToken()
    if (!token) return
    setPricingBusy(module.key)
    setError(null)
    try {
      const { module: updated } = await updateAccessModulePricing(token, module.key, {
        active: !module.active,
      })
      setPricing((current) => current.map((item) => (item.key === module.key ? updated : item)))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible.')
    } finally {
      setPricingBusy(null)
    }
  }

  return (
    <div className="admin-page access-requests-page">
      <header className="admin-module-header">
        <p className="admin-module-kicker">Abonnements</p>
        <h1 className="admin-module-title">Abonnés</h1>
        <p className="admin-module-subtitle">
          Liste des abonnements actifs, attribution exceptionnelle et flux des paiements réussis.
        </p>
      </header>

      <div className="ar-stats-row">
        <div className="ar-stat-card">
          <div className="ar-stat-head">
            <p className="ar-stat-label">Abonnements actifs</p>
            <div className="ar-stat-icon">
              <Users size={17} />
            </div>
          </div>
          <p className="ar-stat-value">{loading ? '…' : activeCount}</p>
        </div>
        <div className="ar-stat-card">
          <div className="ar-stat-head">
            <p className="ar-stat-label">Paiements réussis</p>
            <div className="ar-stat-icon is-gold">
              <CheckCircle2 size={17} />
            </div>
          </div>
          <p className="ar-stat-value">{loading ? '…' : payments.length}</p>
          <p className="ar-stat-meta">{formatMoney(approvedRevenue)}</p>
        </div>
        <div className="ar-stat-card ar-stat-card-muted">
          <div className="ar-stat-head">
            <p className="ar-stat-label">Suivi live</p>
            <div className="ar-stat-icon is-navy">
              <Wifi size={17} />
            </div>
          </div>
          <p className="ar-live-status">
            <span className={`subscriptions-live-dot${liveConnected ? ' is-live' : ''}`} />
            {liveConnected ? 'Connecté' : 'Reconnexion…'}
          </p>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="subscriptions-tabs" role="tablist" aria-label="Abonnements">
        <button
          type="button"
          className={tab === 'subscribers' ? 'active' : ''}
          onClick={() => setActiveTab('subscribers')}
        >
          Abonnés
        </button>
        <button
          type="button"
          className={tab === 'payments' ? 'active' : ''}
          onClick={() => setActiveTab('payments')}
        >
          Paiements réussis
        </button>
        <button
          type="button"
          className={tab === 'pricing' ? 'active' : ''}
          onClick={() => setActiveTab('pricing')}
        >
          Tarifs
        </button>
        <button type="button" className="subscriptions-refresh" onClick={() => void refresh()}>
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {tab === 'subscribers' ? (
        <>
          <div className="ar-toolbar">
            <form onSubmit={handleSearch} className="ar-filters">
              <label className="admin-field" style={{ minWidth: 240 }}>
                <span>Rechercher un apprenant</span>
                <span className="ar-search-field">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nom, e-mail, téléphone…"
                  />
                  <button type="submit" className="admin-btn admin-btn-secondary" aria-label="Rechercher">
                    <Search size={14} />
                  </button>
                </span>
              </label>
              <label className="admin-field">
                <span>Type d’abonnement</span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value as AccessModuleKey | '')}
                >
                  {moduleOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setGrantOpen(true)}>
              <Gift size={15} />
              Attribuer un abonnement
            </button>
          </div>

          {grantOpen ? (
            <form className="ar-grant-panel" onSubmit={(e) => void handleGrant(e)}>
              <div className="ar-grant-panel-head">
                <h3 className="ar-grant-panel-title">
                  <Gift size={18} />
                  Attribution exceptionnelle
                </h3>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setGrantOpen(false)}
                  aria-label="Fermer"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="ar-grant-panel-hint">
                Active immédiatement un abonnement sans paiement. À utiliser uniquement au cas par cas.
              </p>
              <div className="ar-grant-grid">
                <label className="admin-field">
                  <span>Apprenant</span>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Filtrer la liste…"
                  />
                  <select value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} required>
                    <option value="">Choisir…</option>
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} — {user.email || user.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Type d’abonnement</span>
                  <select
                    value={grantModule}
                    onChange={(e) => setGrantModule(e.target.value as AccessModuleKey)}
                  >
                    {grantModules.map((key) => (
                      <option key={key} value={key}>
                        {moduleLabel(key)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>
                    {grantModule === 'conduite_heures'
                      ? 'Nombre d’heures'
                      : grantModule === 'conduite_videos' || grantModule === 'code'
                        ? 'Nombre de mois'
                        : 'Quantité'}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={grantQuantity}
                    onChange={(e) => setGrantQuantity(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="admin-field">
                <span>Note (optionnel)</span>
                <textarea
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  rows={2}
                  placeholder="Motif de l’attribution…"
                />
              </label>
              <div className="ar-grant-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={granting}>
                  {granting ? 'Attribution…' : 'Confirmer'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => setGrantOpen(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : null}

          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Abonnement</th>
                  <th>Durée</th>
                  <th>Temps restant</th>
                  <th>Source</th>
                  <th>Fin</th>
                </tr>
              </thead>
              <tbody>
                {loading && subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="ar-empty-row">Chargement…</div>
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="ar-empty-row">
                        <Users size={26} />
                        Aucun abonnement actif pour ce filtre.
                      </div>
                    </td>
                  </tr>
                ) : (
                  subscribers.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="ar-learner">
                          <span className="ar-avatar">{initials(row.learner)}</span>
                          <div className="ar-learner-body">
                            <div className="ar-learner-name">{learnerName(row.learner)}</div>
                            <div className="ar-learner-meta">
                              {row.learner?.phone || row.learner?.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <ModuleChip module={row.module} />
                      </td>
                      <td>{row.durationLabel}</td>
                      <td>
                        <StatusBadge tone="success">{row.remainingLabel}</StatusBadge>
                      </td>
                      <td>
                        <StatusBadge tone={row.source === 'admin' ? 'warning' : 'success'}>
                          {row.source === 'admin' ? 'Attribué' : 'Payé'}
                        </StatusBadge>
                      </td>
                      <td className="muted">{formatDateTime(row.endAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === 'payments' ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Apprenant</th>
                <th>Montant</th>
                <th>Abonnement(s)</th>
                <th>Canal</th>
                <th>Référence</th>
                <th>Payé le</th>
              </tr>
            </thead>
            <tbody>
              {loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="ar-empty-row">Chargement…</div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="ar-empty-row">
                      <CheckCircle2 size={26} />
                      Aucun paiement réussi pour le moment.
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const modules =
                    payment.modules && payment.modules.length > 0
                      ? payment.modules
                      : payment.module
                        ? [payment.module]
                        : []
                  return (
                    <tr key={payment.id}>
                      <td>
                        <div className="ar-learner">
                          <span className="ar-avatar">{initials(payment.learner)}</span>
                          <div className="ar-learner-body">
                            <div className="ar-learner-name">{learnerName(payment.learner)}</div>
                            <div className="ar-learner-meta">
                              {payment.learner?.phone || payment.learner?.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                      </td>
                      <td>
                        {modules.length ? (
                          <div className="ar-row-actions">
                            {modules.map((key) => (
                              <ModuleChip key={key} module={key} />
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{paymentChannelLabel(payment)}</td>
                      <td className="muted">{payment.fedapayReference || '—'}</td>
                      <td className="muted">
                        {formatDateTime(payment.activatedAt || payment.createdAt)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'pricing' ? (
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Unité</th>
                <th>Prix</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pricing.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="ar-empty-row">
                      <Wallet size={26} />
                      Aucun tarif configuré.
                    </div>
                  </td>
                </tr>
              ) : (
                pricing.map((module) => {
                  const Icon = moduleIcons[module.key] || BookOpen
                  return (
                    <tr key={module.key}>
                      <td>
                        <div className="ar-pricing-module">
                          <span className="ar-pricing-icon">
                            <Icon size={17} />
                          </span>
                          <div>
                            <div className="ar-learner-name">{module.label}</div>
                            <div className="ar-learner-meta">{moduleLabel(module.key)}</div>
                          </div>
                        </div>
                      </td>
                      <td>{unitLabel(module.unit)}</td>
                      <td>
                        <span className="ar-price-field">
                          <input
                            value={pricingDrafts[module.key] ?? ''}
                            onChange={(e) =>
                              setPricingDrafts((current) => ({ ...current, [module.key]: e.target.value }))
                            }
                          />
                          <span>FCFA</span>
                        </span>
                      </td>
                      <td>
                        <StatusBadge tone={module.active ? 'success' : 'danger'}>
                          {module.active ? 'Actif' : 'Inactif'}
                        </StatusBadge>
                      </td>
                      <td>
                        <div className="ar-row-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            disabled={pricingBusy === module.key}
                            onClick={() => void handlePricingSave(module.key)}
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            disabled={pricingBusy === module.key}
                            onClick={() => void handlePricingToggleActive(module)}
                          >
                            {module.active ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** Alias historique */
export const AccessRequestsPage = AbonnementsPage
