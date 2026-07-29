/** Contact support (réinitialisation mot de passe téléphone-only). */
export const SUPPORT_WHATSAPP_E164 = '2290192878702'

export function buildPasswordHelpWhatsAppUrl(phoneHint?: string): string {
  const digits = (phoneHint || '').replace(/\D/g, '')
  const local = digits.length >= 10 ? digits.slice(-10) : digits
  const text = local
    ? `Bonjour Monpermis, j’ai oublié mon mot de passe. Mon numéro : ${local}`
    : 'Bonjour Monpermis, j’ai oublié mon mot de passe.'
  return `https://wa.me/${SUPPORT_WHATSAPP_E164}?text=${encodeURIComponent(text)}`
}
