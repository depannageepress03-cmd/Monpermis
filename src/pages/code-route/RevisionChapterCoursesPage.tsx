import { LearnerCourseListPage } from '../learner/LearnerCourseListPage'

export function RevisionChapterCoursesPage() {
  return (
    <LearnerCourseListPage
      track="revision"
      chaptersBackTo="/code-de-la-route/revision-chapitres"
      detailPath={(chapterId, courseId) =>
        `/code-de-la-route/revision-chapitres/${chapterId}/cours/${courseId}`
      }
    />
  )
}
