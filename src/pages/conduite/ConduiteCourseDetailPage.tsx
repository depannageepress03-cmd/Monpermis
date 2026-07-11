import { LearnerCourseDetailPage } from '../learner/LearnerCourseDetailPage'

export function ConduiteCourseDetailPage() {
  return (
    <LearnerCourseDetailPage
      track="conduite"
      coursesBackTo={(chapterId) => `/conduite/lecons/${chapterId}`}
    />
  )
}
