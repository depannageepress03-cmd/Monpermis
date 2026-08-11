import { Navigate, Route, Routes } from 'react-router-dom'
import { MoniteurLayout } from './components/MoniteurLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { DisponibilitesPage } from './pages/DisponibilitesPage'
import { HistoriquePage } from './pages/HistoriquePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilPage } from './pages/ProfilPage'
import { ReservationsPage } from './pages/ReservationsPage'
import { RevenusPage } from './pages/RevenusPage'

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MoniteurLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="disponibilites" element={<DisponibilitesPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="a-confirmer" element={<Navigate to="/reservations" replace />} />
          <Route path="historique" element={<HistoriquePage />} />
          <Route path="revenus" element={<RevenusPage />} />
          <Route path="profil" element={<ProfilPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
