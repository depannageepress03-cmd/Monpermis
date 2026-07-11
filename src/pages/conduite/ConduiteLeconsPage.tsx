import { LearnerChapterListPage } from '../learner/LearnerChapterListPage'

export function ConduiteLeconsPage() {
  return (
    <LearnerChapterListPage
      track="conduite"
      kicker="Conduite"
      title="Leçons de conduite"
      navTitle="Leçons de conduite"
      backTo="/conduite"
      backLabel="Retour"
      coursesPath={(chapterId) => `/conduite/lecons/${chapterId}`}
    />
  )
}
