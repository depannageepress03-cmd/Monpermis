import { LearnerChapterQuizPage } from '../learner/LearnerChapterQuizPage'
import { RevisionChapterTestSubjectsPage } from './RevisionChapterTestSubjectsPage'

export function RevisionChapterQuestionsPage() {
  return (
    <LearnerChapterQuizPage
      mode="practice"
      backTo={() => '/code-de-la-route/revision-chapitres'}
    />
  )
}

export function RevisionChapterTestSubjectListPage() {
  return <RevisionChapterTestSubjectsPage />
}

export function RevisionChapterTestSubjectPage() {
  return (
    <LearnerChapterQuizPage
      mode="test"
      backTo={(chapterId) => `/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`}
    />
  )
}
