import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CodeRouteHubPage } from './pages/code/CodeRouteHubPage'
import { ChapterQuestionsPage } from './pages/code/ChapterQuestionsPage'
import { ExamensTestAdminPage } from './pages/code/ExamensTestAdminPage'
import { ECodePermisAdminPage } from './pages/code/ECodePermisAdminPage'
import { RevisionChapitresPage } from './pages/code/RevisionChapitresPage'
import { ConduiteHubPage } from './pages/conduite/ConduiteHubPage'
import { LeconsConduitePage } from './pages/conduite/LeconsConduitePage'
import { ReservationsPage } from './pages/conduite/ReservationsPage'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { CreateAdminPage } from './pages/CreateAdminPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { UsersPage } from './pages/UsersPage'
import { LearnerProgressDetailPage, LearnerProgressListPage } from './pages/code/LearnerProgressPage'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<Navigate to="/connexion" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/utilisateurs" element={<UsersPage />} />
          <Route path="/abonnements" element={<SubscriptionsPage />} />
          <Route path="/annonces" element={<AnnouncementsPage />} />
          <Route path="/creer-admin" element={<CreateAdminPage />} />
          <Route path="/parcours" element={<Navigate to="/code/revision-chapitres" replace />} />
          <Route path="/code" element={<CodeRouteHubPage />} />
          <Route path="/code/revision-chapitres" element={<RevisionChapitresPage />} />
          <Route
            path="/code/revision-chapitres/:chapterId/questions"
            element={<ChapterQuestionsPage />}
          />
          <Route path="/code/examens-test" element={<ExamensTestAdminPage />} />
          <Route
            path="/code/suivi-apprenants"
            element={<LearnerProgressListPage />}
          />
          <Route path="/code/suivi-apprenants/:userId" element={<LearnerProgressDetailPage />} />
          <Route path="/code/mes-notes" element={<Navigate to="/code/suivi-apprenants" replace />} />
          <Route path="/code/e-codepermis" element={<ECodePermisAdminPage />} />
          <Route path="/conduite" element={<ConduiteHubPage />} />
          <Route path="/conduite/lecons" element={<LeconsConduitePage />} />
          <Route path="/conduite/reservations" element={<ReservationsPage />} />
          <Route path="/conduite/moniteurs" element={<Navigate to="/conduite/reservations" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
