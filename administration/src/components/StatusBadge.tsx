import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

const toneMap = {
  success: { className: 'is-success', Icon: CheckCircle },
  warning: { className: 'is-warning', Icon: Clock },
  danger: { className: 'is-danger', Icon: AlertCircle },
  neutral: { className: 'is-neutral', Icon: null },
} as const

interface StatusBadgeProps {
  tone?: StatusTone
  children: ReactNode
  withIcon?: boolean
}

export function StatusBadge({ tone = 'neutral', children, withIcon = true }: StatusBadgeProps) {
  const { className, Icon } = toneMap[tone]
  return (
    <span className={`admin-status-badge ${className}`}>
      {withIcon && Icon ? <Icon size={10} /> : null}
      {children}
    </span>
  )
}
