/** Lien WhatsApp support Monpermis (même fallback que le serveur). */
function normalizeSupportNumber(raw: string | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return '2290192878702'
  if (digits.startsWith('229')) return digits
  if (digits.length === 10) return `229${digits}`
  return digits
}

const fromEnv =
  typeof import.meta !== 'undefined'
    ? String((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPPORT_WHATSAPP || '')
    : ''

export const SUPPORT_WHATSAPP_NUMBER = normalizeSupportNumber(fromEnv || '0192878702')

export function supportWhatsAppUrl(
  text = 'Bonjour Monpermis, j’ai besoin d’aide.',
) {
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
}
