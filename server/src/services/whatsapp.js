/**
 * Service WhatsApp — prêt pour Meta Cloud API / Twilio.
 * Sans credentials : journalise le message (dev) et retourne un lien wa.me.
 */

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('229')) return digits
  if (digits.startsWith('0')) return `229${digits.slice(1)}`
  return digits
}

export function buildWhatsAppLink(phone, text) {
  const to = normalizePhone(phone)
  const q = encodeURIComponent(text)
  return to ? `https://wa.me/${to}?text=${q}` : `https://wa.me/?text=${q}`
}

export async function sendWhatsAppMessage({ to, body }) {
  const phone = normalizePhone(to)
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId || !phone) {
    console.info('[whatsapp:dev]', { to: phone || to, body })
    return {
      sent: false,
      mode: 'dev',
      link: buildWhatsAppLink(phone || to, body),
    }
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body },
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      console.error('[whatsapp] erreur API:', err)
      return { sent: false, mode: 'api_error', link: buildWhatsAppLink(phone, body) }
    }
    return { sent: true, mode: 'api', link: buildWhatsAppLink(phone, body) }
  } catch (error) {
    console.error('[whatsapp] échec:', error.message)
    return { sent: false, mode: 'network_error', link: buildWhatsAppLink(phone, body) }
  }
}

export function formatReservationReminder({ firstName, date, startTime, moniteurName }) {
  return (
    `Bonjour ${firstName},\n\n` +
    `Rappel Monpermis.bj : votre séance de conduite est prévue le ${date} à ${startTime}` +
    (moniteurName ? ` avec ${moniteurName}` : '') +
    `.\nÀ bientôt !`
  )
}
