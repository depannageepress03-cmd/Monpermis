import { apiFetch } from './client'

export interface AppUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  authProvider: 'local' | 'google'
  isEmailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface CreateUserPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
}

export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  phone?: string
  isActive?: boolean
  password?: string
}

export function fetchUsers(token: string) {
  return apiFetch<{ users: AppUser[] }>('/api/admin/users', {}, token)
}

export interface LearnerCourseProgress {
  id: string
  title: string
  order: number
  completed: boolean
  completedAt: string | null
}

export interface LearnerChapterProgress {
  id: string
  name: string
  order: number
  unlocked: boolean
  status: string
  courses: LearnerCourseProgress[]
  coursesCompleted: number
  coursesTotal: number
  quizUnlocked: boolean
  test: {
    completed: boolean
    correct: number | null
    total: number | null
    completedAt: string | null
    scoreLabel: string | null
  } | null
  nextCourse: { id: string; title: string } | null
}

export interface LearnerCurrentStop {
  track: 'revision' | 'conduite'
  type: 'course' | 'test' | 'done'
  chapterId: string | null
  chapterName: string | null
  courseId: string | null
  courseTitle: string | null
  label: string
}

export interface LearnerProgressDetail {
  user: AppUser
  code: {
    chapters: LearnerChapterProgress[]
    currentStop: LearnerCurrentStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  conduite: {
    chapters: LearnerChapterProgress[]
    currentStop: LearnerCurrentStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  testScores: {
    chapterId: string
    chapterName: string
    correct: number
    total: number
    scoreLabel: string
    completedAt: string | null
  }[]
  practiceExams?: {
    examTotal: number
    passScore: number
    completedCount: number
    passedCount: number
    scores: {
      id: string
      examNumber: number
      correct: number
      total: number
      scoreLabel: string
      passed: boolean
      passScore: number
      completedAt?: string | null
    }[]
  }
}

export function fetchUserProgress(token: string, userId: string) {
  return apiFetch<LearnerProgressDetail>(`/api/admin/users/${userId}/progress`, {}, token)
}

export function createUser(token: string, payload: CreateUserPayload) {
  return apiFetch<{ user: AppUser }>(
    '/api/admin/users',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  )
}

export function updateUser(token: string, userId: string, payload: UpdateUserPayload) {
  return apiFetch<{ user: AppUser }>(
    `/api/admin/users/${userId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  )
}

export function deleteUser(token: string, userId: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/users/${userId}`,
    { method: 'DELETE' },
    token,
  )
}
