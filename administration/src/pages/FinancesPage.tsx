import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Download,
  Landmark,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { paymentChannelLabel } from '../api/accessRequests'
import {
  downloadFinanceCsv,
  fetchFinanceLedger,
  fetchFinancePaymentDetail,
  fetchFinanceSummary,
  financeKindLabel,
  financeStatusLabel,
  financeStatusTone,
  ledgerEventLabel,
  resolveFinanceRefund,
  type FinanceKind,
  type FinancePayment,
  type FinancePaymentDetail,
  type FinanceStatus,
  type FinanceSummary,
} from '../api/finances'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

type Tab = 'ledger' | 'refunds'

function formatMoney(value: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function learnerName(learner: FinancePayment['learner']) {
  if (!learner) return 'Apprenant'
  return `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Apprenant'
}

function initials(learner: FinancePayment['learner']) {
  if (!learner) return '?'
  const a = (learner.firstName || '').trim().charAt(0)
  const b = (learner.lastName || '').trim().charAt(0)
  return (a + b).toUpperCase() || '?'
}

export function FinancesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) || 'ledger'
  const [tab, setTab] = useState<Tab>(initialTab === 'refunds' ? 'refunds' : 'ledger')

  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [kpiPeriod, setKpiPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [payments, setPayments] = useState<FinancePayment[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [q, setQ] = useState(() => searchParams.get('q') || '')
  const [status, setStatus] = useState<FinanceStatus | ''>(
    () => (searchParams.get('status') as FinanceStatus | null) || '',
  )
  const [kind, setKind] = useState<FinanceKind | ''>(
    () => (searchParams.get('kind') as FinanceKind | null) || '',
  )
  const [operator, setOperator] = useState<'mtn' | 'moov' | 'celtiis' | ''>(
    () => (searchParams.get('operator') as 'mtn' | 'moov' | 'celtiis' | null) || '',
  )
  const [from, setFrom] = useState(() => searchParams.get('from') || '')
  const [to, setTo] = useState(() => searchParams.get('to') || '')

  const [detailId, setDetailId] = useState<string | null>(
    () => searchParams.get('payment') || null,
  )
  const [detail, setDetail] = useState<FinancePaymentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [refundNote, setRefundNote] = useState('')
  const [refundBusy, setRefundBusy] = useState(false)
  const [exporting, setExporting] = useState(false)

  const setActiveTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'ledger') params.delete('tab')
    else params.set('tab', next)
    if (next === 'refunds') {
      setStatus('needsRefund')
      params.set('status', 'needsRefund')
    }
    setSearchParams(params, { replace: true })
  }

  const syncParams = (nextPage = 1) => {
    const params = new URLSearchParams()
    if (tab === 'refunds') params.set('tab', 'refunds')
    if (q.trim()) params.set('q', q.trim())
    const effectiveStatus = tab === 'refunds' ? 'needsRefund' : status
    if (effectiveStatus) params.set('status', effectiveStatus)
    if (kind) params.set('kind', kind)
    if (operator) params.set('operator', operator)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (detailId) params.set('payment', detailId)
    if (nextPage > 1) params.set('page', String(nextPage))
    setSearchParams(params, { replace: true })
  }

  const loadSummary = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setSummary(await fetchFinanceSummary(token))
  }, [])

  const loadLedger = useCallback(
    async (nextPage = 1) => {
      const token = getAdminToken()
      if (!token) {
        setError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const effectiveStatus = tab === 'refunds' ? 'needsRefund' : status
        const data = await fetchFinanceLedger(token, {
          page: nextPage,
          limit: 40,
          status: effectiveStatus || undefined,
          kind: kind || undefined,
          operator: operator || undefined,
          q: q.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
        })
        setPayments(data.payments)
        setPage(data.pagination.page)
        setPages(data.pagination.pages)
        setTotal(data.pagination.total)
      } catch (err) {
        setError(isAuthError(err) ? err.message : 'Chargement impossible')
      } finally {
        setLoading(false)
      }
    },
    [tab, status, kind, operator, q, from, to],
  )

  const loadDetail = useCallback(async (paymentId: string) => {
    const token = getAdminToken()
    if (!token) return
    setDetailLoading(true)
    try {
      setDetail(await fetchFinancePaymentDetail(token, paymentId))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Détail indisponible')
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadLedger(1)
  }, [loadLedger])

  useEffect(() => {
    if (detailId) void loadDetail(detailId)
    else setDetail(null)
  }, [detailId, loadDetail])

  const openDetail = (id: string) => {
    setDetailId(id)
    setRefundNote('')
    const params = new URLSearchParams(searchParams)
    params.set('payment', id)
    setSearchParams(params, { replace: true })
  }

  const closeDetail = () => {
    setDetailId(null)
    setDetail(null)
    setRefundNote('')
    const params = new URLSearchParams(searchParams)
    params.delete('payment')
    setSearchParams(params, { replace: true })
  }

  const applyFilters = (e: FormEvent) => {
    e.preventDefault()
    syncParams(1)
    void loadLedger(1)
  }

  const resetFilters = () => {
    setQ('')
    setStatus(tab === 'refunds' ? 'needsRefund' : '')
    setKind('')
    setOperator('')
    setFrom('')
    setTo('')
    const params = new URLSearchParams()
    if (tab === 'refunds') {
      params.set('tab', 'refunds')
      params.set('status', 'needsRefund')
    }
    setSearchParams(params)
  }

  const handleExport = async () => {
    const token = getAdminToken()
    if (!token) return
    setExporting(true)
    setError(null)
    try {
      await downloadFinanceCsv(token, {
        status: (tab === 'refunds' ? 'needsRefund' : status) || undefined,
        kind: kind || undefined,
        operator: operator || undefined,
        q: q.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      setSuccess('Export CSV téléchargé.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Export impossible')
    } finally {
      setExporting(false)
    }
  }

  const handleResolveRefund = async () => {
    if (!detailId || !detail?.payment.needsRefund) return
    const note = refundNote.trim()
    if (!note) {
      setError('Une note de remboursement est obligatoire.')
      return
    }
    const token = getAdminToken()
    if (!token) return
    setRefundBusy(true)
    setError(null)
    try {
      await resolveFinanceRefund(token, detailId, note)
      setSuccess('Remboursement marqué comme traité.')
      setRefundNote('')
      await Promise.all([loadSummary(), loadLedger(page), loadDetail(detailId)])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setRefundBusy(false)
    }
  }

  const period = summary?.[kpiPeriod]
  const outstanding = summary?.outstandingRefunds

  return (
    <div className="admin-page finances-page">
      <header className="admin-module-header">
        <div>
          <p className="admin-module-kicker">Trésorerie</p>
          <h1 className="admin-module-title">
            <Landmark size={22} strokeWidth={2} aria-hidden />
            Finances
          </h1>
          <p className="admin-module-subtitle">
            Traçabilité de tous les mouvements d’argent (Mobile Money, abonnements, réservations).
            Les remboursements bancaires se font dans FedaPay / chez l’opérateur ; ici on journalise
            et on clôture la file.
          </p>
        </div>
        <div className="ar-row-actions">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              void loadSummary()
              void loadLedger(page)
            }}
            disabled={loading}
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <Download size={14} />
            {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      <div className="finances-kpi-period" role="tablist" aria-label="Période KPI">
        {(
          [
            ['today', 'Aujourd’hui'],
            ['week', 'Cette semaine'],
            ['month', 'Ce mois'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={kpiPeriod === key ? 'active' : ''}
            aria-selected={kpiPeriod === key}
            onClick={() => setKpiPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ar-stats-row">
        <div className="ar-stat-card ar-stat-card-muted">
          <div className="ar-stat-head">
            <p className="ar-stat-label">Encaissé</p>
          </div>
          <p className="ar-stat-value">{formatMoney(period?.encaisse.total ?? 0)}</p>
          <p className="ar-stat-meta">{period?.encaisse.count ?? 0} paiement(s)</p>
        </div>
        <div className="ar-stat-card">
          <div className="ar-stat-head">
            <p className="ar-stat-label">En attente</p>
          </div>
          <p className="ar-stat-value">{formatMoney(period?.enAttente.total ?? 0)}</p>
          <p className="ar-stat-meta">{period?.enAttente.count ?? 0} en cours</p>
        </div>
        <div className="ar-stat-card">
          <div className="ar-stat-head">
            <p className="ar-stat-label">À rembourser (période)</p>
          </div>
          <p className="ar-stat-value">{formatMoney(period?.aRembourser.total ?? 0)}</p>
          <p className="ar-stat-meta">{period?.aRembourser.count ?? 0} signalé(s)</p>
        </div>
        <div className="ar-stat-card">
          <div className="ar-stat-head">
            <p className="ar-stat-label">File actuelle</p>
            {outstanding && outstanding.count > 0 ? <AlertTriangle size={16} color="#b45309" /> : null}
          </div>
          <p className="ar-stat-value">{formatMoney(outstanding?.total ?? 0)}</p>
          <p className="ar-stat-meta">
            {outstanding?.count ?? 0} à traiter
            {outstanding && outstanding.count > 0 ? (
              <>
                {' · '}
                <button type="button" className="finances-link-btn" onClick={() => setActiveTab('refunds')}>
                  Voir la file
                </button>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="subscriptions-tabs" role="tablist" aria-label="Finances">
        <button
          type="button"
          className={tab === 'ledger' ? 'active' : ''}
          onClick={() => setActiveTab('ledger')}
        >
          Grand livre
        </button>
        <button
          type="button"
          className={tab === 'refunds' ? 'active' : ''}
          onClick={() => setActiveTab('refunds')}
        >
          À rembourser
          {outstanding && outstanding.count > 0 ? <span>{outstanding.count}</span> : null}
        </button>
      </div>

      <form className="ar-filters finances-filters" onSubmit={applyFilters}>
        <label className="ar-search-field">
          <Search size={14} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Téléphone, nom, référence FedaPay…"
            aria-label="Recherche"
          />
        </label>
        {tab === 'ledger' ? (
          <label>
            <span className="muted">Statut</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as FinanceStatus | '')}>
              <option value="">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Encaissé</option>
              <option value="needsRefund">À rembourser</option>
              <option value="refunded">Remboursé</option>
              <option value="failed">Échoué</option>
              <option value="declined">Refusé</option>
              <option value="canceled">Annulé</option>
            </select>
          </label>
        ) : null}
        <label>
          <span className="muted">Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as FinanceKind | '')}>
            <option value="">Tous</option>
            <option value="abonnement">Abonnement</option>
            <option value="reservation">Réservation</option>
          </select>
        </label>
        <label>
          <span className="muted">Opérateur</span>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value as 'mtn' | 'moov' | 'celtiis' | '')}
          >
            <option value="">Tous</option>
            <option value="mtn">MTN</option>
            <option value="moov">Moov</option>
            <option value="celtiis">Celtiis</option>
          </select>
        </label>
        <label>
          <span className="muted">Du</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span className="muted">Au</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="submit" className="admin-btn admin-btn-primary">
          Filtrer
        </button>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={resetFilters}>
          Réinitialiser
        </button>
      </form>

      {tab === 'refunds' ? (
        <p className="admin-module-subtitle" style={{ marginTop: 0 }}>
          Paiements encaissés sans livraison. Remboursez côté FedaPay / opérateur, puis marquez
          résolu avec une note. Même file que{' '}
          <Link to="/abonnements?tab=refunds">Abonnés → À rembourser</Link>.
        </p>
      ) : null}

      <div className="admin-data-table-wrap">
        <table className="admin-data-table finances-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Apprenant</th>
              <th>Montant</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Canal</th>
              <th>Référence</th>
            </tr>
          </thead>
          <tbody>
            {loading && payments.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="ar-empty-row">Chargement…</div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="ar-empty-row">Aucun mouvement pour ces filtres.</div>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="finances-row-clickable"
                  onClick={() => openDetail(payment.id)}
                >
                  <td className="muted">{formatDateTime(payment.activatedAt || payment.createdAt)}</td>
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
                  <td>{financeKindLabel(payment.kind)}</td>
                  <td>
                    <StatusBadge tone={financeStatusTone(payment.financeStatus)}>
                      {financeStatusLabel(payment.financeStatus)}
                    </StatusBadge>
                  </td>
                  <td className="muted">{paymentChannelLabel(payment)}</td>
                  <td className="muted">{payment.fedapayReference || payment.declaredReference || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="finances-pagination">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => {
              syncParams(page - 1)
              void loadLedger(page - 1)
            }}
          >
            Précédent
          </button>
          <span className="muted">
            Page {page} / {pages} · {total} mouvement(s)
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={page >= pages || loading}
            onClick={() => {
              syncParams(page + 1)
              void loadLedger(page + 1)
            }}
          >
            Suivant
          </button>
        </div>
      ) : (
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {total} mouvement(s)
        </p>
      )}

      {detailId ? (
        <div className="finances-drawer-backdrop" onClick={closeDetail}>
          <aside
            className="finances-drawer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Détail du paiement"
          >
            <div className="finances-drawer-head">
              <div>
                <h2>Détail paiement</h2>
                <p className="muted">{detailId}</p>
              </div>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={closeDetail}>
                <X size={14} />
                Fermer
              </button>
            </div>

            {detailLoading || !detail ? (
              <p className="muted" style={{ padding: 16 }}>
                {detailLoading ? 'Chargement…' : 'Introuvable'}
              </p>
            ) : (
              <div className="finances-drawer-body">
                <div className="finances-detail-grid">
                  <div>
                    <p className="muted">Montant</p>
                    <strong>
                      {formatMoney(detail.payment.amount, detail.payment.currency)}
                    </strong>
                  </div>
                  <div>
                    <p className="muted">Statut</p>
                    <StatusBadge tone={financeStatusTone(detail.payment.financeStatus)}>
                      {financeStatusLabel(detail.payment.financeStatus)}
                    </StatusBadge>
                  </div>
                  <div>
                    <p className="muted">Type</p>
                    <strong>{financeKindLabel(detail.payment.kind)}</strong>
                  </div>
                  <div>
                    <p className="muted">Canal</p>
                    <strong>{paymentChannelLabel(detail.payment)}</strong>
                  </div>
                </div>

                <section>
                  <h3>Apprenant</h3>
                  <p>
                    {learnerName(detail.payment.learner)}
                    <br />
                    <span className="muted">
                      {detail.payment.learner?.phone || '—'}
                      {detail.payment.learner?.email ? ` · ${detail.payment.learner.email}` : ''}
                    </span>
                  </p>
                  {detail.learnerSoldeHeures != null ? (
                    <p className="muted">Solde heures : {detail.learnerSoldeHeures} h</p>
                  ) : null}
                </section>

                <section>
                  <h3>FedaPay</h3>
                  <p className="muted">
                    Réf. {detail.payment.fedapayReference || '—'}
                    <br />
                    Tx {detail.payment.fedapayTransactionId || '—'}
                    <br />
                    Dernier événement : {detail.payment.lastEventName || '—'}
                  </p>
                </section>

                {detail.payment.accessRequests && detail.payment.accessRequests.length > 0 ? (
                  <section>
                    <h3>Abonnements liés</h3>
                    <ul className="finances-linked-list">
                      {detail.payment.accessRequests.map((r) => (
                        <li key={r.id}>
                          {r.module || 'module'} · {r.status} ·{' '}
                          {formatMoney(r.amount || 0, r.currency || 'XOF')}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detail.payment.reservations && detail.payment.reservations.length > 0 ? (
                  <section>
                    <h3>Réservations liées</h3>
                    <ul className="finances-linked-list">
                      {detail.payment.reservations.map((r) => (
                        <li key={r.id}>
                          {r.status} / {r.paymentStatus}
                          {r.startAt ? ` · ${formatDateTime(r.startAt)}` : ''}
                          {r.priceFcfa != null ? ` · ${formatMoney(r.priceFcfa)}` : ''}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {detail.relatedPromos.length > 0 ? (
                  <section>
                    <h3>Codes promo proches</h3>
                    <ul className="finances-linked-list">
                      {detail.relatedPromos.map((p) => (
                        <li key={p.redemptionId}>
                          {p.code || p.label || 'Promo'}
                          {p.heuresBonus ? ` · +${p.heuresBonus} h` : ''}
                          {' · '}
                          {formatDateTime(p.redeemedAt)}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section>
                  <h3>Chronologie</h3>
                  <ol className="finances-timeline">
                    {detail.timeline.map((event) => (
                      <li key={event.id}>
                        <div className="finances-timeline-dot" />
                        <div>
                          <strong>{ledgerEventLabel(event.eventType)}</strong>
                          <div className="muted">
                            {formatDateTime(event.createdAt)}
                            {event.actorLabel ? ` · ${event.actorLabel}` : ''}
                          </div>
                          {event.note ? <p>{event.note}</p> : null}
                          {event.fedapayEventName ? (
                            <p className="muted">Webhook : {event.fedapayEventName}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>

                {detail.payment.adminNote ? (
                  <section>
                    <h3>Notes admin</h3>
                    <pre className="finances-admin-note">{detail.payment.adminNote}</pre>
                  </section>
                ) : null}

                {detail.payment.needsRefund ? (
                  <section className="finances-refund-box">
                    <h3>Marquer le remboursement</h3>
                    <p className="muted">
                      Après remboursement réel dans le dashboard FedaPay / opérateur Mobile Money.
                    </p>
                    <textarea
                      value={refundNote}
                      onChange={(e) => setRefundNote(e.target.value)}
                      placeholder="Ex. remboursé MTN le 29/07, réf. XXX"
                      rows={3}
                      disabled={refundBusy}
                    />
                    <button
                      type="button"
                      className="admin-btn admin-btn-primary"
                      disabled={refundBusy}
                      onClick={() => void handleResolveRefund()}
                    >
                      {refundBusy ? '…' : 'Marquer résolu'}
                    </button>
                  </section>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
