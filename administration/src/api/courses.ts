import { apiFetch } from './client'
import type { ContentModule, Course, ModulePayload } from '../types/revision'

export function fetchStandaloneCourses(token: string) {
  return apiFetch<{ courses: Course[] }>('/api/admin/revision/courses', {}, token)
}

export function createStandaloneCourse(token: string, title: string) {
  return apiFetch<{ course: Course }>(
    '/api/admin/revision/courses',
    { method: 'POST', body: JSON.stringify({ title }) },
    token,
  )
}

export function updateStandaloneCourse(
  token: string,
  courseId: string,
  payload: { title?: string; published?: boolean },
) {
  return apiFetch<{ course: Course }>(
    `/api/admin/revision/courses/${courseId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function reorderStandaloneCourses(token: string, orderedIds: string[]) {
  return apiFetch<{ courses: Course[] }>(
    '/api/admin/revision/courses/reorder',
    { method: 'POST', body: JSON.stringify({ orderedIds }) },
    token,
  )
}

export function deleteStandaloneCourse(token: string, courseId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/revision/courses/${courseId}`,
    { method: 'DELETE' },
    token,
  )
}

export function createStandaloneModule(
  token: string,
  courseId: string,
  payload: ModulePayload = {},
) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/revision/courses/${courseId}/modules`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateStandaloneModule(
  token: string,
  courseId: string,
  moduleId: string,
  payload: ModulePayload,
) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/revision/courses/${courseId}/modules/${moduleId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteStandaloneModule(token: string, courseId: string, moduleId: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/revision/courses/${courseId}/modules/${moduleId}`,
    { method: 'DELETE' },
    token,
  )
}

export function duplicateStandaloneModule(token: string, courseId: string, moduleId: string) {
  return apiFetch<{ module: ContentModule }>(
    `/api/admin/revision/courses/${courseId}/modules/${moduleId}/duplicate`,
    { method: 'POST' },
    token,
  )
}

export function reorderStandaloneModules(token: string, courseId: string, orderedIds: string[]) {
  return apiFetch<{ course: Course }>(
    `/api/admin/revision/courses/${courseId}/modules/reorder`,
    { method: 'POST', body: JSON.stringify({ orderedIds }) },
    token,
  )
}
