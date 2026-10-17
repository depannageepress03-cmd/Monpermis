import { useCallback, useEffect, useState } from 'react'
import { Banknote, CheckCircle2, Coins, HandCoins, Landmark, RefreshCw, Wallet } from 'lucide-react'
import { fetchEarnings, type EarningsData } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { Empty, formatMoney, Kpi, nf, Notice, PanelHead, SessionRow } from '../components/model/Kit'

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isoDay(value?: string | null) {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const trend =
    totals && totals.prevMonthEarned ? ((totals.monthEarned - totals.prevMonthEarned) / totals.prevMonthEarned) * 100 : null
  const paidShare = totals && totals.totalEarned ? Math.round((totals.totalPaid / totals.totalEarned) * 100) : 0

  return (
    <PageSection
      kicker="Finances"
      title="Mes revenus"
      subtitle="Gains calculés sur les séances effectuées. L’administration enregistre les versements."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} />
      {loading && !data ? <p className="cx-loading">Chargement…</p> : null}

      {totals ? (
        <>
          <div className="cx-kc-grid">
            <Kpi
              icon={<Coins aria-hidden />}
              tone="blue"
              label="Gains cumulés"
              value={nf(totals.totalEarned)}
              unit="FCFA"
              sub={`${nf(totals.completedSessions)} séance${totals.completedSessions > 1 ? 's' : ''} · ${nf(totals.hoursCompleted)} h`}
            />
            <Kpi
              icon={<Wallet aria-hidden />}
              tone="green"
              label="Ce mois"
              value={nf(totals.monthEarned)}
              unit="FCFA"
              trend={trend}
              vs={`vs ${formatMoney(totals.prevMonthEarned)} le mois dernier`}
              sub={`Mois précédent : ${formatMoney(totals.prevMonthEarned)}`}
            />
            <Kpi
              icon={<Landmark aria-hidden />}
              tone="sky"
              label="Déjà versé"
              value={nf(totals.totalPaid)}
              unit="FCFA"
              sub={`${paidShare} % des gains cumulés`}
            />
            <Kpi
              icon={<HandCoins aria-hidden />}
              tone={totals.outstanding > 0 ? 'gold' : 'green'}
              label="Reste à recevoir"
              value={nf(totals.outstanding)}
              unit="FCFA"
              sub={
                totals.pendingEarned > 0
                  ? `+ ${formatMoney(totals.pendingEarned)} de séances confirmées à venir`
                  : 'Aucune séance confirmée en cours'
              }
            />
          </div>

          <div className="cx-grid-2">
            <section className="cx-panel">
              <PanelHead
                icon={<CheckCircle2 aria-hidden />}
                title="Séances effectuées récentes"
                sub="Base de calcul de vos gains"
              />
              {!data?.recentSessions?.length ? (
                <Empty>Aucune séance terminée pour le moment.</Empty>
              ) : (
                <div className="cx-sess">
                  {data.recentSessions.map((item) => (
                    <SessionRow
                      key={item.id}
                      date={item.creneau?.date || isoDay(item.completedAt)}
                      title={item.user?.fullName || 'Apprenant'}
                      lines={[
                        item.creneau
                          ? `${item.creneau.startTime} – ${item.creneau.endTime} · ${item.heures} h`
                          : `${formatDate(item.completedAt)} · ${item.heures} h`,
                      ]}
                      amount={formatMoney(item.priceFcfa)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="cx-panel">
              <PanelHead
                icon={<Banknote aria-hidden />}
                title="Versements reçus"
                sub="Enregistrés par l’administration"
              />
              {!data?.payouts?.length ? (
                <Empty>Aucun versement enregistré.</Empty>
              ) : (
                <div className="cx-sess">
                  {data.payouts.map((item) => (
                    <SessionRow
                      key={item.id}
                      date={isoDay(item.paidAt)}
                      tone="navy"
                      title={formatMoney(item.amountFcfa)}
                      lines={[
                        `${formatDate(item.paidAt)}${item.periodLabel ? ` · ${item.periodLabel}` : ''}`,
                        item.note || null,
                      ]}
                      chip={<span className="cx-chip-ok">Versé</span>}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </PageSection>
  )
}
