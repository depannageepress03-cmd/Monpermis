import type { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="ui-empty" role="status">
      {icon}
      <p className="ui-empty-title">{title}</p>
      {description ? <p className="ui-empty-desc">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
