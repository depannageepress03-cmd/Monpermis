import {
  fetchAdminECodePermisExams,
  generateAdminECodePermisExams,
  fetchAdminECodePermisExamById,
  updateAdminECodePermisExam,
} from '../../api/ecodepermisExams'
import { BaseExamAdminPage } from './BaseExamAdminPage'

export function ECodePermisAdminPage() {
  return (
    <BaseExamAdminPage
      title="E-Codepermis"
      kicker="Conditions réelles"
      itemLabel="Épreuve"
      itemsLabel="épreuves"
      backTo="/code"
      backLabel="Code de la route"
      fetchOverview={fetchAdminECodePermisExams}
      generateExams={generateAdminECodePermisExams}
      fetchExamById={fetchAdminECodePermisExamById}
      updateExam={updateAdminECodePermisExam}
    />
  )
}