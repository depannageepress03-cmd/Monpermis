import { apiFetch } from './client'

export interface AdminPracticeExamOverview {
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

export function fetchAdminPracticeExams(token: string) {
  return apiFetch<AdminPracticeExamOverview>('/api/admin/revision/practice-exams', {}, token)
}

export function generateAdminPracticeExams(token: string) {
  return apiFetch<{
    bankCount: number
    requiredSize: number
    examTotal: number
    passScore: number
    examCount: number
    exams: { id: string; examNumber: number; questionCount: number; published: boolean }[]
  }>('/api/admin/revision/practice-exams/generate', { method: 'POST', body: JSON.stringify({}) }, token)
}
