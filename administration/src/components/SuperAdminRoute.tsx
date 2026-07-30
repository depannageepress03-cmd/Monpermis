import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

/** Routes réservées à la gestion avancée (superadmin, ou migration sans superadmin). */
export function SuperAdminRoute() {
  const { admin, loading, canManageAdmins } = useAdminAuth()

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-dot" />
        <p>Chargement…</p>
      </div>
    )
  }

  if (!admin) return <Navigate to="/connexion" replace />
  if (!canManageAdmins) return <Navigate to="/" replace />

  return <Outlet />
}
