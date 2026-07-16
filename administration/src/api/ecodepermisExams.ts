import { apiFetch } from './client'

export interface AdminECodePermisOverview {
  bankCount: number
  requiredSize: number
  examTotal: number
  passScore: number
  examCount: number
  ready: boolean
  exams: {
    id: string
    examNumber: number
    questionCount: number
    published: boolean
    updatedAt?: string
  }[]
  recentResults: {
    id: string
    examNumber: number
    correct: number
    total: number
    scoreLabel: string
    passed: boolean
    passScore: number
    completedAt?: string | null
    learnerName: string
    learnerEmail: string
  }[]
}

export function fetchAdminECodePermisExams(token: string) {
  return apiFetch<AdminECodePermisOverview>('/api/admin/ecodepermis/exams', {}, token)
}

export function generateAdminECodePermisExams(token: string) {
  return apiFetch<{
    bankCount: number
    requiredSize: number
    examTotal: number
    passScore: number
    examCount: number
    exams: { id: string; examNumber: number; questionCount: number; published: boolean }[]
  }>('/api/admin/ecodepermis/exams/generate', { method: 'POST', body: JSON.stringify({}) }, token)
}

export function fetchAdminECodePermisExamById(token: string, examId: string) {
  return apiFetch<{ exam: AdminECodePermisOverview['exams'][0] & { questions: any[] } }>(
    `/api/admin/ecodepermis/exams/${examId}`,
    {},
    token,
  )
}

export function updateAdminECodePermisExam(token: string, examId: string, payload: { published: boolean }) {
  return apiFetch<{ exam: AdminECodePermisOverview['exams'][0] & { questions: any[] } }>(
    `/api/admin/ecodepermis/exams/${examId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}
