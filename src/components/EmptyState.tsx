import type { ReactNode } from 'react'

/** Empty / error state with optional Réessayer (or other) action. */
export function EmptyState({
  icon,
  title,
  message,
  action,
  tone = 'default',
}: {
  icon?: ReactNode
  title: string
  message?: string
  action?: ReactNode
  tone?: 'default' | 'error'
}) {
  return (
    <div className={`empty-state${tone === 'error' ? ' is-error' : ''}`}>
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <h2>{title}</h2>
      {message ? <p className="subtitle">{message}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}
