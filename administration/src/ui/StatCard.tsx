import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type StatCardProps = {
  label: string
  value: ReactNode
  meta?: ReactNode
  icon?: ReactNode
  to?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

export function StatCard({ label, value, meta, icon, to, tone = 'default' }: StatCardProps) {
  const className = `ui-stat-card tone-${tone}`
  const body = (
    <>
      <div className="ui-stat-head">
        <p className="ui-stat-label">{label}</p>
        {icon ? <span className="ui-stat-icon">{icon}</span> : null}
      </div>
      <p className="ui-stat-value">{value}</p>
      {meta ? <div className="ui-stat-meta">{meta}</div> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`${className} is-link`}>
        {body}
      </Link>
    )
  }

  return <div className={className}>{body}</div>
}
