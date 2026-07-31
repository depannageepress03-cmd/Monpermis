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
    subtitle: '24 sujets · mélange par chapitres',
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
    id: 'cours',
    label: 'Cours',
    subtitle: 'Cours et modules (hors chapitres)',
    path: '/code/cours',
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
    label: 'Réservations',
    subtitle: 'Séances, filtres et paiements',
    path: '/conduite/reservations',
    icon: Calendar,
    tone: 'green',
  },
  {
    id: 'moniteurs',
    label: 'Moniteurs',
    subtitle: 'Équipe, véhicules et disponibilités',
    path: '/conduite/moniteurs',
    icon: CarFront,
    tone: 'navy',
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
