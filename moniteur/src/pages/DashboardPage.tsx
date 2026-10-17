import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Hourglass,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Sun,
  Wallet,
} from 'lucide-react'
import { fetchDashboard, type DashboardData, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { Empty, formatMoney, Kpi, nf, Notice, PanelHead, SessionRow } from '../components/model/Kit'

function sessionLines(item: ReservationItem) {
  return [
    item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime}` : 'Créneau',
    item.user?.phone || item.user?.email || null,
  ]
}

function monthTrend(month: number, prev: number) {
  if (!prev) return null
  return ((month - prev) / prev) * 100
}

export function DashboardPage() {
  const { moniteur } = useMoniteurAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setData(await fetchDashboard(token))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stats = data?.stats
  const earnings = data?.earnings
  const insight = !stats
    ? ''
    : stats.weeklySlots === 0
      ? 'Vous n’avez publié aucune plage horaire : les apprenants ne peuvent pas encore réserver avec vous.'
      : stats.pending > 0
        ? `${stats.pending} demande${stats.pending > 1 ? 's attendent' : ' attend'} votre réponse. Une réponse rapide rassure l’apprenant.`
        : stats.outstanding > 0
          ? `Il vous reste ${formatMoney(stats.outstanding)} à recevoir de l’auto-école.`
          : 'Tout est à jour : aucune demande en attente et aucun montant dû.'

  return (
    <>
      <header className="cx-page-header cx-welcome">
        <div className="cx-wl-txt">
          <small>BIENVENUE SUR VOTRE ESPACE</small>
          <h1>Bonjour {moniteur?.firstName || ''}</h1>
          <p>Vos séances, vos demandes et vos revenus en un coup d’œil.</p>
        </div>
        <div className="cx-wl-right">
          <p className="cx-wl-slogan">
            Chaque leçon compte,
            <br />
            chaque réussite aussi
          </p>
          <div className="cx-page-actions">
            <Link to="/disponibilites" className="cx-refresh">
              <CalendarDays aria-hidden />
              Mes disponibilités
            </Link>
            <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
              <RefreshCw aria-hidden />
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <Notice error={error} />
      {loading && !data ? <p className="cx-loading">Chargement du tableau de bord…</p> : null}

      {stats ? (
        <>
          <div className="cx-kc-grid">
            <Kpi
              icon={<Hourglass aria-hidden />}
              tone={stats.pending > 0 ? 'red' : 'gold'}
              label="À confirmer"
              value={nf(stats.pending)}
              sub={stats.pending > 0 ? 'Demandes payées en attente' : 'Aucune demande en attente'}
              to="/reservations"
              alert={stats.pending > 0}
            />
            <Kpi
              icon={<CalendarClock aria-hidden />}
              tone="blue"
              label="Séances à venir"
              value={nf(stats.confirmedUpcoming)}
              sub={`${nf(stats.weeklySlots)} plage${stats.weeklySlots > 1 ? 's' : ''} hebdo publiée${stats.weeklySlots > 1 ? 's' : ''}`}
              to="/reservations"
            />
            <Kpi
              icon={<CheckCircle2 aria-hidden />}
              tone="green"
              label="Séances effectuées"
              value={nf(stats.completed)}
              sub={`${nf(stats.hoursCompleted)} h de conduite`}
              to="/historique"
            />
            <Kpi
              icon={<Wallet aria-hidden />}
              tone="sky"
              label="Gains du mois"
              value={nf(stats.monthEarned)}
              unit="FCFA"
              trend={earnings ? monthTrend(earnings.monthEarned, earnings.prevMonthEarned) : null}
              vs="vs mois précédent"
              sub={`Reste à recevoir : ${formatMoney(stats.outstanding)}`}
              to="/revenus"
            />
          </div>

          <div className="cx-dash-row">
            <div className="cx-dash-side">
              <section className="cx-panel">
                <PanelHead
                  icon={<Sun aria-hidden />}
                  title="Aujourd’hui"
                  sub={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                />
                {data?.today?.length ? (
                  <div className="cx-sess">
                    {data.today.map((item) => (
                      <SessionRow
                        key={item.id}
                        date={item.creneau?.date}
                        title={item.user?.fullName || 'Apprenant'}
                        lines={sessionLines(item)}
                        amount={formatMoney(item.priceFcfa)}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>Aucune séance confirmée aujourd’hui.</Empty>
                )}
              </section>

              <section className="cx-panel">
                <PanelHead
                  icon={<CalendarCheck aria-hidden />}
                  title="Prochaines séances"
                  sub="Séances confirmées à venir"
                  extra={
                    <Link to="/reservations" className="cx-link-all">
                      Tout voir <ArrowRight aria-hidden />
                    </Link>
                  }
                />
                {data?.upcoming?.length ? (
                  <div className="cx-sess">
                    {data.upcoming.map((item) => (
                      <SessionRow
                        key={item.id}
                        date={item.creneau?.date}
                        tone="navy"
                        title={item.user?.fullName || 'Apprenant'}
                        lines={sessionLines(item)}
                        amount={formatMoney(item.priceFcfa)}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>Aucune séance confirmée à venir.</Empty>
                )}
              </section>
            </div>

            <div className="cx-dash-side">
              <section className="cx-panel">
                <PanelHead
                  icon={<Hourglass aria-hidden />}
                  title="À confirmer"
                  sub="Demandes payées par les apprenants"
                  extra={
                    <Link to="/reservations" className="cx-link-all">
                      Traiter <ArrowRight aria-hidden />
                    </Link>
                  }
                />
                {data?.pending?.length ? (
                  <div className="cx-sess">
                    {data.pending.slice(0, 5).map((item) => (
                      <SessionRow
                        key={item.id}
                        date={item.creneau?.date}
                        tone="gold"
                        title={item.user?.fullName || 'Apprenant'}
                        lines={[item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime}` : 'Créneau']}
                        chip={<span className="cx-chip-ok cx-chip-wait">En attente</span>}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty>Aucune demande en attente.</Empty>
                )}
              </section>

              {earnings ? (
                <section className="cx-panel">
                  <PanelHead icon={<Wallet aria-hidden />} title="Mes revenus" sub="Selon les séances effectuées" />
                  <div className="cx-prof-facts">
                    <div>
                      <span>Gains cumulés</span>
                      <b>{formatMoney(earnings.totalEarned)}</b>
                    </div>
                    <div>
                      <span>Déjà versé</span>
                      <b>{formatMoney(earnings.totalPaid)}</b>
                    </div>
                    <div>
                      <span>Reste à recevoir</span>
                      <b>{formatMoney(earnings.outstanding)}</b>
                    </div>
                  </div>
                  <Link to="/revenus" className="cx-btn-primary">
                    Voir le détail <ArrowRight aria-hidden />
                  </Link>
                </section>
              ) : null}

              <section className="cx-panel cx-retain">
                <span className="cx-rt-ico">
                  <Lightbulb aria-hidden />
                </span>
                <div>
                  <b>À retenir</b>
                  <p>{insight}</p>
                </div>
                <span className="cx-rt-tr">
                  <Sparkles aria-hidden />
                </span>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
