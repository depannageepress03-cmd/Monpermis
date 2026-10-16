import { FormEvent, useCallback, useEffect, useState } from 'react'
import { CheckCircle2, CalendarCheck, RefreshCw, Wallet } from 'lucide-react'
import {
  createMoniteurPayout,
  fetchMoniteurFinanceDetail,
  fetchMoniteurFinances,
  type MoniteurFinanceRow,
  type MoniteurPayoutItem,
} from '../api/finances'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../ui'

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function MoniteurFinancesPanel() {
  const [rows, setRows] = useState<MoniteurFinanceRow[]>([])
  const [totals, setTotals] = useState({
    totalEarned: 0,
    totalPaid: 0,
    outstanding: 0,
    completedSessions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [payouts, setPayouts] = useState<MoniteurPayoutItem[]>([])
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMoniteurFinances(token)
      setRows(data.moniteurs)
      setTotals(data.totals)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    const token = getAdminToken()
    if (!token) return
    try {
      const data = await fetchMoniteurFinanceDetail(token, id)
      setPayouts(data.payouts)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Détail impossible')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
    else setPayouts([])
  }, [selectedId, loadDetail])

  const selected = rows.find((row) => row.moniteur.id === selectedId) || null

  const handlePayout = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    const token = getAdminToken()
    if (!token) return
    const amountFcfa = Math.round(Number(amount))
    if (!Number.isFinite(amountFcfa) || amountFcfa < 1) {
      setError('Montant invalide')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await createMoniteurPayout(token, selectedId, {
        amountFcfa,
        note: note.trim(),
        periodLabel: periodLabel.trim(),
      })
      setAmount('')
      setNote('')
      setPeriodLabel('')
      setSuccess('Versement enregistré.')
      await load()
      await loadDetail(selectedId)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cx-form">
      <div className="cx-toolbar">
        <p className="cx-toolbar-meta">Gains = prix des séances terminées, déduction faite des versements déjà enregistrés.</p>
        <button type="button" className="cx-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      </div>

      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <CalendarCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Séances terminées</span>
            <span className="cx-kc-value">{totals.completedSessions}</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <Wallet aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Gains cumulés</span>
            <span className="cx-kc-value" style={{ fontSize: '1.15rem' }}>{formatMoney(totals.totalEarned)}</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Déjà versé</span>
            <span className="cx-kc-value" style={{ fontSize: '1.15rem' }}>{formatMoney(totals.totalPaid)}</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Wallet aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Reste à payer</span>
            <span className="cx-kc-value" style={{ fontSize: '1.15rem' }}>{formatMoney(totals.outstanding)}</span>
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <SkeletonBlock rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun moniteur" description="Aucun moniteur à rémunérer pour le moment." />
      ) : (
        <div className="cx-table-wrap">
          <table className="cx-data">
            <thead>
              <tr>
                <th>Moniteur</th>
                <th>Séances</th>
                <th>Gains</th>
                <th>Versé</th>
                <th>Reste dû</th>
                <th>Ce mois</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.moniteur.id}
                  className="cx-click"
                  onClick={() => setSelectedId(row.moniteur.id)}
                  style={row.moniteur.id === selectedId ? { background: '#f0faf4' } : undefined}
                >
                  <td>
                    <div className="cx-person">
                      <span className="cx-avatar">
                        {row.moniteur.fullName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div>
                        <strong>{row.moniteur.fullName}</strong>
                        <small>{row.moniteur.email || '—'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{row.completedSessions}</td>
                  <td>{formatMoney(row.totalEarned)}</td>
                  <td>{formatMoney(row.totalPaid)}</td>
                  <td>
                    <strong>{formatMoney(row.outstanding)}</strong>
                  </td>
                  <td>{formatMoney(row.monthEarned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="cx-block">
          <h3>Versement — {selected.moniteur.fullName}</h3>
          <p>Reste dû : {formatMoney(selected.outstanding)}. Gain = prix des séances terminées.</p>
          <form onSubmit={handlePayout} className="cx-field-row">
            <input
              className="cx-input"
              type="number"
              min={1}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant FCFA"
              required
            />
            <input
              className="cx-input"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              placeholder="Période (ex. Août 2026)"
            />
            <input className="cx-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optionnel)" />
            <button type="submit" className="cx-btn cx-btn-fill" disabled={saving || selected.outstanding < 1}>
              {saving ? 'Enregistrement…' : 'Enregistrer le versement'}
            </button>
          </form>

          <h3 style={{ marginTop: '.8rem' }}>Historique des versements</h3>
          {payouts.length === 0 ? (
            <p className="cx-empty">Aucun versement</p>
          ) : (
            <ul className="cx-scores">
              {payouts.map((item) => (
                <li key={item.id}>
                  <span>
                    {formatDate(item.paidAt)}
                    {item.periodLabel ? ` · ${item.periodLabel}` : ''}
                    {item.note ? ` · ${item.note}` : ''}
                  </span>
                  <strong>{formatMoney(item.amountFcfa)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
