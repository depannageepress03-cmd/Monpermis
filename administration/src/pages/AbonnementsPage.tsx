import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Gift, RefreshCw, Search } from 'lucide-react'
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
  { value: 'aiChat', label: 'Chat IA tuteur' },
]

const grantModules: AccessModuleKey[] = [
  'code',
  'conduite_videos',
  'conduite_heures',
  'ecodepermis',
  'aiChat',
]

function moduleLabel(module: AccessModuleKey) {
  return moduleOptions.find((option) => option.value === module)?.label ?? module
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
    setPricing(modules)
    setPricingDrafts(Object.fromEntries(modules.map((m) => [m.key, String(m.price)])))
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
          <p className="ar-stat-label">Abonnements actifs</p>
          <p className="ar-stat-value">{loading ? '…' : activeCount}</p>
        </div>
        <div className="ar-stat-card">
          <p className="ar-stat-label">Paiements réussis</p>
          <p className="ar-stat-value">{loading ? '…' : payments.length}</p>
          <p className="ar-stat-meta">{formatMoney(approvedRevenue)}</p>
        </div>
        <div className="ar-stat-card ar-stat-card-muted">
          <p className="ar-stat-label">Suivi live</p>
          <p className="ar-stat-value" style={{ fontSize: 16 }}>
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
          <div className="ar-filters" style={{ alignItems: 'end' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <label className="admin-field" style={{ flex: '1 1 220px' }}>
                <span>Rechercher un apprenant</span>
                <span style={{ display: 'flex', gap: 8 }}>
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
              <Gift size={14} />
              Attribuer un abonnement
            </button>
          </div>

          {grantOpen ? (
            <form className="ar-detail admin-panel" onSubmit={(e) => void handleGrant(e)}>
              <h3 style={{ marginTop: 0 }}>Attribution exceptionnelle</h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Active immédiatement un abonnement sans paiement. À utiliser uniquement au cas par cas.
              </p>
              <div className="ar-detail-grid">
                <label className="admin-field">
                  <span>Apprenant</span>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Filtrer la liste…"
                  />
                  <select
                    value={grantUserId}
                    onChange={(e) => setGrantUserId(e.target.value)}
                    required
                    style={{ marginTop: 8 }}
                  >
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
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
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
                    <td colSpan={6} className="muted">
                      Chargement…
                    </td>
                  </tr>
                ) : subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      Aucun abonnement actif.
                    </td>
                  </tr>
                ) : (
                  subscribers.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{learnerName(row.learner)}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {row.learner?.phone || row.learner?.email || '—'}
                        </div>
                      </td>
                      <td>{moduleLabel(row.module)}</td>
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
                  <td colSpan={6} className="muted">
                    Chargement…
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Aucun paiement réussi pour le moment.
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
                        <strong>{learnerName(payment.learner)}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {payment.learner?.phone || payment.learner?.email || '—'}
                        </div>
                      </td>
                      <td>{formatMoney(payment.amount, payment.currency)}</td>
                      <td>
                        {modules.length
                          ? modules.map((key) => moduleLabel(key)).join(' + ')
                          : '—'}
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
              {pricing.map((module) => (
                <tr key={module.key}>
                  <td>
                    <strong>{module.label}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {moduleLabel(module.key)}
                    </div>
                  </td>
                  <td>{unitLabel(module.unit)}</td>
                  <td>
                    <input
                      value={pricingDrafts[module.key] ?? ''}
                      onChange={(e) =>
                        setPricingDrafts((current) => ({ ...current, [module.key]: e.target.value }))
                      }
                      style={{ width: 120 }}
                    />{' '}
                    FCFA
                  </td>
                  <td>
                    <StatusBadge tone={module.active ? 'success' : 'danger'}>
                      {module.active ? 'Actif' : 'Inactif'}
                    </StatusBadge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

/** Alias historique */
export const AccessRequestsPage = AbonnementsPage
