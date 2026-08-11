import { useCallback, useEffect, useState } from 'react'
import { fetchEarnings, type EarningsData } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'

function formatMoney(value: number) {
  return `${(value || 0).toLocaleString('fr-FR')} FCFA`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function RevenusPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchEarnings(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const totals = data?.totals

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Finances</p>
          <h1>Mes revenus</h1>
          <p className="admin-muted">
            Gains basés sur les séances effectuées. L’administration enregistre les versements.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {totals ? (
        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <strong>{totals.completedSessions}</strong>
            <span>Séances effectuées</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.totalEarned)}</strong>
            <span>Gains cumulés</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.monthEarned)}</strong>
            <span>Ce mois</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.prevMonthEarned)}</strong>
            <span>Mois précédent</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.pendingEarned)}</strong>
            <span>Confirmées (non terminées)</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.totalPaid)}</strong>
            <span>Déjà versé</span>
          </div>
          <div className="admin-stat-card">
            <strong>{formatMoney(totals.outstanding)}</strong>
            <span>Reste à recevoir</span>
          </div>
        </div>
      ) : null}

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h3>Séances effectuées récentes</h3>
        {!data?.recentSessions?.length ? (
          <p className="admin-muted">Aucune séance terminée pour le moment.</p>
        ) : (
          <ul className="upcoming-list">
            {data.recentSessions.map((item) => (
              <li key={item.id}>
                <div className="upcoming-item-main">
                  <strong>
                    {item.creneau
                      ? `${item.creneau.date} · ${item.creneau.startTime}–${item.creneau.endTime}`
                      : formatDate(item.completedAt)}
                  </strong>
                  <span>
                    {item.user?.fullName || 'Apprenant'} · {item.heures} h ·{' '}
                    {formatMoney(item.priceFcfa)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h3>Versements reçus</h3>
        {!data?.payouts?.length ? (
          <p className="admin-muted">Aucun versement enregistré.</p>
        ) : (
          <ul className="upcoming-list">
            {data.payouts.map((item) => (
              <li key={item.id}>
                <div className="upcoming-item-main">
                  <strong>{formatMoney(item.amountFcfa)}</strong>
                  <span>
                    {formatDate(item.paidAt)}
                    {item.periodLabel ? ` · ${item.periodLabel}` : ''}
                  </span>
                  {item.note ? <span className="admin-muted">{item.note}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
