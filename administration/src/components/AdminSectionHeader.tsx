import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AdminSectionHeaderProps {
  backTo: string
  backLabel?: string
  kicker?: string
  title: string
  subtitle?: string
}

export function AdminSectionHeader({
  backTo,
  backLabel = 'Retour',
  kicker,
  title,
  subtitle,
}: AdminSectionHeaderProps) {
  return (
    <header className="admin-section-header">
      <Link to={backTo} className="admin-back-link">
        <ArrowLeft size={18} />
        {backLabel}
      </Link>

      {kicker ? <p className="admin-section-kicker">{kicker}</p> : null}
      <h2 className="admin-section-title">{title}</h2>

      <div className="accent-row" aria-hidden>
        <span className="accent accent-green" />
        <span className="accent accent-gold" />
        <span className="accent accent-navy" />
      </div>

      {subtitle ? <p className="admin-section-subtitle">{subtitle}</p> : null}
    </header>
  )
}
