import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export class ContentError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'ContentError'
    this.status = status
    this.code = code
  }
}

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

async function request<T>(path: string, options?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  }

  // Contenu apprenant : auth par défaut (évite les 401 silencieux)
  const needAuth = options?.auth !== false
  if (needAuth) {
    const token = getToken()
    if (!token) throw new ContentError('Authentification requise', 401)
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new ContentError(body.error ?? 'Contenu indisponible', response.status, body.code)
  }
  return body.data
}

export interface LearnerModule {
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

export interface LearnerCourse {
  id: string
  title: string
  order: number
  modules: LearnerModule[]
}

export interface LearnerChapter {
  id: string
  name: string
  order: number
  courses: LearnerCourse[]
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

export function fetchRevisionChapters() {
  return request<{ chapters: LearnerChapter[] }>('/content/revision/chapters', { auth: true }).then(
    (data) => data.chapters,
  )
}

export function fetchConduiteChapters() {
  return request<{ chapters: LearnerChapter[] }>('/content/conduite/chapters', { auth: true }).then(
    (data) => data.chapters,
  )
}

export interface LearnerAnswer {
  id: string
  label: string
  text?: string
  audioUrl?: string
}

export interface LearnerQuestion {
  id: string
  chapterId: string
  order: number
  prompt: {
    text?: string
    audioUrl?: string
    imageUrls?: string[]
  }
  answers: LearnerAnswer[]
}

export function fetchRevisionChapterQuestions(chapterId: string) {
  return request<{ questions: LearnerQuestion[] }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions`,
    { auth: true },
  ).then((data) => data.questions)
}

export function fetchRevisionChapterTestSubject(chapterId: string) {
  return request<{ subject: { questions: LearnerQuestion[] } }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subject`,
    { auth: true },
  ).then((data) => data.subject.questions)
}

export function checkRevisionQuestionAnswers(
  chapterId: string,
  questionId: string,
  answerIds: string[],
) {
  return request<{ isCorrect: boolean; correctAnswerIds: string[] }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions/check`,
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ questionId, answerIds }),
    },
  )
}

export function fetchRevisionProgressFull(chapterId?: string) {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
  return request<LearnerProgress>(`/content/revision/progress${query}`, { auth: true })
}

export function fetchConduiteProgressFull(chapterId?: string) {
  const query = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : ''
  return request<LearnerProgress>(`/content/conduite/progress${query}`, { auth: true })
}

export function fetchRevisionProgress(chapterId?: string) {
  return fetchRevisionProgressFull(chapterId).then((data) => data.completedCourses)
}

export function fetchConduiteProgress(chapterId?: string) {
  return fetchConduiteProgressFull(chapterId).then((data) => data.completedCourses)
}

export function startRevisionCourseSession(chapterId: string, courseId: string) {
  return request<CourseSessionStart>('/content/revision/progress/start', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export function startConduiteCourseSession(chapterId: string, courseId: string) {
  return request<CourseSessionStart>('/content/conduite/progress/start', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export function markRevisionCourseCompleted(chapterId: string, courseId: string) {
  return request<{ completed: boolean }>('/content/revision/progress', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export function markConduiteCourseCompleted(chapterId: string, courseId: string) {
  return request<{ completed: boolean }>('/content/conduite/progress', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ chapterId, courseId }),
  })
}

export function markRevisionTestCompleted(chapterId: string, correct: number, total: number) {
  return request<{ completed: boolean }>('/content/revision/progress/test', {
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
  questions: LearnerQuestion[]
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

export function fetchLearnerJourney() {
  return request<LearnerJourney>('/content/revision/progress/journey', { auth: true })
}

export function fetchPracticeExams() {
  return request<PracticeExamsOverview>('/content/revision/practice-exams', { auth: true })
}

export function startPracticeExam(examNumber: number) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/revision/practice-exams/${examNumber}/start`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export function fetchPracticeExamAttempt(attemptId: string) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/revision/practice-exams/attempts/${attemptId}`,
    { auth: true },
  )
}

export function checkPracticeExamAnswer(
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

export function completePracticeExam(attemptId: string) {
  return request<{ attempt: PracticeExamScore }>(
    `/content/revision/practice-exams/attempts/${attemptId}/complete`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export function fetchPracticeExamScores() {
  return request<{
    passScore: number
    examTotal: number
    completedCount: number
    passedCount: number
    scores: PracticeExamScore[]
  }>('/content/revision/practice-exams/scores', { auth: true })
}

export function fetchECodePermisExams() {
  return request<PracticeExamsOverview>('/content/ecodepermis/exams', { auth: true })
}

export function startECodePermisExam(examNumber: number) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/ecodepermis/exams/${examNumber}/start`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export function fetchECodePermisExamAttempt(attemptId: string) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/ecodepermis/exams/attempts/${attemptId}`,
    { auth: true },
  )
}

export function checkECodePermisAnswer(
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
  }>(`/content/ecodepermis/exams/attempts/${attemptId}/check`, {
    method: 'POST',
    body: JSON.stringify({ questionId, answerIds }),
    auth: true,
  })
}

export function completeECodePermisExam(attemptId: string) {
  return request<{ attempt: PracticeExamScore }>(
    `/content/ecodepermis/exams/attempts/${attemptId}/complete`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}
