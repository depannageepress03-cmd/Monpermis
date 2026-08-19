import { LearnerChapterQuestionsListPage } from '../learner/LearnerChapterQuestionsListPage'
import { LearnerChapterQuizPage } from '../learner/LearnerChapterQuizPage'
import { RevisionChapterTestSubjectsPage } from './RevisionChapterTestSubjectsPage'

export function RevisionChapterQuestionsPage() {
  return <LearnerChapterQuestionsListPage />
}

export function RevisionChapterQuestionPage() {
  return (
    <LearnerChapterQuizPage
      mode="practice"
      backTo={(chapterId) => `/code-de-la-route/revision-chapitres/${chapterId}/questions`}
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
