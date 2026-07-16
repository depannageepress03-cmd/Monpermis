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
      kicker="Auto-évaluation"
      itemLabel="Examen"
      itemsLabel="examens"
      backTo="/code"
      backLabel="Code de la route"
      fetchOverview={fetchAdminPracticeExams}
      generateExams={generateAdminPracticeExams}
      fetchExamById={fetchAdminPracticeExamById}
      updateExam={updateAdminPracticeExam}
    />
  )
}