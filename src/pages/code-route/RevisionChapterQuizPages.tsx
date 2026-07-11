import { LearnerChapterQuizPage } from '../learner/LearnerChapterQuizPage'

export function RevisionChapterQuestionsPage() {
  return (
    <LearnerChapterQuizPage
      mode="practice"
      backTo={() => '/code-de-la-route/revision-chapitres'}
    />
  )
}

export function RevisionChapterTestSubjectPage() {
  return (
    <LearnerChapterQuizPage
      mode="test"
      backTo={() => '/code-de-la-route/revision-chapitres'}
    />
  )
}
