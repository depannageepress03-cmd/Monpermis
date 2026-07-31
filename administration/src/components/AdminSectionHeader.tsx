import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

type KickerTone = 'muted' | 'brand' | 'success' | 'warning'

interface AdminSectionHeaderProps {
  backTo: string
  backLabel?: string
  kicker?: string
  kickerTone?: KickerTone
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function AdminSectionHeader({
  backTo,
  backLabel = 'Retour',
  kicker,
  kickerTone = 'muted',
  title,
  subtitle,
  actions,
}: AdminSectionHeaderProps) {
  return (
    <header className="admin-section-header">
      <Link to={backTo} className="admin-back-link">
        <ArrowLeft size={15} strokeWidth={2.25} aria-hidden />
        <span>{backLabel}</span>
      </Link>

      <div className="admin-section-header-body">
        <div className="admin-section-header-copy">
          {kicker ? (
            <span className={`admin-section-kicker is-${kickerTone}`}>{kicker}</span>
          ) : null}
          <h1 className="admin-section-title">{title}</h1>
          {subtitle ? <p className="admin-section-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="admin-section-header-actions">{actions}</div> : null}
      </div>
    </header>
  )
}
