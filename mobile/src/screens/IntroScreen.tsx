import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { IntroLogoMark } from '../components/IntroLogoMark'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Intro'>

/** Durée de révélation du logo + mot-symbole, puis fondu. */
const INTRO_DURATION_MS = 3400
const FADE_OUT_MS = 420

export function IntroScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useAuth()
  const navigatedRef = useRef(false)
  const [animationDone, setAnimationDone] = useState(false)
  const opacity = useRef(new Animated.Value(1)).current

  const goNext = useCallback(() => {
    if (navigatedRef.current || loading) return
    navigatedRef.current = true

    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return
      navigation.replace(user ? 'Home' : 'Login')
    })
  }, [loading, navigation, opacity, user])

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), INTRO_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!animationDone || loading) return
    goNext()
  }, [animationDone, loading, goNext])

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.center, { opacity }]}>
        <View style={styles.ambient} />
        <IntroLogoMark />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.introBg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
})
