import { LearnerCourseDetailPage } from '../learner/LearnerCourseDetailPage'

export function RevisionCourseDetailPage() {
  return (
    <LearnerCourseDetailPage
      track="revision"
      coursesBackTo={(chapterId) => `/code-de-la-route/revision-chapitres/${chapterId}`}
    />
  )
}
