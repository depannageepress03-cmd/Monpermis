import { ApiError, apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'

export interface ReportIssue {
  code: string
  message: string
}

export interface ReportExamRow {
  attemptId: string
  examNumber: number
  subject: string
  category: string
  author: string
  sceneName: string
  composedAt: string | null
  completedAt: string | null
  lastAt: string | null
  outcome: 'completed' | 'in_progress' | 'stopped'
  status: 'completed' | 'not_completed'
  statusLabel: string
  total: number
  treated: number
  correct: number
  incorrect: number
  unanswered: number
  failed: number
  note: number | null
  completed: boolean
  evaluated: boolean
  coefficient: number
  passed: boolean | null
  wrongNumbers: number[]
  unansweredNumbers: number[]
  issues: ReportIssue[]
  counted: boolean
}

export interface ReportExamSummary {
  attemptsListed: number
  evaluatedCount: number
  completedCount: number
  unfinishedCount: number
  totalQuestions: number
  totalCorrect: number
  totalIncorrect: number
  totalUnanswered: number
  totalFailed: number
  coefficientSum: number
  average: number | null
  bestNote: number | null
  lowestNote: number | null
}

export type CourseStatus = 'not_started' | 'in_progress' | 'completed' | 'validated' | 'to_verify'

export interface ReportLesson {
  chapterId: string
  chapterName: string
  chapterOrder: number
  courseId: string
  title: string
  order: number
  state: 'not_started' | 'in_progress' | 'completed'
  openedAt: string | null
  completedAt: string | null
  validated: boolean
}

export interface ReportCourse {
  total: number
  followed: number
  completed: number
  inProgress: number
  notStarted: number
  validated: number
  percent: number | null
  status: CourseStatus
  statusLabel: string
  chaptersTotal: number
  chaptersValidated: number
  lessons: ReportLesson[]
  remaining: ReportLesson[]
  issues: ReportIssue[]
  orphanCompleted: number
}

export interface LearnerReport {
  generatedAt: string
  learner: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    registeredAt: string | null
    isActive: boolean
  }
  exams: {
    passScore: number
    questionsPerExam: number
    rows: ReportExamRow[]
    summary: ReportExamSummary
    issues: ReportIssue[]
  }
  course: ReportCourse
  missingInfo: { field: string; examNumber?: number; label: string }[]
}

export interface RankingEntry {
  userId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  isActive: boolean
  rank: number | null
  average: number | null
  evaluatedCount: number
  completedCount: number
  unfinishedCount: number
  bestNote: number | null
  lowestNote: number | null
  anomalies: number
  course: {
    status: CourseStatus
    statusLabel: string
    completed: number
    total: number
    percent: number | null
  }
}

export function fetchLearnerReport(token: string, userId: string) {
  return apiFetch<LearnerReport>(`/api/admin/users/${encodeURIComponent(userId)}/report`, {}, token)
}

export function fetchRanking(token: string) {
  return apiFetch<{ entries: RankingEntry[]; passScore: number; lessonsTotal: number }>(
    '/api/admin/users/ranking',
    {},
    token,
  )
}

/** Télécharge la fiche PDF d'UN apprenant (générée côté serveur à partir de ses données actuelles). */
export async function downloadLearnerReportPdf(token: string, userId: string) {
  const response = await fetch(`${getApiOrigin()}/api/admin/users/${encodeURIComponent(userId)}/report.pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(body.error ?? 'Téléchargement impossible', response.status)
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? 'fiche-eleve.pdf'

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
