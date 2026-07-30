import { Alert, Linking } from 'react-native'

const ALLOWED_SCHEMES = new Set(['https:', 'http:', 'mailto:', 'tel:', 'whatsapp:'])

function isAllowedHost(hostname: string, scheme: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (scheme === 'mailto:' || scheme === 'tel:' || scheme === 'whatsapp:') return true
  if (!host) return false
  // WhatsApp web / deep links
  if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'whatsapp.com') return true
  if (host.endsWith('.whatsapp.com')) return true
  // Calendar / Google Calendar only (reservation confirm)
  if (host === 'calendar.google.com' || host === 'www.google.com') return true
  // Product / media
  if (host === 'monpermis.bj' || host.endsWith('.monpermis.bj')) return true
  if (host === 'monpermis-api.onrender.com') return true
  if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be') return true
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') return true
  // Generic https only for absolute CTAs from CMS (no custom schemes)
  if (scheme === 'https:') return true
  return false
}

/** Ouvre une URL uniquement si le schéma / hôte est dans l’allowlist. */
export async function safeOpenUrl(raw?: string | null): Promise<boolean> {
  const value = raw?.trim()
  if (!value) return false

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    Alert.alert('Lien invalide', 'Impossible d’ouvrir ce lien.')
    return false
  }

  const scheme = parsed.protocol.toLowerCase()
  if (!ALLOWED_SCHEMES.has(scheme)) {
    Alert.alert('Lien non autorisé', 'Ce type de lien n’est pas pris en charge.')
    return false
  }

  // Bloque http hors localhost (cleartext)
  if (scheme === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    Alert.alert('Lien non sécurisé', 'Seuls les liens HTTPS sont autorisés.')
    return false
  }

  if (!isAllowedHost(parsed.hostname, scheme)) {
    Alert.alert('Lien non autorisé', 'Ce lien n’est pas autorisé dans l’application.')
    return false
  }

  try {
    // canOpenURL est peu fiable sur iOS (schémas non déclarés) et Android 11+.
    // Pour https/http on tente directement ; pour les schémas custom on vérifie d’abord.
    const href = parsed.toString()
    if (scheme === 'https:' || scheme === 'http:') {
      await Linking.openURL(href)
      return true
    }
    const can = await Linking.canOpenURL(href)
    if (!can) {
      Alert.alert('Impossible d’ouvrir', 'Aucune application ne peut ouvrir ce lien.')
      return false
    }
    await Linking.openURL(href)
    return true
  } catch {
    Alert.alert('Erreur', 'Ouverture du lien impossible.')
    return false
  }
}
