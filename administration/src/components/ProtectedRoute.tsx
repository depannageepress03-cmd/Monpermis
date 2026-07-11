import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export function ProtectedRoute() {
  const { admin, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-dot" />
        <p>Chargement…</p>
      </div>
    )
  }

  if (!admin) return <Navigate to="/connexion" replace />

  return <Outlet />
}
