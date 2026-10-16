import type { ReactNode } from 'react'
import { CalendarDays, CarFront, LayoutGrid, UserCog } from 'lucide-react'
import { PageSection, type SectionTab } from './PageSection'

/** Onglets de l'espace « Conduite » : même barre sur toutes les pages de la section. */
const TABS: readonly SectionTab[] = [
  { to: '/conduite', label: 'Vue d’ensemble', icon: LayoutGrid, end: true },
  { to: '/conduite/lecons', label: 'Leçons', icon: CarFront },
  { to: '/conduite/reservations', label: 'Réservations', icon: CalendarDays },
  { to: '/conduite/moniteurs', label: 'Moniteurs', icon: UserCog },
]

export function ConduiteSection({
  kicker = 'CONDUITE',
  ...props
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return <PageSection kicker={kicker} tabs={TABS} tabsLabel="Espace Conduite" {...props} />
}
