import type { ReactNode } from 'react'
import { BookOpen, ClipboardCheck, LayoutGrid, List, Radar } from 'lucide-react'
import { PageSection, type SectionTab } from './PageSection'

/** Onglets de l'espace « Code de la route » : même barre sur toutes les pages de la section. */
const TABS: readonly SectionTab[] = [
  { to: '/code', label: 'Vue d’ensemble', icon: LayoutGrid, end: true },
  { to: '/code/revision-chapitres', label: 'Révision', icon: List },
  { to: '/code/cours', label: 'Cours', icon: BookOpen },
  { to: '/code/examens-test', label: 'Examens test', icon: ClipboardCheck },
  { to: '/code/suivi-apprenants', label: 'Suivi apprenants', icon: Radar },
]

export function CodeSection({
  kicker = 'CODE DE LA ROUTE',
  ...props
}: {
  kicker?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return <PageSection kicker={kicker} tabs={TABS} tabsLabel="Espace Code de la route" {...props} />
}
