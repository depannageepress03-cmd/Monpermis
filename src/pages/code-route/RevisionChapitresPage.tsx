import { LearnerChapterListPage } from '../learner/LearnerChapterListPage'

export function RevisionChapitresPage() {
  return (
    <LearnerChapterListPage
      track="revision"
      kicker="Code de la route"
      title="Révision"
      navTitle="Révision"
      backTo="/code-de-la-route"
      backLabel="Retour"
      questionsPath={(chapterId) =>
        `/code-de-la-route/revision-chapitres/${chapterId}/questions`
      }
      testSubjectPath={(chapterId) =>
        `/code-de-la-route/revision-chapitres/${chapterId}/sujet-test`
      }
    />
  )
}
