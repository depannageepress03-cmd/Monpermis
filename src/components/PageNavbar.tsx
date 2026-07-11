import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import '../styles/auth.css'
import '../styles/learner.css'

export function PageNavbar({
  title,
  icon,
  onBack,
  tone = 'default',
  backLabel = 'Retour',
}: {
  title: string
  icon: ReactNode
  onBack: () => void
  tone?: 'default' | 'drive'
  backLabel?: string
}) {
  return (
    <nav className="page-navbar learner-anim-nav">
      <div className="page-nav-left">
        <span
          className={`page-nav-icon learner-anim-icon${tone === 'drive' ? ' page-nav-icon-drive' : ''}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <h1>{title}</h1>
      </div>
      <button type="button" className="btn-back page-nav-back" onClick={onBack}>
        <ArrowLeft size={18} />
        {backLabel}
      </button>
    </nav>
  )
}
