import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react'
import {
  fetchAccessModulePricing,
  fetchAccessRequestDetail,
  fetchAccessRequests,
  fetchAccessStats,
  paymentChannelLabel,
  subscribeToAccessRequestEvents,
  unitLabel,
  updateAccessModulePricing,
  validateAccessRequest,
  type AccessAuditEntry,
  type AccessModuleKey,
  type AccessModulePricing,
  type AccessPayment,
  type AccessRequest,
  type AccessRequestStatus,
  type AccessStats,
} from '../api/accessRequests'
import { StatusBadge, type StatusTone } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

type Tab = 'requests' | 'pricing'

const statusOptions: { value: AccessRequestStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'paiement_declare', label: 'Paiement déclaré (legacy)' },
  { value: 'en_verification', label: 'Mobile Money en confirmation' },
  { value: 'valide', label: 'Validé' },
  { value: 'actif', label: 'Actif' },
  { value: 'expire', label: 'Expiré' },
  { value: 'rejete', label: 'Rejeté' },
]

const moduleOptions: { value: AccessModuleKey | ''; label: string }[] = [
  { value: '', label: 'Tous modules' },
  { value: 'code', label: 'Code de la route' },
  { value: 'conduite_heures', label: 'Heures de conduite' },
  { value: 'conduite_videos', label: 'Vidéos conduite' },
  { value: 'ecodepermis', label: 'E-Codepermis' },
  { value: 'aiChat', label: 'Chat IA tuteur' },
]

function moduleLabel(module: AccessModuleKey) {
  return moduleOptions.find((option) => option.value === module)?.label ?? module
}

function statusLabel(status: AccessRequestStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status
}

function statusTone(status: AccessRequestStatus): StatusTone {
  if (status === 'actif' || status === 'valide') return 'success'
  if (status === 'en_attente' || status === 'paiement_declare' || status === 'en_verification') return 'warning'
  return 'danger' // expire, rejete
}

function formatMoney(value: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
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

export function AccessRequestsPage() {
  const location = useLocation()
  const [tab, setTab] = useState<Tab>('requests')

  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<AccessRequestStatus | ''>('')
  const [moduleFilter, setModuleFilter] = useState<AccessModuleKey | ''>('')
  const [liveConnected, setLiveConnected] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const [stats, setStats] = useState<AccessStats | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ audit: AccessAuditEntry[]; payments: AccessPayment[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [decision, setDecision] = useState<'valide' | 'rejete'>('valide')
  const [decisionNote, setDecisionNote] = useState('')
  const [validating, setValidating] = useState(false)

  const [pricing, setPricing] = useState<AccessModulePricing[]>([])
  const [pricingDrafts, setPricingDrafts] = useState<Record<string, string>>({})
  const [pricingBusy, setPricingBusy] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    setLoading(true)
    try {
      const { accessRequests } = await fetchAccessRequests(token, { status: statusFilter, module: moduleFilter })
      setRequests(accessRequests)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, moduleFilter])

  const loadStats = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      setStats(await fetchAccessStats(token))
    } catch {
      // discret — non bloquant pour la page
    }
  }, [])

  const loadPricing = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    try {
      const { modules } = await fetchAccessModulePricing(token)
      setPricing(modules)
      setPricingDrafts(Object.fromEntries(modules.map((m) => [m.key, String(m.price)])))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement des tarifs impossible.')
    }
  }, [])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    if (tab === 'pricing') void loadPricing()
  }, [tab, loadPricing])

  // Flux temps réel — actif tant que la page est montée.
  useEffect(() => {
    const token = getAdminToken()
    if (!token) return

    unsubscribeRef.current = subscribeToAccessRequestEvents(
      token,
      (updated) => {
        setRequests((current) => {
          const exists = current.some((item) => item.id === updated.id)
          if (!exists) {
            if (statusFilter && updated.status !== statusFilter) return current
            if (moduleFilter && updated.module !== moduleFilter) return current
            return [updated, ...current]
          }
          return current.map((item) => (item.id === updated.id ? updated : item))
        })
        setSelectedId((current) => {
          if (current === updated.id) void loadDetailFor(updated.id)
          return current
        })
        void loadStats()
      },
      setLiveConnected,
    )

    return () => {
      unsubscribeRef.current?.()
      unsubscribeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, moduleFilter])

  const loadDetailFor = useCallback(async (id: string) => {
    const token = getAdminToken()
    if (!token) return
    setDetailLoading(true)
    try {
      const data = await fetchAccessRequestDetail(token, id)
      setDetail({ audit: data.audit, payments: data.payments })
      setRequests((current) => current.map((item) => (item.id === id ? data.accessRequest : item)))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement du détail impossible.')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const openDetail = (id: string) => {
    setSelectedId(id)
    setDecision('valide')
    setDecisionNote('')
    void loadDetailFor(id)
  }

  useEffect(() => {
    const selectedFromNav = (location.state as { selectedId?: string } | null)?.selectedId
    if (selectedFromNav) openDetail(selectedFromNav)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const closeDetail = () => {
    setSelectedId(null)
    setDetail(null)
  }

  const handleValidate = async (event: FormEvent) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token || !selectedId) return
    if (!decisionNote.trim()) {
      setError('Une note est obligatoire pour valider ou rejeter une demande.')
      return
    }
    setValidating(true)
    setError(null)
    setSuccess(null)
    try {
      await validateAccessRequest(token, selectedId, { decision, note: decisionNote.trim() })
      setSuccess(decision === 'valide' ? 'Demande validée.' : 'Demande rejetée.')
      await loadDetailFor(selectedId)
      await loadRequests()
      await loadStats()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Action impossible.')
    } finally {
      setValidating(false)
    }
  }

  const handlePricingSave = async (key: AccessModuleKey) => {
    const token = getAdminToken()
    if (!token) return
    const raw = pricingDrafts[key]
    const price = Number(raw)
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
      const { module: updated } = await updateAccessModulePricing(token, module.key, { active: !module.active })
      setPricing((current) => current.map((item) => (item.key === module.key ? updated : item)))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible.')
    } finally {
      setPricingBusy(null)
    }
  }

  const handleMigrateVideosToMonth = async (module: AccessModulePricing) => {
    const token = getAdminToken()
    if (!token) return
    setPricingBusy(module.key)
    setError(null)
    setSuccess(null)
    try {
      const { module: updated } = await updateAccessModulePricing(token, module.key, {
        unit: 'month',
        price: 1500,
        label: 'Vidéos pédagogiques conduite',
      })
      setPricing((current) => current.map((item) => (item.key === module.key ? updated : item)))
      setPricingDrafts((current) => ({ ...current, [module.key]: '1500' }))
      setSuccess('Tarif vidéos migré vers 1 500 FCFA / mois.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Migration impossible.')
    } finally {
      setPricingBusy(null)
    }
  }

  const selectedRequest = requests.find((r) => r.id === selectedId) || null

  return (
    <div className="admin-page access-requests-page">
      <header className="admin-module-header">
        <p className="admin-module-kicker">Accès et paiements</p>
        <h1 className="admin-module-title">Demandes d’accès</h1>
        <p className="admin-module-subtitle">
          Paiements Mobile Money (MTN, Moov, Celtiis via FedaPay), paniers multi-offres et tarifs modules
          indépendants.
        </p>
        <div className="accent-row" aria-hidden>
          <span className="accent accent-green" />
          <span className="accent accent-gold" />
          <span className="accent accent-navy" />
        </div>
      </header>

      {stats ? (
        <section className="ar-stats-row">
          {stats.pendingOver24h > 0 ? (
            <div className="ar-alert-card">
              <AlertTriangle size={18} />
              <span>
                <strong>{stats.pendingOver24h}</strong> demande{stats.pendingOver24h > 1 ? 's' : ''} en attente
                depuis plus de 24h
              </span>
            </div>
          ) : null}
          {stats.revenueByModule.map((row) => (
            <div className="ar-stat-card" key={row.module}>
              <p className="ar-stat-label">{moduleLabel(row.module)}</p>
              <p className="ar-stat-value">{formatMoney(row.total)}</p>
              <p className="ar-stat-meta">{row.count} demande{row.count > 1 ? 's' : ''}</p>
            </div>
          ))}
          {stats.revenueByMethod.map((row) => (
            <div className="ar-stat-card ar-stat-card-muted" key={row.method}>
              <p className="ar-stat-label">{row.method === 'fedapay' ? 'Mobile Money' : 'Hors ligne'}</p>
              <p className="ar-stat-value">{formatMoney(row.total)}</p>
              <p className="ar-stat-meta">{row.count} paiement{row.count > 1 ? 's' : ''}</p>
            </div>
          ))}
        </section>
      ) : null}

      <div className="subscriptions-tabs" role="tablist" aria-label="Demandes d’accès">
        <button type="button" role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
          Demandes <span>{requests.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'pricing'} className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>
          Tarifs
        </button>
        <button type="button" className="dash-filter-btn subscriptions-refresh" onClick={() => void loadRequests()} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> Actualiser
        </button>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {success ? <p className="form-success" role="status">{success}</p> : null}

      {tab === 'requests' ? (
        <section className="subscriptions-panel">
          <div className="subscriptions-panel-head">
            <div>
              <h2>
                Toutes les demandes
                <span className={`subscriptions-live-dot${liveConnected ? ' is-live' : ''}`} aria-hidden="true" />
                <span className="subscriptions-live-label">{liveConnected ? 'En direct' : 'Connexion…'}</span>
              </h2>
              <p>Filtrez par statut ou module, cliquez une ligne pour l’historique complet.</p>
            </div>
            <div className="ar-filters">
              <label className="subscriptions-status-filter">
                Statut
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AccessRequestStatus | '')}>
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="subscriptions-status-filter">
                Module
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value as AccessModuleKey | '')}>
                  {moduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="admin-data-table-wrap">
            <table className="admin-data-table subscriptions-table">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Module</th>
                  <th>Quantité</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Créée le</th>
                </tr>
              </thead>
              <tbody>
                {loading && requests.length === 0 ? <tr><td colSpan={6} className="muted">Chargement…</td></tr> : null}
                {!loading && requests.length === 0 ? <tr><td colSpan={6} className="muted">Aucune demande pour ce filtre.</td></tr> : null}
                {requests.map((request) => (
                  <tr key={request.id} className="ar-row" onClick={() => openDetail(request.id)}>
                    <td>
                      {request.learner ? (
                        <>
                          <strong>{request.learner.firstName} {request.learner.lastName}</strong>
                          <br />
                          <span className="muted">{request.learner.email || request.learner.phone || '—'}</span>
                        </>
                      ) : '—'}
                    </td>
                    <td>{moduleLabel(request.module)}</td>
                    <td>
                      {request.quantity}
                      {request.unit === 'hour' ? ' h' : request.unit === 'week' ? ' sem.' : request.unit === 'month' ? ' mois' : ''}
                    </td>
                    <td>{formatMoney(request.amount, request.currency)}</td>
                    <td><StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge></td>
                    <td>{formatDateTime(request.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedRequest ? (
            <div className="subscriptions-plan-form ar-detail">
              <div className="subscriptions-form-head">
                <h3>
                  {selectedRequest.learner ? `${selectedRequest.learner.firstName} ${selectedRequest.learner.lastName}` : 'Apprenant'}
                  {' — '}
                  {moduleLabel(selectedRequest.module)}
                </h3>
                <button type="button" className="btn-icon-muted" onClick={closeDetail} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>

              {detailLoading ? <p className="admin-muted">Chargement…</p> : null}

              {!detailLoading && detail ? (
                <>
                  <div className="ar-detail-grid">
                    <div>
                      <p className="ar-detail-label">Statut actuel</p>
                      <StatusBadge tone={statusTone(selectedRequest.status)}>{statusLabel(selectedRequest.status)}</StatusBadge>
                    </div>
                    <div>
                      <p className="ar-detail-label">Montant</p>
                      <p>{formatMoney(selectedRequest.amount, selectedRequest.currency)}</p>
                    </div>
                    <div>
                      <p className="ar-detail-label">Période</p>
                      <p>{selectedRequest.startAt ? `${formatDateTime(selectedRequest.startAt)} → ${formatDateTime(selectedRequest.endAt)}` : '—'}</p>
                    </div>
                  </div>

                  <h4 className="ar-section-title">Historique (journal d’audit immuable)</h4>
                  <ol className="ar-audit-trail">
                    {detail.audit.map((entry) => (
                      <li key={entry.id}>
                        <div className="ar-audit-line">
                          <span className="ar-audit-transition">
                            {entry.fromStatus ? `${statusLabel(entry.fromStatus as AccessRequestStatus)} → ` : ''}
                            {statusLabel(entry.toStatus as AccessRequestStatus)}
                          </span>
                          <span className="ar-audit-date">{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <p className="ar-audit-actor">{entry.actorLabel || entry.actor}</p>
                        {entry.note ? <p className="ar-audit-note">{entry.note}</p> : null}
                      </li>
                    ))}
                  </ol>

                  {detail.payments.length > 0 ? (
                    <>
                      <h4 className="ar-section-title">Paiement(s)</h4>
                      {detail.payments.map((payment) => {
                        const linkedCount = payment.accessRequestIds?.length || 1
                        return (
                          <div className="ar-payment-card" key={payment.id}>
                            <p>
                              <strong>{paymentChannelLabel(payment)}</strong>
                              {' · '}
                              {formatMoney(payment.amount, payment.currency)}
                              {' · '}
                              {payment.status}
                            </p>
                            {linkedCount > 1 ? (
                              <p className="muted">Panier multi-offres · {linkedCount} demandes liées</p>
                            ) : null}
                            {payment.paymentMethod ? (
                              <p className="muted">Opérateur : {String(payment.paymentMethod).toUpperCase()}</p>
                            ) : null}
                            {payment.declaredReference ? (
                              <p className="muted">Référence déclarée (legacy) : {payment.declaredReference}</p>
                            ) : null}
                            {payment.fedapayReference ? (
                              <p className="muted">Référence FedaPay : {payment.fedapayReference}</p>
                            ) : null}
                            {payment.errorMessage ? <p className="muted">Erreur : {payment.errorMessage}</p> : null}
                            {payment.adminNote ? <p className="muted">Note admin : {payment.adminNote}</p> : null}
                          </div>
                        )
                      })}
                    </>
                  ) : null}

                  {['en_attente', 'paiement_declare'].includes(selectedRequest.status) ? (
                    <form className="ar-validate-form" onSubmit={handleValidate}>
                      <h4 className="ar-section-title">Décision admin (legacy / exception)</h4>
                      <p className="muted">
                        Les paiements Mobile Money en ligne passent automatiquement en confirmation. Cette
                        validation manuelle reste pour les anciennes demandes hors plateforme.
                      </p>
                      <div className="ar-decision-row">
                        <label>
                          <input type="radio" name="decision" checked={decision === 'valide'} onChange={() => setDecision('valide')} /> Valider
                        </label>
                        <label>
                          <input type="radio" name="decision" checked={decision === 'rejete'} onChange={() => setDecision('rejete')} /> Rejeter
                        </label>
                      </div>
                      <label>
                        Note (obligatoire)
                        <textarea rows={2} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Référence de reçu, justificatif, motif du refus…" required />
                      </label>
                      <button type="submit" className="subscriptions-primary-btn" disabled={validating}>
                        <Check size={16} /> {validating ? 'Enregistrement…' : 'Confirmer la décision'}
                      </button>
                    </form>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="subscriptions-panel">
          <div className="subscriptions-panel-head">
            <div>
              <h2>Tarifs des modules</h2>
              <p>
                Code 2 000 / mois · Vidéos 1 500 / mois · Heures 5 000 (−1 000 dès 2 h). Modifiables sans
                redéploiement.
              </p>
            </div>
          </div>
          <div className="ar-pricing-grid">
            {pricing.map((module) => (
              <article className="ar-pricing-card" key={module.key}>
                <div>
                  <h3>{module.label}</h3>
                  <p className="muted">{unitLabel(module.unit)}</p>
                  {module.key === 'conduite_heures' ? (
                    <p className="muted">
                      Remise panier : −{module.hoursDiscount ?? 1000} FCFA dès 2 h
                      {module.amountForTwoHours != null
                        ? ` (ex. 2 h = ${formatMoney(module.amountForTwoHours)})`
                        : ''}
                    </p>
                  ) : null}
                  {module.key === 'conduite_videos' && module.unit === 'week' ? (
                    <p className="form-error" role="status">
                      Tarif legacy « semaine » — migrer vers mois (1 500 FCFA) recommandé.
                    </p>
                  ) : null}
                </div>
                <label className="ar-price-input">
                  Prix (FCFA)
                  <input
                    type="number"
                    min="0"
                    value={pricingDrafts[module.key] ?? String(module.price)}
                    onChange={(event) =>
                      setPricingDrafts((current) => ({ ...current, [module.key]: event.target.value }))
                    }
                  />
                </label>
                <div className="ar-pricing-actions">
                  <button
                    type="button"
                    className="btn-outline-sm"
                    disabled={pricingBusy === module.key}
                    onClick={() => void handlePricingSave(module.key)}
                  >
                    Enregistrer
                  </button>
                  {module.key === 'conduite_videos' && module.unit === 'week' ? (
                    <button
                      type="button"
                      className="btn-outline-sm"
                      disabled={pricingBusy === module.key}
                      onClick={() => void handleMigrateVideosToMonth(module)}
                    >
                      Passer en mois / 1500
                    </button>
                  ) : null}
                  <label className="subscription-checkline">
                    <input
                      type="checkbox"
                      checked={module.active}
                      disabled={pricingBusy === module.key}
                      onChange={() => void handlePricingToggleActive(module)}
                    />
                    Actif au catalogue
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
