import { apiFetch, apiUpload } from './client'
import type {
  ChapterQuestion,
  QuestionPayload,
  TestSubject,
  TestSubjectCurrent,
} from '../types/questions'

export function fetchChapterQuestions(token: string, chapterId: string) {
  return apiFetch<{
    chapter: { id: string; name: string }
    questions: ChapterQuestion[]
  }>(`/api/admin/revision/chapters/${chapterId}/questions`, {}, token)
}

export function createQuestion(token: string, chapterId: string, payload: QuestionPayload) {
  return apiFetch<{ question: ChapterQuestion }>(
    `/api/admin/revision/chapters/${chapterId}/questions`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateQuestion(
  token: string,
  chapterId: string,
  questionId: string,
  payload: Partial<QuestionPayload> & { published?: boolean },
) {
  return apiFetch<{ question: ChapterQuestion }>(
    `/api/admin/revision/chapters/${chapterId}/questions/${questionId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteQuestion(token: string, chapterId: string, questionId: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/revision/chapters/${chapterId}/questions/${questionId}`,
    { method: 'DELETE' },
    token,
  )
}

export function fetchCurrentTestSubject(token: string, chapterId: string) {
  return apiFetch<TestSubjectCurrent>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/current`,
    {},
    token,
  )
}

export function generateTestSubject(token: string, chapterId: string) {
  return apiFetch<{
    bankCount: number
    requiredCount: number
    subject: TestSubject
  }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/generate`,
    { method: 'POST', body: JSON.stringify({}) },
    token,
  )
}

export function updateTestSubject(
  token: string,
  chapterId: string,
  subjectId: string,
  payload: { published: boolean },
) {
  return apiFetch<{ subject: TestSubject }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/${subjectId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteTestSubject(token: string, chapterId: string, subjectId: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/revision/chapters/${chapterId}/test-subjects/${subjectId}`,
    { method: 'DELETE' },
    token,
  )
}

export function uploadRevisionAudio(token: string, file: Blob, filename = 'audio.webm') {
  const formData = new FormData()
  formData.append('audio', file, filename)
  return apiUpload<{ audioUrl: string; mediaBytes: number }>(
    '/api/admin/revision/upload-audio',
    formData,
    token,
  )
}
