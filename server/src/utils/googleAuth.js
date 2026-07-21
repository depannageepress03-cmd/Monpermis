import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client()

/** Client IDs Google autorisés pour vérifier les id_token (web + mobile). */
export function getGoogleAudiences() {
  const raw = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
  ]

  return [...new Set(raw.map((value) => String(value || '').trim()).filter(Boolean))]
}

export async function verifyGoogleIdToken(idToken) {
  const audiences = getGoogleAudiences()
  if (audiences.length === 0) {
    const error = new Error('Connexion Google non configurée')
    error.status = 500
    throw error
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences.length === 1 ? audiences[0] : audiences,
  })

  return ticket.getPayload()
}
