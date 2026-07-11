import { Alert } from 'react-native'
import { getAuthErrorDetails } from '../api/auth'

export function showAuthError(error: unknown, fallback = 'Une erreur est survenue') {
  const { message } = getAuthErrorDetails(error)
  Alert.alert('Erreur', message || fallback)
}
