import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Bot,
  BookOpen,
  Car,
  CheckCircle2,
  Gift,
  RefreshCw,
  Search,
  Users,
  Video,
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
  resolvePaymentRefund,
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
import { PageSection } from '../components/model/PageSection'
import { nf } from '../components/model/ModelCharts'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../ui'

type Tab = 'subscribers' | 'payments' | 'refunds' | 'pricing'

const moduleOptions: { value: AccessModuleKey | ''; label: string }[] = [
  { value: '', label: 'Tous les abonnements' },
  { value: 'code', label: 'Code de la route' },
  { value: 'conduite_heures', label: 'Heures de conduite' },
  { value: 'conduite_videos', label: 'Vidéos conduite' },
]

const grantModules: AccessModuleKey[] = [
  'code',
  'conduite_videos',
  'conduite_heures',
]

/** Modules masqués de l’onglet Tarifs (prix non éditables / inclus ailleurs). */
const HIDDEN_PRICING_MODULES: AccessModuleKey[] = ['aiChat', 'conduite_videos']

function moduleLabel(module: AccessModuleKey | string) {
  if (module === 'aiChat') return 'Chat IA tuteur (retiré)'
  if (module === 'ecodepermis') return 'E-Codepermis (retiré)'
  return moduleOptions.find((option) => option.value === module)?.label ?? module
}

const moduleIcons: Record<AccessModuleKey, typeof BookOpen> = {
  code: BookOpen,
  conduite_heures: Car,
  conduite_videos: Video,
  aiChat: Bot,
}

const MODULE_TONE: Record<string, string> = {
  code: 'cx-m-code',
  conduite_heures: 'cx-m-cond',
  conduite_videos: 'cx-m-vid',
  aiChat: 'cx-m-ai',
}

function ModuleChip({ module }: { module: AccessModuleKey }) {
  const Icon = moduleIcons[module] || BookOpen
  return (
    <span className={`cx-mod ${MODULE_TONE[module] ?? ''}`.trim()}>
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
    initialTab === 'payments' || initialTab === 'pricing' || initialTab === 'refunds'
      ? initialTab
      : 'subscribers',
  )

  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [payments, setPayments] = useState<AccessPayment[]>([])
  const [refundPayments, setRefundPayments] = useState<AccessPayment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [stats, setStats] = useState<AccessStats | null>(null)
  const [pricing, setPricing] = useState<AccessModulePricing[]>([])
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, string>>({})
  const [pricingBusy, setPricingBusy] = useState<string | null>(null)
  const [refundNotes, setRefundNotes] = useState<Record<string, string>>({})
  const [refundBusy, setRefundBusy] = useState<string | null>(null)

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

  const loadRefunds = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { payments: rows } = await fetchApprovedPayments(token, { needsRefund: true })
    setRefundPayments(rows)
  }, [])

  const loadPricing = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    const { modules } = await fetchAccessModulePricing(token)
    const editable = modules.filter((m) => !HIDDEN_PRICING_MODULES.includes(m.key))
    setPricing(editable)
    setPricingDrafts(Object.fromEntries(editable.map((m) => [m.key, String(m.price)])))
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
      await Promise.all([
        loadSubscribers(),
        loadPayments(),
        loadRefunds(),
        loadPricing(),
        loadStats(),
        loadUsers(),
      ])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [loadSubscribers, loadPayments, loadRefunds, loadPricing, loadStats, loadUsers])

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
        if (payment.needsRefund) {
          setRefundPayments((current) => {
            const without = current.filter((item) => item.id !== payment.id)
            return [payment, ...without]
          })
        }
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

  const handleResolveRefund = async (paymentId: string) => {
    const token = getAdminToken()
    if (!token) return
    const note = (refundNotes[paymentId] || '').trim()
    if (!note) {
      setError('Ajoute une note de résolution (ex. remboursé FedaPay / Mobile Money).')
      return
    }
    setRefundBusy(paymentId)
    setError(null)
    setSuccess(null)
    try {
      await resolvePaymentRefund(token, paymentId, note)
      setRefundPayments((current) => current.filter((item) => item.id !== paymentId))
      setRefundNotes((current) => {
        const next = { ...current }
        delete next[paymentId]
        return next
      })
      setSuccess('Paiement marqué comme remboursé / résolu.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Résolution impossible.')
    } finally {
      setRefundBusy(null)
    }
  }

  const person = (learner: { firstName?: string; lastName?: string; phone?: string; email?: string } | null | undefined) => (
    <div className="cx-person">
      <span className="cx-avatar">{initials(learner)}</span>
      <div>
        <strong>{learnerName(learner)}</strong>
        <small>{learner?.phone || learner?.email || '—'}</small>
      </div>
    </div>
  )

  const paymentModules = (payment: AccessPayment) =>
    payment.modules && payment.modules.length > 0 ? payment.modules : payment.module ? [payment.module] : []

  const tabs: { key: Tab; label: string }[] = [
    { key: 'subscribers', label: 'Abonnés' },
    { key: 'payments', label: 'Paiements réussis' },
    { key: 'refunds', label: `À rembourser${refundPayments.length > 0 ? ` (${refundPayments.length})` : ''}` },
    { key: 'pricing', label: 'Tarifs' },
  ]

  return (
    <PageSection
      kicker="Abonnements"
      title="Abonnés"
      subtitle="Liste des abonnements actifs, attribution exceptionnelle et flux des paiements réussis."
      actions={
        <>
          <span className={`cx-live${liveConnected ? ' is-live' : ''}`}>
            <i aria-hidden="true" />
            {liveConnected ? 'Suivi en direct' : 'Reconnexion…'}
          </span>
          <button type="button" className="cx-refresh" onClick={() => void refresh()}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
        </>
      }
    >
      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Users aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Abonnements actifs</span>
            <span className="cx-kc-value">{loading ? '…' : nf(activeCount)}</span>
            <span className="cx-kc-sub">pour le filtre en cours</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Paiements réussis</span>
            <span className="cx-kc-value">{loading ? '…' : nf(payments.length)}</span>
            <span className="cx-kc-sub">{formatMoney(approvedRevenue)}</span>
          </div>
        </div>
        <div className={`cx-kc${refundPayments.length > 0 ? ' cx-kc-alert' : ''}`}>
          <span className={`cx-kc-ico ${refundPayments.length > 0 ? 'cx-kc-red' : 'cx-kc-gold'}`}>
            <AlertTriangle aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">À rembourser</span>
            <span className="cx-kc-value">{loading ? '…' : nf(refundPayments.length)}</span>
            <span className="cx-kc-sub">{refundPayments.length > 0 ? 'à traiter' : 'rien en attente'}</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <Wifi aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Suivi live</span>
            <span className="cx-kc-value" style={{ fontSize: '1.15rem' }}>
              {liveConnected ? 'Connecté' : 'Reconnexion…'}
            </span>
            <span className="cx-kc-sub">paiements en temps réel</span>
          </div>
        </div>
      </div>

      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="cx-tabs" role="tablist" aria-label="Abonnements">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                className={tab === item.key ? 'cx-active' : ''}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'subscribers' ? (
          <>
            <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
              <form onSubmit={handleSearch} className="cx-toolbar" style={{ flex: 1 }}>
                <label className="cx-search">
                  <Search aria-hidden />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, téléphone…" aria-label="Rechercher un apprenant" />
                </label>
                <select
                  className="cx-select"
                  style={{ width: 'auto', minWidth: '12rem' }}
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value as AccessModuleKey | '')}
                  aria-label="Type d’abonnement"
                >
                  {moduleOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button type="submit" className="cx-btn">
                  <Search aria-hidden />
                  Rechercher
                </button>
              </form>
              <button type="button" className="cx-btn cx-btn-fill" onClick={() => setGrantOpen(true)}>
                <Gift aria-hidden />
                Attribuer un abonnement
              </button>
            </div>

            {grantOpen ? (
              <form className="cx-block" style={{ marginBottom: '1rem' }} onSubmit={(e) => void handleGrant(e)}>
                <div className="cx-toolbar">
                  <h3 style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <Gift size={16} aria-hidden /> Attribution exceptionnelle
                  </h3>
                  <button type="button" className="cx-btn cx-btn-icon" onClick={() => setGrantOpen(false)} aria-label="Fermer">
                    <X aria-hidden />
                  </button>
                </div>
                <p>Active immédiatement un abonnement sans paiement. À utiliser uniquement au cas par cas.</p>
                <div className="cx-form-grid">
                  <div className="cx-fld">
                    <label htmlFor="grant-user">Apprenant</label>
                    <input className="cx-input" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Filtrer la liste…" />
                    <select id="grant-user" className="cx-select" value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} required>
                      <option value="">Choisir…</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} — {user.email || user.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cx-fld">
                    <label htmlFor="grant-module">Type d’abonnement</label>
                    <select id="grant-module" className="cx-select" value={grantModule} onChange={(e) => setGrantModule(e.target.value as AccessModuleKey)}>
                      {grantModules.map((key) => (
                        <option key={key} value={key}>
                          {moduleLabel(key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cx-fld">
                    <label htmlFor="grant-qty">
                      {grantModule === 'conduite_heures' ? 'Nombre d’heures' : grantModule === 'conduite_videos' || grantModule === 'code' ? 'Nombre de mois' : 'Quantité'}
                    </label>
                    <input id="grant-qty" className="cx-input" type="number" min={1} value={grantQuantity} onChange={(e) => setGrantQuantity(e.target.value)} required />
                  </div>
                </div>
                <div className="cx-fld">
                  <label htmlFor="grant-note">Note (optionnel)</label>
                  <textarea id="grant-note" className="cx-textarea" value={grantNote} onChange={(e) => setGrantNote(e.target.value)} rows={2} placeholder="Motif de l’attribution…" />
                </div>
                <div className="cx-actions">
                  <button type="button" className="cx-btn" onClick={() => setGrantOpen(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="cx-btn cx-btn-fill" disabled={granting}>
                    {granting ? 'Attribution…' : 'Confirmer'}
                  </button>
                </div>
              </form>
            ) : null}

            {loading && subscribers.length === 0 ? (
              <SkeletonBlock rows={4} />
            ) : subscribers.length === 0 ? (
              <EmptyState title="Aucun abonnement" description="Aucun abonnement actif pour ce filtre." />
            ) : (
              <div className="cx-table-wrap">
                <table className="cx-data">
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
                    {subscribers.map((row) => (
                      <tr key={row.id}>
                        <td>{person(row.learner)}</td>
                        <td>
                          <ModuleChip module={row.module} />
                        </td>
                        <td>{row.durationLabel}</td>
                        <td>
                          <span className="cx-chip cx-green">{row.remainingLabel}</span>
                        </td>
                        <td>
                          <span className={`cx-chip ${row.source === 'admin' ? 'cx-amber' : 'cx-green'}`}>
                            {row.source === 'admin' ? 'Attribué' : 'Payé'}
                          </span>
                        </td>
                        <td className="cx-dim">{formatDateTime(row.endAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {tab === 'payments' ? (
          loading && payments.length === 0 ? (
            <SkeletonBlock rows={4} />
          ) : payments.length === 0 ? (
            <EmptyState title="Aucun paiement" description="Aucun paiement réussi pour le moment." />
          ) : (
            <div className="cx-table-wrap">
              <table className="cx-data">
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
                  {payments.map((payment) => {
                    const modules = paymentModules(payment)
                    return (
                      <tr key={payment.id}>
                        <td>{person(payment.learner)}</td>
                        <td>
                          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                        </td>
                        <td>
                          {modules.length ? (
                            <div className="cx-row-actions" style={{ flexWrap: 'wrap' }}>
                              {modules.map((key) => (
                                <ModuleChip key={key} module={key} />
                              ))}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{paymentChannelLabel(payment)}</td>
                        <td className="cx-dim">{payment.fedapayReference || '—'}</td>
                        <td className="cx-dim">{formatDateTime(payment.activatedAt || payment.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'refunds' ? (
          <>
            <p className="cx-note cx-note-info" style={{ marginBottom: '1rem' }}>
              Paiements encaissés sans livraison d’accès (orphelins / conflit). Rembourse côté FedaPay / opérateur,
              puis marque comme résolu avec une note. Vue complète dans{' '}
              <Link to="/finances?tab=refunds">Finances → À rembourser</Link>.
            </p>
            {loading && refundPayments.length === 0 ? (
              <SkeletonBlock rows={3} />
            ) : refundPayments.length === 0 ? (
              <EmptyState title="Rien à rembourser" description="Aucun paiement à rembourser." />
            ) : (
              <div className="cx-rows">
                {refundPayments.map((payment) => {
                  const modules = paymentModules(payment)
                  const kindLabel =
                    payment.kind === 'reservation' ? 'Réservation' : payment.kind === 'abonnement' ? 'Abonnement' : 'Autre'
                  return (
                    <div key={payment.id} className="cx-pay-row">
                      <div className="cx-row-main" style={{ flex: '1 1 16rem' }}>
                        {person(payment.learner)}
                        <small style={{ display: 'block', marginTop: '.4rem', color: 'var(--ink-soft)' }}>
                          {payment.fedapayReference || payment.declaredReference || '—'} · {formatDateTime(payment.activatedAt || payment.createdAt)}
                        </small>
                        {payment.adminNote ? (
                          <small style={{ display: 'block', whiteSpace: 'pre-wrap', color: 'var(--ink-soft)' }}>{payment.adminNote}</small>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', alignItems: 'flex-start' }}>
                        <span className="cx-amount">{formatMoney(payment.amount, payment.currency)}</span>
                        <small style={{ color: 'var(--ink-soft)' }}>{paymentChannelLabel(payment)}</small>
                        <span className="cx-chip cx-amber">{kindLabel}</span>
                        {modules.map((key) => (
                          <ModuleChip key={key} module={key} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', flex: '1 1 15rem' }}>
                        <input
                          className="cx-input"
                          value={refundNotes[payment.id] ?? ''}
                          onChange={(e) => setRefundNotes((current) => ({ ...current, [payment.id]: e.target.value }))}
                          placeholder="Ex. remboursé MTN le 29/07"
                          disabled={refundBusy === payment.id}
                        />
                        <button
                          type="button"
                          className="cx-btn cx-btn-fill"
                          disabled={refundBusy === payment.id}
                          onClick={() => void handleResolveRefund(payment.id)}
                        >
                          {refundBusy === payment.id ? '…' : 'Marquer résolu'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : null}

        {tab === 'pricing' ? (
          pricing.length === 0 ? (
            <EmptyState title="Aucun tarif" description="Aucun tarif configuré." />
          ) : (
            <div className="cx-table-wrap">
              <table className="cx-data">
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
                  {pricing.map((module) => {
                    const Icon = moduleIcons[module.key] || BookOpen
                    return (
                      <tr key={module.key}>
                        <td>
                          <div className="cx-person">
                            <span className="cx-avatar">
                              <Icon size={17} aria-hidden />
                            </span>
                            <div>
                              <strong>{module.label}</strong>
                              <small>{moduleLabel(module.key)}</small>
                            </div>
                          </div>
                        </td>
                        <td>{unitLabel(module.unit)}</td>
                        <td>
                          <span className="cx-toolbar" style={{ flexWrap: 'nowrap', gap: '.4rem' }}>
                            <input
                              className="cx-input"
                              style={{ minWidth: 0, width: '7.5rem' }}
                              value={pricingDrafts[module.key] ?? ''}
                              onChange={(e) => setPricingDrafts((current) => ({ ...current, [module.key]: e.target.value }))}
                              aria-label={`Prix ${module.label}`}
                            />
                            <span className="cx-dim">FCFA</span>
                          </span>
                        </td>
                        <td>
                          <span className={`cx-chip ${module.active ? 'cx-green' : 'cx-red'}`}>{module.active ? 'Actif' : 'Inactif'}</span>
                        </td>
                        <td>
                          <div className="cx-row-actions">
                            <button type="button" className="cx-btn cx-btn-sm cx-btn-fill" disabled={pricingBusy === module.key} onClick={() => void handlePricingSave(module.key)}>
                              Enregistrer
                            </button>
                            <button type="button" className="cx-btn cx-btn-sm" disabled={pricingBusy === module.key} onClick={() => void handlePricingToggleActive(module)}>
                              {module.active ? 'Désactiver' : 'Activer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </PageSection>
  )
}

/** Alias historique */
export const AccessRequestsPage = AbonnementsPage
