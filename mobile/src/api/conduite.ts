import { apiAuthed, ApiError } from './client'

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

export class ContentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContentError'
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { auth?: boolean },
): Promise<T> {
  const { auth: _auth, ...rest } = options ?? {}
  try {
    return await apiAuthed<T>(path, rest)
  } catch (error) {
    if (error instanceof ApiError) throw new ContentError(error.message)
    throw new ContentError('Contenu indisponible')
  }
}

export async function fetchConduiteChapters(): Promise<ConduiteChapter[]> {
  const data = await request<{ chapters: ConduiteChapter[] }>('/content/conduite/chapters', { auth: true })
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
