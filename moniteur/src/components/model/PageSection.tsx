import type { ComponentType, ReactNode, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'

export type SectionTab = {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

/**
 * Coque de page du modèle : bandeau d'en-tête, barre d'onglets facultative, puis le contenu.
 * Copie du composant de l’espace admin (administration/src/components/model/PageSection.tsx).
 */
export function PageSection({
  kicker,
  title,
  subtitle,
  actions,
  tabs,
  tabsLabel = 'Navigation de la section',
  children,
}: {
  kicker: string
  title: string
  subtitle?: string
  actions?: ReactNode
  tabs?: readonly SectionTab[]
  tabsLabel?: string
  children: ReactNode
}) {
  return (
    <div className="cx-code">
      <header className="cx-page-header cx-welcome cx-wl-page">
        <div className="cx-wl-txt">
          <small>{kicker.toUpperCase()}</small>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="cx-wl-right">
            <div className="cx-page-actions">{actions}</div>
          </div>
        ) : null}
      </header>

      {tabs && tabs.length > 0 ? (
        <nav className="cx-subnav" aria-label={tabsLabel}>
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end ?? false}>
              <Icon aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      ) : null}

      {children}
    </div>
  )
}
