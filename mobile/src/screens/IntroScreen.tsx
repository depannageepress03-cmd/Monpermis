import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { IntroLogoMark } from '../components/IntroLogoMark'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Intro'>

/** Fond crème — même teinte que l’animation HTML d’origine. */
const INTRO_BG = '#FAF9F6'

/** Intro native uniquement : le WebView provoquait un crash natif au démarrage. */
const INTRO_DURATION_MS = 2800

export function IntroScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useAuth()
  const navigatedRef = useRef(false)
  const readyRef = useRef(false)

  const goNext = useCallback(() => {
    if (navigatedRef.current || loading || !readyRef.current) return
    navigatedRef.current = true
    navigation.replace(user ? 'Home' : 'Login')
  }, [loading, navigation, user])

  useEffect(() => {
    const timer = setTimeout(() => {
      readyRef.current = true
      goNext()
    }, INTRO_DURATION_MS)
    return () => clearTimeout(timer)
  }, [goNext])

  useEffect(() => {
    goNext()
  }, [goNext])

  return (
    <View style={styles.root}>
      <IntroLogoMark />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INTRO_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
