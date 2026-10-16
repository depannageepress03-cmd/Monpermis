import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  UserCog,
} from 'lucide-react'
import { ConduiteSection } from '../../components/model/ConduiteSection'
import { nf } from '../../components/model/ModelCharts'
import { fetchDashboardSummary, type DashboardSummary } from '../../api/dashboard'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'

type Conduite = DashboardSummary['conduite']

const EMPTY: Conduite = {
  chapters: 0,
  published: 0,
  courses: 0,
  moniteurs: 0,
  moniteursActive: 0,
  creneauxLibre: 0,
  reservations: 0,
  reservationsPending: 0,
  reservationsConfirmed: 0,
}

export function ConduiteHubPage() {
  const [data, setData] = useState<Conduite>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    let cancelled = false
    fetchDashboardSummary(token)
      .then(({ summary }) => {
        if (!cancelled) setData(summary.conduite)
      })
      .catch((err) => {
        if (!cancelled) setError(isAuthError(err) ? err.message : 'Chargement impossible')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const todo = useMemo(() => {
    const items: { key: string; to: string; title: string; sub: string }[] = []
    if (data.reservationsPending > 0) {
      items.push({
        key: 'pending',
        to: '/conduite/reservations',
        title: `${data.reservationsPending} réservation${data.reservationsPending > 1 ? 's' : ''} en attente`,
        sub: 'Paiement ou confirmation à traiter.',
      })
    }
    if (data.moniteurs > 0 && data.moniteursActive === 0) {
      items.push({
        key: 'nomon',
        to: '/conduite/moniteurs',
        title: 'Aucun moniteur actif',
        sub: 'Les élèves ne peuvent réserver aucune séance.',
      })
    }
    if (data.moniteursActive > 0 && data.creneauxLibre === 0) {
      items.push({
        key: 'nocren',
        to: '/conduite/moniteurs',
        title: 'Aucun créneau libre',
        sub: 'Les moniteurs doivent définir leurs disponibilités.',
      })
    }
    if (data.chapters > data.published) {
      const draft = data.chapters - data.published
      items.push({
        key: 'draft',
        to: '/conduite/lecons',
        title: `${draft} chapitre${draft > 1 ? 's' : ''} de leçons non publié${draft > 1 ? 's' : ''}`,
        sub: 'Invisible pour les élèves tant qu’il n’est pas publié.',
      })
    }
    return items
  }, [data])

  const spaces = [
    {
      to: '/conduite/lecons',
      tone: 'gold',
      icon: <CarFront aria-hidden />,
      title: 'Leçons de conduite',
      sub: 'Chapitres, cours et contenus pratiques.',
      stats: [
        { v: `${data.published}/${data.chapters}`, l: 'chapitres publiés' },
        { v: nf(data.courses), l: 'cours' },
      ],
    },
    {
      to: '/conduite/reservations',
      tone: 'green',
      icon: <CalendarDays aria-hidden />,
      title: 'Réservations',
      sub: 'Séances des élèves, filtres et paiements.',
      stats: [
        { v: nf(data.reservations), l: 'réservations' },
        { v: nf(data.reservationsPending), l: 'en attente' },
      ],
    },
    {
      to: '/conduite/moniteurs',
      tone: 'navy',
      icon: <UserCog aria-hidden />,
      title: 'Moniteurs',
      sub: 'Équipe, véhicules et disponibilités.',
      stats: [
        { v: `${data.moniteursActive}/${data.moniteurs}`, l: 'moniteurs actifs' },
        { v: nf(data.creneauxLibre), l: 'créneaux libres' },
      ],
    },
  ]

  return (
    <ConduiteSection
      kicker="Formation"
      title="Conduite"
      subtitle="Pilotez les leçons pratiques, les moniteurs et les réservations des élèves."
    >
      {error ? <p className="cx-note cx-note-err">{error}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <CalendarDays aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Réservations</span>
            <span className="cx-kc-value">{loading ? '…' : nf(data.reservations)}</span>
            <span className="cx-kc-sub">{nf(data.reservationsConfirmed)} confirmées</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">En attente</span>
            <span className="cx-kc-value">{loading ? '…' : nf(data.reservationsPending)}</span>
            <span className="cx-kc-sub">à traiter</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <UserCog aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Moniteurs actifs</span>
            <span className="cx-kc-value">
              {loading ? '…' : nf(data.moniteursActive)} <small>/ {nf(data.moniteurs)}</small>
            </span>
            <span className="cx-kc-sub">dans l’équipe</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <CarFront aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Créneaux libres</span>
            <span className="cx-kc-value">{loading ? '…' : nf(data.creneauxLibre)}</span>
            <span className="cx-kc-sub">réservables à venir</span>
          </div>
        </div>
      </div>

      <div className="cx-space-grid cx-space-grid-3">
        {spaces.map((space) => (
          <Link key={space.to} to={space.to} className={`cx-space cx-tone-${space.tone}`}>
            <div className="cx-space-head">
              <span className="cx-space-ico">{space.icon}</span>
              <div>
                <h2>{space.title}</h2>
                <p>{space.sub}</p>
              </div>
            </div>
            <div className="cx-space-stats">
              {space.stats.map((stat) => (
                <div key={stat.l}>
                  <b>{loading ? '…' : stat.v}</b>
                  <span>{stat.l}</span>
                </div>
              ))}
            </div>
            <span className="cx-space-go">
              Ouvrir <ArrowRight aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <AlertTriangle aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">À traiter</h2>
            <p className="cx-muted">Ce qui bloque ou ralentit les réservations</p>
          </div>
        </div>
        <div className="cx-todo">
          {todo.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.8rem .4rem' }}>
              <span className="cx-todo-ico cx-ok">
                <Check aria-hidden />
              </span>
              <div>
                <b style={{ display: 'block', color: 'var(--ink)' }}>Tout est à jour</b>
                <span className="cx-sub" style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>
                  Aucune réservation en attente, moniteurs et créneaux disponibles.
                </span>
              </div>
            </div>
          ) : (
            todo.map((item) => (
              <Link key={item.key} to={item.to}>
                <span className="cx-todo-ico">
                  <AlertTriangle aria-hidden />
                </span>
                <div>
                  <b>{item.title}</b>
                  <span className="cx-sub">{item.sub}</span>
                </div>
                <ChevronRight className="cx-arrow" aria-hidden />
              </Link>
            ))
          )}
        </div>
      </section>
    </ConduiteSection>
  )
}
