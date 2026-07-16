import { getApiBase } from './config'

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Erreur lors de la demande')
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Erreur lors de la réinitialisation')
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const res = await fetch(`${getApiBase()}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Erreur lors du changement de mot de passe')
  }
}
