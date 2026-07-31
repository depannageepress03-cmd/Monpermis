import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Reveal } from './Reveal'

type PageHeaderProps = {
  kicker?: string
  title: string
  description?: string
  backTo?: string
  backLabel?: string
  actions?: ReactNode
}

export function PageHeader({
  kicker,
  title,
  description,
  backTo,
  backLabel = 'Retour',
  actions,
}: PageHeaderProps) {
  return (
    <Reveal variant="blur" className="ui-page-header">
      <div className="ui-page-header-main">
        {backTo ? (
          <Link to={backTo} className="ui-page-back">
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        ) : null}
        {kicker ? <p className="ui-page-kicker">{kicker}</p> : null}
        <h1 className="ui-page-title">{title}</h1>
        {description ? <p className="ui-page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-actions">{actions}</div> : null}
    </Reveal>
  )
}
