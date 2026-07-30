import { apiAuthed, ApiError } from './client'
import { mergeWithStandardChapters, getChapterOrderById } from '../data/codeRoute/chapterIndex'
import {
  checkLocalAnswers,
  getLocalBankByChapterOrder,
  toPublicLocalQuestion,
} from '../data/codeRoute/banks'
import { buildLocalSubject, buildLocalSubjectSummaries } from '../data/codeRoute/subjects'
import { listStandardChapterShells } from '../data/codeRoute/standardChapters'
import { cacheGetThenFetch } from '../utils/contentCache'

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


function withStandardChapters(chapters: RevisionChapter[]) {
  return mergeWithStandardChapters(chapters)
}

export async function fetchRevisionChapters(): Promise<RevisionChapter[]> {
  try {
    return await cacheGetThenFetch('revision:chapters', async () => {
      const data = await request<{ chapters: RevisionChapter[] }>('/content/revision/chapters', {
        auth: true,
      })
      return withStandardChapters(data.chapters)
    })
  } catch {
    // Hors ligne : catalogue local 21 chapitres.
    return withStandardChapters(listStandardChapterShells() as RevisionChapter[])
  }
}

/** Variante SWR : pousse le cache immédiatement via onData, puis le réseau. */
export async function fetchRevisionChaptersSWR(
  onData: (chapters: RevisionChapter[], meta: { fromCache: boolean }) => void,
) {
  try {
    return await cacheGetThenFetch(
      'revision:chapters',
      async () => {
        const data = await request<{ chapters: RevisionChapter[] }>('/content/revision/chapters', {
          auth: true,
        })
        return withStandardChapters(data.chapters)
      },
      {
        onData: (data, meta) => onData(withStandardChapters(data), { fromCache: meta.fromCache }),
      },
    )
  } catch {
    const local = withStandardChapters(listStandardChapterShells() as RevisionChapter[])
    onData(local, { fromCache: true })
    return local
  }
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

export async function fetchECodePermisExams(): Promise<PracticeExamsOverview> {
  return request<PracticeExamsOverview>('/content/ecodepermis/exams', { auth: true })
}

export async function startECodePermisExam(examNumber: number) {
  return request<{ attempt: PracticeExamAttempt }>(
    `/content/ecodepermis/exams/${examNumber}/start`,
    { method: 'POST', body: JSON.stringify({}), auth: true },
  )
}

export async function checkECodePermisAnswer(
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

export async function completeECodePermisExam(attemptId: string) {
  return request<{ attempt: PracticeExamScore }>(
    `/content/ecodepermis/exams/attempts/${attemptId}/complete`,
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
  /** Nombre de bonnes réponses (sans révéler lesquelles). */
  correctCount?: number
  prompt: {
    text?: string
    audioUrl: string
    imageUrls: string[]
  }
  answers: RevisionAnswer[]
}

export async function fetchChapterQuestions(chapterId: string): Promise<RevisionQuestion[]> {
  const order = getChapterOrderById(chapterId)
  const localBank = order ? getLocalBankByChapterOrder(order) : null
  if (localBank) {
    return localBank.map((q) => toPublicLocalQuestion(q, chapterId))
  }

  try {
    return await cacheGetThenFetch(`revision:questions:${chapterId}`, async () => {
      const data = await request<{ questions: RevisionQuestion[] }>(
        `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions`,
        { auth: true },
      )
      return data.questions
    })
  } catch {
    return []
  }
}

export type RevisionTestSubjectSummary = {
  number: number
  id: string
  label: string
  questionCount: number
}

export async function fetchChapterTestSubjects(chapterId: string) {
  const order = getChapterOrderById(chapterId)
  if (order && getLocalBankByChapterOrder(order)) {
    return buildLocalSubjectSummaries(order, chapterId)
  }

  return request<{
    publishedCount: number
    questionsPerSubject: number
    subjects: RevisionTestSubjectSummary[]
  }>(`/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subjects`, { auth: true })
}

export async function fetchChapterTestSubject(
  chapterId: string,
  subjectNumber = 1,
): Promise<{ number: number; label: string; questions: RevisionQuestion[] }> {
  const order = getChapterOrderById(chapterId)
  if (order && getLocalBankByChapterOrder(order)) {
    const subject = buildLocalSubject(order, chapterId, subjectNumber)
    if (!subject) throw new ContentError('Sujet test introuvable')
    return subject
  }

  const data = await request<{
    subject: { number: number; label: string; questions: RevisionQuestion[] }
  }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/test-subjects/${encodeURIComponent(String(subjectNumber))}`,
    { auth: true },
  )
  return data.subject
}

export async function checkQuestionAnswers(
  chapterId: string,
  questionId: string,
  answerIds: string[],
): Promise<{ isCorrect: boolean; correctAnswerIds: string[] }> {
  const local = checkLocalAnswers(questionId, answerIds)
  if (local) return local

  return request<{ isCorrect: boolean; correctAnswerIds: string[] }>(
    `/content/revision/chapters/${encodeURIComponent(chapterId)}/questions/check`,
    {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ questionId, answerIds }),
    },
  )
}
