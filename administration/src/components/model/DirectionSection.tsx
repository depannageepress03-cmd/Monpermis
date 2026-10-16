import type { ReactNode } from 'react'
import { Landmark, ScrollText, Shield } from 'lucide-react'
import { PageSection, type SectionTab } from './PageSection'

/** Onglets de l'espace « Direction » (superadmin) : admins, journal d'audit, comptabilité. */
const TABS: readonly SectionTab[] = [
  { to: '/administrateurs', label: 'Administrateurs', icon: Shield },
  { to: '/journal-audit', label: 'Journal d’audit', icon: ScrollText },
  { to: '/finances', label: 'Comptabilité', icon: Landmark },
]

export function DirectionSection({
  kicker = 'DIRECTION',
  ...props
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return <PageSection kicker={kicker} tabs={TABS} tabsLabel="Espace Direction" {...props} />
}
