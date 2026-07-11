export function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "L'email est requis"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide'
  return undefined
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Le mot de passe est requis'
  if (password.length < 8) return 'Minimum 8 caractères'
  return undefined
}

/** Format attendu : 0147880143 */
export const PHONE_PLACEHOLDER = '0147880143'
const PHONE_PATTERN = /^\d{10}$/

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  // Si l'utilisateur colle +229..., on garde les 10 derniers chiffres
  let local = digits
  if (digits.startsWith('229') && digits.length >= 13) {
    local = digits.slice(3)
  }

  return local.slice(0, 10)
}

export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return 'Le téléphone est requis'
  const normalized = normalizePhone(phone)
  if (!PHONE_PATTERN.test(normalized)) {
    return `Format invalide. Exemple : ${PHONE_PLACEHOLDER}`
  }
  return undefined
}

export function validateName(name: string, field: string): string | undefined {
  if (!name.trim()) return `${field} est requis`
  if (name.trim().length < 2) return `${field} trop court`
  return undefined
}
