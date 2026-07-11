import { LearnerCourseListPage } from '../learner/LearnerCourseListPage'

export function ConduiteChapterCoursesPage() {
  return (
    <LearnerCourseListPage
      track="conduite"
      chaptersBackTo="/conduite/lecons"
      detailPath={(chapterId, courseId) => `/conduite/lecons/${chapterId}/cours/${courseId}`}
    />
  )
}
