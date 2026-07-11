import crypto from 'crypto'

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function getVerificationExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}
