import { apiFetch } from './client'

export type TrackEventName =
  | 'app_open'
  | 'app_background'
  | 'app_foreground'
  | 'screen_view'
  | 'exam_start'
  | 'exam_answer'
  | 'exam_skip'
  | 'exam_quit'
  | 'exam_complete'
  | 'exam_pause'
  | 'exam_resume'
  | 'test_start'
  | 'test_answer'
  | 'test_skip'
  | 'test_complete'
  | 'practice_start'
  | 'practice_answer'
  | 'practice_skip'
  | 'practice_complete'

export interface TrackEvent {
  id: string
  userId: string
  event: TrackEventName
  sessionId: string
  context: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  clientTs: string | null
  appVersion: string
  platform: string
  createdAt: string
}

export interface TrackExamSession {
  attemptId: string
  userId: string
  firstName: string
  lastName: string
  phone: string
  examType: 'practice' | 'ecodepermis'
  examNumber: number | null
  startAt: string
  lastAt: string
  durationSeconds: number
  answers: number
  skips: number
  quits: number
  completed: boolean
  correct: number | null
  total: number | null
  passed: boolean | null
}

export interface TrackLearner {
  userId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  lastActivity: string
  events: number
}

export interface TrackStats {
  today: {
    events: number
    activeLearners: number
    exams: {
      started: number
      completed: number
      passed: number
      passRate: number | null
      avgDurationSeconds: number | null
    }
  }
  last30Days: {
    started: number
    completed: number
    passed: number
    passRate: number | null
    avgDurationSeconds: number | null
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface TrackQuery {
  page?: number
  limit?: number
  userId?: string
  event?: string
  examNumber?: string
  attemptId?: string
  q?: string
  from?: string
  to?: string
}

function buildQuery(params: TrackQuery) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.userId) qs.set('userId', params.userId)
  if (params.event) qs.set('event', params.event)
  if (params.examNumber) qs.set('examNumber', params.examNumber)
  if (params.attemptId) qs.set('attemptId', params.attemptId)
  if (params.q) qs.set('q', params.q)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function fetchTrackStats(token: string) {
  return apiFetch<{ today: TrackStats['today']; last30Days: TrackStats['last30Days'] }>(
    '/api/admin/tracking/stats',
    {},
    token,
  )
}

export function fetchTrackExamSessions(token: string, params: TrackQuery = {}) {
  return apiFetch<{ exams: TrackExamSession[]; pagination: Pagination }>(
    `/api/admin/tracking/exams${buildQuery(params)}`,
    {},
    token,
  )
}

export function fetchTrackAttemptTimeline(token: string, attemptId: string) {
  return apiFetch<{ attemptId: string; events: TrackEvent[] }>(
    `/api/admin/tracking/exams/${encodeURIComponent(attemptId)}`,
    {},
    token,
  )
}

export function fetchTrackEvents(token: string, params: TrackQuery = {}) {
  return apiFetch<{
    events: TrackEvent[]
    filters: { events: TrackEventName[] }
    pagination: Pagination
  }>(`/api/admin/tracking${buildQuery(params)}`, {}, token)
}

export function fetchTrackLearners(token: string, params: TrackQuery = {}) {
  return apiFetch<{ learners: TrackLearner[]; pagination: Pagination }>(
    `/api/admin/tracking/learners${buildQuery(params)}`,
    {},
    token,
  )
}
