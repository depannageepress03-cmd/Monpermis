import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Éléments du modèle visuel de l'espace admin (classes .cx-), réutilisés par toutes les pages moniteur. */

export function formatMoney(value: number) {
  return `${(value || 0).toLocaleString('fr-FR')} FCFA`
}

export function nf(value: number) {
  return (value || 0).toLocaleString('fr-FR')
}

export function dateParts(date: string) {
  const d = new Date(`${date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return { day: '—', month: '', weekday: date, long: date }
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
    long: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

export function PanelHead({
  icon,
  title,
  sub,
  extra,
}: {
  icon: ReactNode
  title: string
  sub?: string
  extra?: ReactNode
}) {
  return (
    <div className="cx-panel-head cx-ph cx-ph-plain">
      <span className="cx-phi cx-phi-tile">{icon}</span>
      <div className="cx-ph-txt">
        <h2 className="cx-panel-title">{title}</h2>
        {sub ? <p className="cx-muted">{sub}</p> : null}
      </div>
      {extra}
    </div>
  )
}

export type KpiTone = 'blue' | 'green' | 'sky' | 'gold' | 'red'

export function Kpi({
  icon,
  tone,
  label,
  value,
  unit,
  sub,
  trend,
  vs,
  to,
  alert,
}: {
  icon: ReactNode
  tone: KpiTone
  label: string
  value: string
  unit?: string
  sub?: string
  trend?: number | null
  vs?: string
  to?: string
  alert?: boolean
}) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend)
  const body = (
    <>
      <span className={`cx-kc-ico cx-kc-${tone}`}>{icon}</span>
      <div className="cx-kc-body">
        <span className="cx-kc-label">{label}</span>
        <span className="cx-kc-value">
          {value}
          {unit ? (
            <>
              {' '}
              <small>{unit}</small>
            </>
          ) : null}
        </span>
        {hasTrend ? (
          <div className="cx-kc-foot">
            <span className={`cx-kc-trend${(trend as number) < 0 ? ' cx-down' : ''}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={(trend as number) < 0 ? 'M12 5v14m-6-6 6 6 6-6' : 'M12 19V5m-6 6 6-6 6 6'} />
              </svg>
              {`${(trend as number) > 0 ? '+' : ''}${Math.round(trend as number)} %`}
            </span>
            {vs ? <span className="cx-kc-vs">{vs}</span> : null}
          </div>
        ) : sub ? (
          <span className="cx-kc-sub">{sub}</span>
        ) : null}
      </div>
    </>
  )
  const className = `cx-kc${to ? ' cx-kc-link' : ''}${alert ? ' cx-kc-alert' : ''}`
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function Notice({ error, success }: { error?: string | null; success?: string | null }) {
  return (
    <>
      {error ? (
        <p className="cx-note cx-note-err" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="cx-note cx-note-ok" role="status">
          {success}
        </p>
      ) : null}
    </>
  )
}

/** Ligne d'une séance : pastille date, apprenant, horaire, montant et actions éventuelles. */
export function SessionRow({
  date,
  tone,
  title,
  lines,
  warning,
  amount,
  chip,
  actions,
}: {
  date?: string
  tone?: 'gold' | 'navy' | 'grey'
  title: string
  lines: (string | null | undefined)[]
  warning?: string
  amount?: string
  chip?: ReactNode
  actions?: ReactNode
}) {
  const parts = date ? dateParts(date) : null
  return (
    <div className="cx-sess-row">
      <span className={`cx-sess-date${tone ? ` cx-${tone}` : ''}`} aria-hidden="true">
        <b>{parts?.day ?? '—'}</b>
        <small>{parts?.month ?? ''}</small>
      </span>
      <div className="cx-sess-meta">
        <strong>{title}</strong>
        {lines.filter(Boolean).map((line) => (
          <span key={line}>{line}</span>
        ))}
        {warning ? <em>{warning}</em> : null}
      </div>
      {amount || chip || actions ? (
        <div className="cx-sess-side">
          {chip}
          {amount ? <span className="cx-sess-amount">{amount}</span> : null}
          {actions ? <div className="cx-sess-actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="cx-empty">{children}</p>
}
