import { useEffect } from 'react'
import type { NavigationProp } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'

export function useRequireAuth(navigation: NavigationProp<RootStackParamList>) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
    }
  }, [loading, user, navigation])

  return { user, loading }
}
