import { FormEvent, useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  createMoniteurPayout,
  fetchMoniteurFinanceDetail,
  fetchMoniteurFinances,
  type MoniteurFinanceRow,
  type MoniteurPayoutItem,
} from '../api/finances'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

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
    <div className="moniteur-finances-panel">
      <div className="ar-row-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="admin-stat-grid" style={{ marginBottom: 20 }}>
        <div className="admin-stat-card">
          <strong>{totals.completedSessions}</strong>
          <span>Séances terminées</span>
        </div>
        <div className="admin-stat-card">
          <strong>{formatMoney(totals.totalEarned)}</strong>
          <span>Gains cumulés</span>
        </div>
        <div className="admin-stat-card">
          <strong>{formatMoney(totals.totalPaid)}</strong>
          <span>Déjà versé</span>
        </div>
        <div className="admin-stat-card">
          <strong>{formatMoney(totals.outstanding)}</strong>
          <span>Reste à payer</span>
        </div>
      </div>

      <table className="admin-data-table finances-table">
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
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={6}>Chargement…</td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6}>Aucun moniteur</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.moniteur.id}
                className="finances-row-clickable"
                onClick={() => setSelectedId(row.moniteur.id)}
              >
                <td>
                  <strong>{row.moniteur.fullName}</strong>
                  <div className="admin-muted">{row.moniteur.email || '—'}</div>
                </td>
                <td>{row.completedSessions}</td>
                <td>{formatMoney(row.totalEarned)}</td>
                <td>{formatMoney(row.totalPaid)}</td>
                <td>
                  <strong>{formatMoney(row.outstanding)}</strong>
                </td>
                <td>{formatMoney(row.monthEarned)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selected ? (
        <section className="admin-section" style={{ marginTop: 24 }}>
          <div className="admin-section-head">
            <h3 className="admin-section-label">Versement — {selected.moniteur.fullName}</h3>
            <p className="admin-section-hint">
              Reste dû : {formatMoney(selected.outstanding)}. Gain = prix des séances terminées.
            </p>
          </div>
          <div className="admin-section-body">
            <form onSubmit={handlePayout} className="reserv-create-grid">
              <input
                type="number"
                min={1}
                step={500}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Montant FCFA"
                required
              />
              <input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Période (ex. Août 2026)"
              />
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optionnel)"
              />
              <button type="submit" className="btn-primary" disabled={saving || selected.outstanding < 1}>
                {saving ? 'Enregistrement…' : 'Enregistrer le versement'}
              </button>
            </form>

            <h4 style={{ marginTop: 20 }}>Historique des versements</h4>
            {payouts.length === 0 ? (
              <p className="admin-muted">Aucun versement</p>
            ) : (
              <ul className="finances-linked-list">
                {payouts.map((item) => (
                  <li key={item.id}>
                    <strong>{formatMoney(item.amountFcfa)}</strong> — {formatDate(item.paidAt)}
                    {item.periodLabel ? ` · ${item.periodLabel}` : ''}
                    {item.note ? ` · ${item.note}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
