import { Navigate } from 'react-router-dom'

/** Legacy auth routes → connexion with a flash message. */
export function RedirectToLogin({ message }: { message: string }) {
  return <Navigate to="/connexion" replace state={{ message }} />
}
