import { getStoredToken } from './auth'
import { getApiBase } from './config'

export interface ConduiteModule {
  id: string
  name: string
  title: string
  text: string
  mediaType: '' | 'video' | 'image'
  videoUrl: string
  imageUrl: string
  mediaBytes: number
  order: number
}

export interface ConduiteCourse {
  id: string
  title: string
  order: number
  modules: ConduiteModule[]
}

export interface ConduiteChapter {
  id: string
  name: string
  order: number
  courses: ConduiteCourse[]
}

export interface CourseProgressEntry {
  chapterId: string
  courseId: string
  completedAt?: string
}

export interface TestProgressEntry {
  chapterId: string
  correct: number
  total: number
  completedAt?: string
}

export interface CourseSessionEntry {
  chapterId: string
  courseId: string
  openedAt?: string
  secondsRemaining: number
}

export interface LearnerProgress {
  minCourseSeconds: number
  completedCourses: CourseProgressEntry[]
  completedTests: TestProgressEntry[]
  courseSessions: CourseSessionEntry[]
}

export interface CourseSessionStart {
  chapterId: string
  courseId: string
  openedAt: string | null
  secondsRemaining: number
  minCourseSeconds: number
  alreadyCompleted: boolean
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class ContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContentError'
  }
}

async function request<T>(path: string, options?: RequestInit & { auth?: boolean }): Promise<T> {
  const { auth, headers, ...rest } = options ?? {}
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = await getStoredToken()
    if (!token) throw new ContentError('Authentification requise')
    requestHeaders.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...rest,
      headers: requestHeaders,
    })
  } catch {
    throw new ContentError('Impossible de joindre le serveur')
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || !body.data) {
    throw new ContentError(body.error ?? 'Contenu indisponible')
  }

  return body.data
}

export async function fetchConduiteChapters(): Promise<ConduiteChapter[]> {
  const data = await request<{ chapters: ConduiteChapter[] }>('/content/conduite/chapters')
  return data.chapters
}

export async function fetchLearnerProgress(chapterId?: string): Promise<LearnerProgress> {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
  return request<LearnerProgress>(`/content/conduite/progress${query}`, { auth: true })
}

export async function fetchCourseProgress(chapterId?: string): Promise<CourseProgressEntry[]> {
  const data = await fetchLearnerProgress(chapterId)
  return data.completedCourses
}

export async function startCourseSession(
  chapterId: string,
  courseId: string,
): Promise<CourseSessionStart> {
  return request<CourseSessionStart>('/content/conduite/progress/start', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export async function markCourseCompleted(chapterId: string, courseId: string): Promise<void> {
  await request<{ completed: boolean }>('/content/conduite/progress', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}
