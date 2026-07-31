import { useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'

/**
 * Confirms before leaving an in-progress exam/quiz (hardware/gesture back + navbar).
 */
export function useLeaveGuard(
  when: boolean,
  message = 'Quitter ? Votre progression en cours sera conservée si vous reprenez le même examen.',
  onQuit?: () => void,
) {
  const navigation = useNavigation()

  useEffect(() => {
    if (!when) return
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      event.preventDefault()
      Alert.alert('Quitter l’épreuve ?', message, [
        { text: 'Rester', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => {
            onQuit?.()
            navigation.dispatch(event.data.action)
          },
        },
      ])
    })
    return unsubscribe
  }, [navigation, when, message, onQuit])

  const confirmLeave = useCallback(() => {
    if (!when) return Promise.resolve(true)
    return new Promise<boolean>((resolve) => {
      Alert.alert('Quitter l’épreuve ?', message, [
        { text: 'Rester', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => {
            onQuit?.()
            resolve(true)
          },
        },
      ])
    })
  }, [when, message, onQuit])

  return { confirmLeave }
}
