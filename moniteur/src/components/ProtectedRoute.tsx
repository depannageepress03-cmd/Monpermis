import { Navigate, Outlet } from 'react-router-dom'
import { useMoniteurAuth } from '../context/MoniteurAuthContext'

export function ProtectedRoute() {
  const { moniteur, loading } = useMoniteurAuth()

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-dot" />
        <p>Chargement…</p>
      </div>
    )
  }

  if (!moniteur) return <Navigate to="/connexion" replace />

  return <Outlet />
}
