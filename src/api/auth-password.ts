import { getApiBase } from './config'

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

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

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Vérification impossible')
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = getToken()
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

export async function updateProfile(data: {
  firstName?: string
  lastName?: string
  phone?: string
}): Promise<{ id: string; firstName: string; lastName: string; email: string; phone: string; authProvider?: string; isEmailVerified?: boolean; createdAt: string }> {
  const token = getToken()
  const res = await fetch(`${getApiBase()}/auth/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Mise à jour impossible')
  }
  return body.data.user
}

export async function deleteAccount(data: { password?: string; confirm: boolean }): Promise<void> {
  const token = getToken()
  const res = await fetch(`${getApiBase()}/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Suppression impossible')
  }
}
