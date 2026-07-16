import { Navigate, Route, Routes } from 'react-router-dom'
import { CodeRoutePage } from './pages/CodeRoutePage'
import { ConduitePage } from './pages/ConduitePage'
import { ConduiteChapterCoursesPage } from './pages/conduite/ConduiteChapterCoursesPage'
import { ConduiteCourseDetailPage } from './pages/conduite/ConduiteCourseDetailPage'
import { ConduiteLeconsPage } from './pages/conduite/ConduiteLeconsPage'
import { ReservationPage } from './pages/conduite/ReservationPage'
import { ECodePermisPage, ECodePermisTakePage } from './pages/code-route/ECodePermisPage'
import { ExamensTestPage, ExamensTestTakePage } from './pages/code-route/ExamensTestPage'
import { MesNotesPage } from './pages/code-route/MesNotesPage'
import { RevisionChapterCoursesPage } from './pages/code-route/RevisionChapterCoursesPage'
import { RevisionChapitresPage } from './pages/code-route/RevisionChapitresPage'
import {
  RevisionChapterQuestionsPage,
  RevisionChapterTestSubjectPage,
} from './pages/code-route/RevisionChapterQuizPages'
import { RevisionCourseDetailPage } from './pages/code-route/RevisionCourseDetailPage'
import { AbonnementPage } from './pages/AbonnementPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TermsOfUsePage } from './pages/TermsOfUsePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />
      <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="/conditions-utilisation" element={<TermsOfUsePage />} />
      <Route path="/accueil" element={<HomePage />} />
      <Route path="/abonnement" element={<AbonnementPage />} />
      <Route path="/code-de-la-route" element={<CodeRoutePage />} />
      <Route path="/code-de-la-route/revision-chapitres" element={<RevisionChapitresPage />} />
      <Route
        path="/code-de-la-route/revision-chapitres/:chapterId"
        element={<RevisionChapterCoursesPage />}
      />
      <Route
        path="/code-de-la-route/revision-chapitres/:chapterId/questions"
        element={<RevisionChapterQuestionsPage />}
      />
      <Route
        path="/code-de-la-route/revision-chapitres/:chapterId/sujet-test"
        element={<RevisionChapterTestSubjectPage />}
      />
      <Route
        path="/code-de-la-route/revision-chapitres/:chapterId/cours/:courseId"
        element={<RevisionCourseDetailPage />}
      />
      <Route path="/code-de-la-route/examens-test" element={<ExamensTestPage />} />
      <Route path="/code-de-la-route/examens-test/:examNumber" element={<ExamensTestTakePage />} />
      <Route path="/code-de-la-route/mes-notes" element={<MesNotesPage />} />
      <Route path="/code-de-la-route/e-codepermis" element={<ECodePermisPage />} />
      <Route path="/code-de-la-route/e-codepermis/:examNumber" element={<ECodePermisTakePage />} />
      <Route path="/conduite" element={<ConduitePage />} />
      <Route path="/conduite/reservation" element={<ReservationPage />} />
      <Route path="/conduite/lecons" element={<ConduiteLeconsPage />} />
      <Route path="/conduite/lecons/:chapterId" element={<ConduiteChapterCoursesPage />} />
      <Route
        path="/conduite/lecons/:chapterId/cours/:courseId"
        element={<ConduiteCourseDetailPage />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
