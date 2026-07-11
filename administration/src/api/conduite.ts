import { apiFetch, apiUpload } from './client'
import type { Chapter, Course, ContentModule, ModulePayload } from '../types/revision'

export function fetchChapters(token: string) {
  return apiFetch<{ chapters: Chapter[] }>('/api/admin/conduite/chapters', {}, token)
}

export function createChapter(token: string, name: string) {
  return apiFetch<{ chapter: Chapter }>(
    '/api/admin/conduite/chapters',
    { method: 'POST', body: JSON.stringify({ name }) },
    token,
  )
}

export function updateChapter(
  token: string,
  chapterId: string,
  payload: { name?: string; published?: boolean },
) {
  return apiFetch<{ chapter: Chapter }>(
    `/api/admin/conduite/chapters/${chapterId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function reorderChapters(token: string, orderedIds: string[]) {
  return apiFetch<{ chapters: Chapter[] }>(
    '/api/admin/conduite/chapters/reorder',
    { method: 'POST', body: JSON.stringify({ orderedIds }) },
    token,
  )
}

export function duplicateChapter(token: string, chapterId: string) {
  return apiFetch<{ chapter: Chapter }>(
    `/api/admin/conduite/chapters/${chapterId}/duplicate`,
    { method: 'POST' },
    token,
  )
}

export function deleteChapter(token: string, chapterId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/conduite/chapters/${chapterId}`,
    { method: 'DELETE' },
    token,
  )
}

export function createCourse(token: string, chapterId: string, title: string) {
  return apiFetch<{ course: Course }>(
    `/api/admin/conduite/chapters/${chapterId}/courses`,
    { method: 'POST', body: JSON.stringify({ title }) },
    token,
  )
}

export function updateCourse(
  token: string,
  chapterId: string,
  courseId: string,
  payload: { title?: string; published?: boolean },
) {
  return apiFetch<{ course: Course }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function reorderCourses(token: string, chapterId: string, orderedIds: string[]) {
  return apiFetch<{ chapter: Chapter }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/reorder`,
    { method: 'POST', body: JSON.stringify({ orderedIds }) },
    token,
  )
}

export function deleteCourse(token: string, chapterId: string, courseId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}`,
    { method: 'DELETE' },
    token,
  )
}

export function createModule(
  token: string,
  chapterId: string,
  courseId: string,
  payload: ModulePayload = {},
) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}/modules`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function duplicateModule(
  token: string,
  chapterId: string,
  courseId: string,
  moduleId: string,
) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}/modules/${moduleId}/duplicate`,
    { method: 'POST' },
    token,
  )
}

export function reorderModules(
  token: string,
  chapterId: string,
  courseId: string,
  orderedIds: string[],
) {
  return apiFetch<{ chapter: Chapter }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}/modules/reorder`,
    { method: 'POST', body: JSON.stringify({ orderedIds }) },
    token,
  )
}

export function updateModule(
  token: string,
  chapterId: string,
  courseId: string,
  moduleId: string,
  payload: ModulePayload,
) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}/modules/${moduleId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteModule(
  token: string,
  chapterId: string,
  courseId: string,
  moduleId: string,
) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/conduite/chapters/${chapterId}/courses/${courseId}/modules/${moduleId}`,
    { method: 'DELETE' },
    token,
  )
}

export function uploadConduiteImage(token: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  return apiUpload<{ imageUrl: string; mediaBytes: number }>(
    '/api/admin/conduite/upload-image',
    formData,
    token,
  )
}
