import { getStoredToken } from './auth'
import { getApiBase } from './config'

export interface RevisionModule {
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

export interface RevisionCourse {
  id: string
  title: string
  order: number
  modules: RevisionModule[]
}

export interface RevisionChapter {
  id: string
  name: string
  order: number
  courses: RevisionCourse[]
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

export async function fetchRevisionChapters(): Promise<RevisionChapter[]> {
  const data = await request<{ chapters: RevisionChapter[] }>('/content/revision/chapters')
  return data.chapters
}

export async function fetchLearnerProgress(chapterId?: string): Promise<LearnerProgress> {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
  return request<LearnerProgress>(`/content/revision/progress${query}`, { auth: true })
}

/** @deprecated Prefer fetchLearnerProgress */
export async function fetchCourseProgress(chapterId?: string): Promise<CourseProgressEntry[]> {
  const data = await fetchLearnerProgress(chapterId)
  return data.completedCourses
}

export async function startCourseSession(
  chapterId: string,
  courseId: string,
): Promise<CourseSessionStart> {
  return request<CourseSessionStart>('/content/revision/progress/start', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export async function markCourseCompleted(chapterId: string, courseId: string): Promise<void> {
  await request<{ completed: boolean }>('/content/revision/progress', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export async function markChapterTestCompleted(
  chapterId: string,
  correct: number,
  total: number,
): Promise<void> {
  await request<{ completed: boolean }>('/content/revision/progress/test', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, correct, total }),
  })
}

export interface LearnerJourneyStop {
  track: 'revision' | 'conduite'
  type: 'course' | 'test' | 'done'
  chapterId: string | null
  chapterName: string | null
  courseId: string | null
  courseTitle: string | null
  label: string
}

export interface LearnerJourney {
  code: {
    currentStop: LearnerJourneyStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  conduite: {
    currentStop: LearnerJourneyStop | null
    chaptersDone: number
    chaptersTotal: number
  }
  testScores: {
    chapterId: string
    chapterName: string
    correct: number
    total: number
    scoreLabel: string
    completedAt?: string | null
  }[]
  practiceExams: {
    examTotal: number
    passScore: number
    completedCount: number
    passedCount: number
    scores: PracticeExamScore[]
  }
}

export interface PracticeExamScore {
  id: string
  examNumber: number
  correct: number
  total: number
  scoreLabel: string
  passed: boolean
  passScore: number
  completedAt?: string | null
}

export interface PracticeExamSummary {
  id: string
  examNumber: number
  questionCount: number
  status: 'available' | 'in_progress' | 'completed'
  attemptId: string | null
  score: {
    correct: number
    total: number
    scoreLabel: string
    passed: boolean
    completedAt?: string | null
  } | null
}

export interface PracticeExamsOverview {
  bankCount: number
  examCount: number
  requiredSize: number
  examTotal: number
  passScore: number
  unlocked?: boolean
  completedCount: number
  passedCount: number
  exams: PracticeExamSummary[]
  scores: PracticeExamScore[]
  message?: string
}

export interface PracticeExamAttempt {
  id: string
  examId: string
  examNumber: number
  status: 'in_progress' | 'completed'
  questionCount: number
  questions: RevisionQuestion[]
  answeredCount: number
  liveCorrect?: number
  correct: number
  total: number
  scoreLabel: string
  passed: boolean
  passScore: number
  completedAt?: string | null
  startedAt?: string | null
}

export async function fetchLearnerJourney(): Promise<LearnerJourney> {
  return request<LearnerJourney>('/content/revision/progress/journey', { auth: true })
}

export async function fetchPracticeExams(): Promise<PracticeExamsOverview> {
  return request<PracticeExamsOverview>('/content/revision/practice-exams', { auth: true })
}

export async function startPracticeExam(examNumber: number) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/revision/practice-exams/${examNumber}/start`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export async function checkPracticeExamAnswer(
  attemptId: string,
  questionId: string,
  answerIds: string[],
) {
  return request<{
    isCorrect: boolean
    correctAnswerIds: string[]
    answeredCount: number
    total: number
    liveCorrect: number
  }>(`/content/revision/practice-exams/attempts/${attemptId}/check`, {
    method: 'POST',
    body: JSON.stringify({ questionId, answerIds }),
    auth: true,
  })
}

export async function completePracticeExam(attemptId: string) {
  return request<{ attempt: PracticeExamScore }>(
    `/content/revision/practice-exams/attempts/${attemptId}/complete`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export interface RevisionAnswer {
  id: string
  label: string
  text?: string
  audioUrl: string
}

export interface RevisionQuestion {
  id: string
  chapterId: string
  order: number
  prompt: {
    text?: string
    audioUrl: string
    imageUrls: string[]
  }
  answers: RevisionAnswer[]
}

export async function fetchChapterQuestions(chapterId: string): Promise<RevisionQuestion[]> {
  const data = await request<{ questions: RevisionQuestion[] }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions`,
    { auth: true },
  )
  return data.questions
}

export async function fetchChapterTestSubject(chapterId: string): Promise<RevisionQuestion[]> {
  const data = await request<{
    subject: { questions: RevisionQuestion[] }
  }>(`/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subject`, { auth: true })
  return data.subject.questions
}

export async function checkQuestionAnswers(
  chapterId: string,
  questionId: string,
  answerIds: string[],
): Promise<{ isCorrect: boolean; correctAnswerIds: string[] }> {
  return request<{ isCorrect: boolean; correctAnswerIds: string[] }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions/check`,
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ questionId, answerIds }),
    },
  )
}
