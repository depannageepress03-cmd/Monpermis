import type { ComponentType } from 'react'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { ScreenLoader } from './ScreenLoader'

/**
 * HOC : bloque l’écran tant que la session n’est pas valide.
 * Redirige vers Login via useRequireAuth.
 */
export function withRequireAuth<P extends object>(Screen: ComponentType<P>) {
  function Guarded(props: P) {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>()
    const { user, loading } = useRequireAuth(navigation)
    if (loading || !user) return <ScreenLoader />
    return <Screen {...props} />
  }
  Guarded.displayName = `withRequireAuth(${Screen.displayName || Screen.name || 'Screen'})`
  return Guarded
}
