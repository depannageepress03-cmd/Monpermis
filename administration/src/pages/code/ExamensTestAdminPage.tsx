import {
  fetchAdminPracticeExams,
  generateAdminPracticeExams,
  fetchAdminPracticeExamById,
  updateAdminPracticeExam,
} from '../../api/practiceExams'
import { BaseExamAdminPage } from './BaseExamAdminPage'

export function ExamensTestAdminPage() {
  return (
    <BaseExamAdminPage
      title="Examens test"
      kicker="80 sujets · questions tirées au hasard à chaque essai"
      itemLabel="Sujet"
      itemsLabel="sujets"
      backTo="/code"
      backLabel="Code de la route"
      fetchOverview={fetchAdminPracticeExams}
      generateExams={generateAdminPracticeExams}
      fetchExamById={fetchAdminPracticeExamById}
      updateExam={updateAdminPracticeExam}
    />
  )
}