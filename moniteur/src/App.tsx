import { Navigate, Route, Routes } from 'react-router-dom'
import { MoniteurLayout } from './components/MoniteurLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AConfirmerPage } from './pages/AConfirmerPage'
import { DashboardPage } from './pages/DashboardPage'
import { DisponibilitesPage } from './pages/DisponibilitesPage'
import { HistoriquePage } from './pages/HistoriquePage'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MoniteurLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="disponibilites" element={<DisponibilitesPage />} />
          <Route path="a-confirmer" element={<AConfirmerPage />} />
          <Route path="historique" element={<HistoriquePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
