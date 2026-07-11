import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CarFront,
  ClipboardCheck,
  FileText,
  HelpCircle,
  List,
  Map,
} from 'lucide-react'

export type ModuleTone = 'green' | 'gold' | 'navy'

export interface ModuleItem {
  id: string
  label: string
  subtitle: string
  path: string
  icon: LucideIcon
  tone: ModuleTone
}

export const codeModules: ModuleItem[] = [
  {
    id: 'revision-chapitres',
    label: 'Révision par chapitres',
    subtitle: 'Signalisation, priorités, sécurité…',
    path: '/code/revision-chapitres',
    icon: List,
    tone: 'green',
  },
  {
    id: 'examens-test',
    label: 'Examens test',
    subtitle: 'Auto-évaluation guidée',
    path: '/code/examens-test',
    icon: HelpCircle,
    tone: 'gold',
  },
  {
    id: 'suivi-apprenants',
    label: "Suivi de l'avancée des apprenants",
    subtitle: 'Parcours cours, questions, tests et conduite',
    path: '/code/suivi-apprenants',
    icon: FileText,
    tone: 'navy',
  },
  {
    id: 'e-codepermis',
    label: 'E-Codepermis',
    subtitle: 'Examen blanc en conditions réelles',
    path: '/code/e-codepermis',
    icon: ClipboardCheck,
    tone: 'green',
  },
]

export const conduiteModules: ModuleItem[] = [
  {
    id: 'lecons',
    label: 'Leçons de conduite',
    subtitle: 'Contenus et parcours pratiques',
    path: '/conduite/lecons',
    icon: CarFront,
    tone: 'gold',
  },
  {
    id: 'reservations',
    label: 'Réservations & moniteurs',
    subtitle: 'Équipe, véhicules, créneaux et séances',
    path: '/conduite/reservations',
    icon: Calendar,
    tone: 'green',
  },
]

export const dashboardModules = [
  {
    id: 'code',
    label: 'Code de la route',
    subtitle: 'Cours, QCM et examens blancs',
    path: '/code',
    icon: Map,
    tone: 'green' as const,
  },
  {
    id: 'conduite',
    label: 'Conduite',
    subtitle: 'Leçons pratiques et suivi moniteur',
    path: '/conduite',
    icon: CarFront,
    tone: 'gold' as const,
  },
]
