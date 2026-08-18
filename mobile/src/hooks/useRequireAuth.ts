import { useEffect } from 'react'
import type { NavigationProp } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useOffline } from '../context/OfflineContext'
import type { RootStackParamList } from '../navigation/types'

export function useRequireAuth(navigation: NavigationProp<RootStackParamList>) {
  const { user, loading } = useAuth()
  const { isOffline } = useOffline()

  useEffect(() => {
    if (!loading && !user && !isOffline) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { message: 'Session expirée. Reconnecte-toi.' } }],
      })
    }
  }, [loading, user, isOffline, navigation])

  return { user, loading }
}
