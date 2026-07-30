import type { LearnerJourneyStop } from '../api/content'

/** Deep-link vers l’étape actuelle du parcours apprenant. */
export function journeyStopPath(stop: LearnerJourneyStop | null | undefined): string | null {
  if (!stop || stop.type === 'done') return null
  if (stop.track === 'revision') {
    if (stop.type === 'course' && stop.chapterId && stop.courseId) {
      return `/code-de-la-route/revision-chapitres/${stop.chapterId}/cours/${stop.courseId}`
    }
    if (stop.type === 'test' && stop.chapterId) {
      return `/code-de-la-route/revision-chapitres/${stop.chapterId}/sujet-test`
    }
    if (stop.chapterId) return `/code-de-la-route/revision-chapitres/${stop.chapterId}`
    return '/code-de-la-route/revision-chapitres'
  }
  if (stop.track === 'conduite') {
    if (stop.type === 'course' && stop.chapterId && stop.courseId) {
      return `/conduite/lecons/${stop.chapterId}/cours/${stop.courseId}`
    }
    if (stop.chapterId) return `/conduite/lecons/${stop.chapterId}`
    return '/conduite/lecons'
  }
  return null
}
