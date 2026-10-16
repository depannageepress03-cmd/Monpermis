import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  RefreshCw,
  RotateCcw,
  Wallet,
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
import { DirectionSection } from '../components/model/DirectionSection'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { Drawer, EmptyState, SkeletonBlock } from '../ui'
import { MoniteurFinancesPanel } from './MoniteurFinancesPanel'

type Tab = 'ledger' | 'refunds' | 'moniteurs'

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

const TONE_CHIP = { success: 'cx-green', warning: 'cx-amber', danger: 'cx-red', neutral: 'cx-slate' } as const

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
  const [tab, setTab] = useState<Tab>(
    initialTab === 'refunds' || initialTab === 'moniteurs' ? initialTab : 'ledger',
  )

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

  const statusChip = (value: string) => (
    <span className={`cx-chip ${TONE_CHIP[financeStatusTone(value)]}`}>{financeStatusLabel(value as FinanceStatus)}</span>
  )

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'ledger', label: 'Grand livre' },
    { key: 'refunds', label: 'À rembourser', badge: outstanding && outstanding.count > 0 ? outstanding.count : undefined },
    { key: 'moniteurs', label: 'Paiements moniteurs' },
  ]

  return (
    <DirectionSection
      kicker="Trésorerie"
      title="Comptabilité"
      subtitle="Traçabilité de tous les mouvements d’argent (Mobile Money, abonnements, réservations). Les remboursements se font dans FedaPay ou chez l’opérateur ; ici on journalise et on clôture la file."
      actions={
        <>
          <button
            type="button"
            className="cx-refresh"
            onClick={() => {
              void loadSummary()
              void loadLedger(page)
            }}
            disabled={loading}
          >
            <RefreshCw aria-hidden />
            Actualiser
          </button>
          <button type="button" className="cx-refresh" onClick={() => void handleExport()} disabled={exporting}>
            <Download aria-hidden />
            {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-toolbar">
        <div className="cx-tabs" role="tablist" aria-label="Période des indicateurs">
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
              className={kpiPeriod === key ? 'cx-active' : ''}
              aria-selected={kpiPeriod === key}
              onClick={() => setKpiPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Encaissé</span>
            <span className="cx-kc-value" style={{ fontSize: '1.2rem' }}>{formatMoney(period?.encaisse.total ?? 0)}</span>
            <span className="cx-kc-sub">{period?.encaisse.count ?? 0} paiement(s)</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">En attente</span>
            <span className="cx-kc-value" style={{ fontSize: '1.2rem' }}>{formatMoney(period?.enAttente.total ?? 0)}</span>
            <span className="cx-kc-sub">{period?.enAttente.count ?? 0} en cours</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <Wallet aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">À rembourser (période)</span>
            <span className="cx-kc-value" style={{ fontSize: '1.2rem' }}>{formatMoney(period?.aRembourser.total ?? 0)}</span>
            <span className="cx-kc-sub">{period?.aRembourser.count ?? 0} signalé(s)</span>
          </div>
        </div>
        <div className={`cx-kc${outstanding && outstanding.count > 0 ? ' cx-kc-alert' : ''}`}>
          <span className={`cx-kc-ico ${outstanding && outstanding.count > 0 ? 'cx-kc-red' : 'cx-kc-blue'}`}>
            <AlertTriangle aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">File actuelle</span>
            <span className="cx-kc-value" style={{ fontSize: '1.2rem' }}>{formatMoney(outstanding?.total ?? 0)}</span>
            <span className="cx-kc-sub">
              {outstanding?.count ?? 0} à traiter
              {outstanding && outstanding.count > 0 ? (
                <>
                  {' · '}
                  <button type="button" className="cx-link-all" style={{ margin: 0, fontSize: '.8rem' }} onClick={() => setActiveTab('refunds')}>
                    Voir la file
                  </button>
                </>
              ) : null}
            </span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="cx-tabs" role="tablist" aria-label="Finances">
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
                {item.badge ? <span className="cx-nav-badge" style={{ marginLeft: '.4rem' }}>{item.badge}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {tab === 'moniteurs' ? (
          <MoniteurFinancesPanel />
        ) : (
          <>
            <form className="cx-filter-bar" onSubmit={applyFilters} style={{ marginBottom: '1rem' }}>
              <label className="cx-grow">
                Recherche
                <input
                  className="cx-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Téléphone, nom, référence FedaPay…"
                  aria-label="Recherche"
                />
              </label>
              {tab === 'ledger' ? (
                <label>
                  Statut
                  <select className="cx-select" value={status} onChange={(e) => setStatus(e.target.value as FinanceStatus | '')}>
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
                Type
                <select className="cx-select" value={kind} onChange={(e) => setKind(e.target.value as FinanceKind | '')}>
                  <option value="">Tous</option>
                  <option value="abonnement">Abonnement</option>
                  <option value="reservation">Réservation</option>
                </select>
              </label>
              <label>
                Opérateur
                <select className="cx-select" value={operator} onChange={(e) => setOperator(e.target.value as 'mtn' | 'moov' | 'celtiis' | '')}>
                  <option value="">Tous</option>
                  <option value="mtn">MTN</option>
                  <option value="moov">Moov</option>
                  <option value="celtiis">Celtiis</option>
                </select>
              </label>
              <label>
                Du
                <input className="cx-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                Au
                <input className="cx-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <div className="cx-toolbar">
                <button type="submit" className="cx-btn cx-btn-fill">
                  <Filter aria-hidden />
                  Filtrer
                </button>
                <button type="button" className="cx-btn" onClick={resetFilters}>
                  <RotateCcw aria-hidden />
                  Réinitialiser
                </button>
              </div>
            </form>

            {tab === 'refunds' ? (
              <p className="cx-note cx-note-info" style={{ marginBottom: '1rem' }}>
                Paiements encaissés sans livraison. Remboursez côté FedaPay / opérateur, puis marquez résolu avec une
                note. Même file que <Link to="/abonnements?tab=refunds">Abonnés → À rembourser</Link>.
              </p>
            ) : null}

            {loading && payments.length === 0 ? (
              <SkeletonBlock rows={5} />
            ) : payments.length === 0 ? (
              <EmptyState title="Aucun mouvement" description="Aucun mouvement pour ces filtres." />
            ) : (
              <div className="cx-table-wrap">
                <table className="cx-data">
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
                    {payments.map((payment) => (
                      <tr key={payment.id} className="cx-click" onClick={() => openDetail(payment.id)} title="Voir le détail">
                        <td className="cx-dim">{formatDateTime(payment.activatedAt || payment.createdAt)}</td>
                        <td>
                          <div className="cx-person">
                            <span className="cx-avatar">{initials(payment.learner)}</span>
                            <div>
                              <strong>{learnerName(payment.learner)}</strong>
                              <small>{payment.learner?.phone || payment.learner?.email || '—'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{formatMoney(payment.amount, payment.currency)}</strong>
                        </td>
                        <td>{financeKindLabel(payment.kind)}</td>
                        <td>{statusChip(payment.financeStatus)}</td>
                        <td className="cx-dim">{paymentChannelLabel(payment)}</td>
                        <td className="cx-dim">{payment.fedapayReference || payment.declaredReference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="cx-pager">
              <span>
                {pages > 1 ? `Page ${page} / ${pages} · ` : ''}
                {total} mouvement(s)
              </span>
              {pages > 1 ? (
                <div>
                  <button
                    type="button"
                    className="cx-btn cx-btn-sm"
                    disabled={page <= 1 || loading}
                    onClick={() => {
                      syncParams(page - 1)
                      void loadLedger(page - 1)
                    }}
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    className="cx-btn cx-btn-sm"
                    disabled={page >= pages || loading}
                    onClick={() => {
                      syncParams(page + 1)
                      void loadLedger(page + 1)
                    }}
                  >
                    Suivant
                  </button>
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>

      <Drawer open={Boolean(detailId)} title="Détail du paiement" subtitle={detailId ?? undefined} onClose={closeDetail}>
        {detailLoading || !detail ? (
          <p className="cx-empty">{detailLoading ? 'Chargement…' : 'Introuvable'}</p>
        ) : (
          <div className="cx-form">
            <div className="cx-form-grid">
              <div className="cx-subject">
                <span>Montant</span>
                <b>{formatMoney(detail.payment.amount, detail.payment.currency)}</b>
              </div>
              <div className="cx-subject">
                <span>Statut</span>
                {statusChip(detail.payment.financeStatus)}
              </div>
              <div className="cx-subject">
                <span>Type</span>
                <b>{financeKindLabel(detail.payment.kind)}</b>
              </div>
              <div className="cx-subject">
                <span>Canal</span>
                <b>{paymentChannelLabel(detail.payment)}</b>
              </div>
            </div>

            <div className="cx-block">
              <h3>Apprenant</h3>
              <p style={{ color: 'var(--ink)' }}>
                <strong>{learnerName(detail.payment.learner)}</strong>
                <br />
                {detail.payment.learner?.phone || '—'}
                {detail.payment.learner?.email ? ` · ${detail.payment.learner.email}` : ''}
              </p>
              {detail.learnerSoldeHeures != null ? <p>Solde heures : {detail.learnerSoldeHeures} h</p> : null}
            </div>

            <div className="cx-block">
              <h3>FedaPay</h3>
              <p>
                Réf. {detail.payment.fedapayReference || '—'}
                <br />
                Tx {detail.payment.fedapayTransactionId || '—'}
                <br />
                Dernier événement : {detail.payment.lastEventName || '—'}
              </p>
            </div>

            {detail.payment.accessRequests && detail.payment.accessRequests.length > 0 ? (
              <div className="cx-block">
                <h3>Abonnements liés</h3>
                <ul className="cx-scores">
                  {detail.payment.accessRequests.map((r) => (
                    <li key={r.id}>
                      <span>
                        {r.module || 'module'} · {r.status}
                      </span>
                      <strong>{formatMoney(r.amount || 0, r.currency || 'XOF')}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.payment.reservations && detail.payment.reservations.length > 0 ? (
              <div className="cx-block">
                <h3>Réservations liées</h3>
                <ul className="cx-scores">
                  {detail.payment.reservations.map((r) => (
                    <li key={r.id}>
                      <span>
                        {r.status} / {r.paymentStatus}
                        {r.startAt ? ` · ${formatDateTime(r.startAt)}` : ''}
                      </span>
                      {r.priceFcfa != null ? <strong>{formatMoney(r.priceFcfa)}</strong> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.relatedPromos.length > 0 ? (
              <div className="cx-block">
                <h3>Codes promo proches</h3>
                <ul className="cx-scores">
                  {detail.relatedPromos.map((p) => (
                    <li key={p.redemptionId}>
                      <span>
                        {p.code || p.label || 'Promo'}
                        {p.heuresBonus ? ` · +${p.heuresBonus} h` : ''}
                      </span>
                      <small>{formatDateTime(p.redeemedAt)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="cx-block">
              <h3>Chronologie</h3>
              <ol className="cx-tl">
                {detail.timeline.map((event) => (
                  <li key={event.id}>
                    <span className="cx-tl-time">{formatDateTime(event.createdAt).split(' ').slice(0, 2).join(' ')}</span>
                    <span className="cx-tl-dot" />
                    <div className="cx-tl-body">
                      <strong style={{ color: 'var(--ink)' }}>{ledgerEventLabel(event.eventType)}</strong>
                      <span>
                        {formatDateTime(event.createdAt)}
                        {event.actorLabel ? ` · ${event.actorLabel}` : ''}
                      </span>
                      {event.note ? <span style={{ color: 'var(--ink)' }}>{event.note}</span> : null}
                      {event.fedapayEventName ? <span>Webhook : {event.fedapayEventName}</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {detail.payment.adminNote ? (
              <div className="cx-block">
                <h3>Notes admin</h3>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{detail.payment.adminNote}</p>
              </div>
            ) : null}

            {detail.payment.needsRefund ? (
              <div className="cx-block">
                <h3>Marquer le remboursement</h3>
                <p>Après remboursement réel dans le dashboard FedaPay / opérateur Mobile Money.</p>
                <textarea
                  className="cx-textarea"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Ex. remboursé MTN le 29/07, réf. XXX"
                  rows={3}
                  disabled={refundBusy}
                />
                <button type="button" className="cx-btn cx-btn-fill" disabled={refundBusy} onClick={() => void handleResolveRefund()}>
                  {refundBusy ? '…' : 'Marquer résolu'}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Drawer>
    </DirectionSection>
  )
}
