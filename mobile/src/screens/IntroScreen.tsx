import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { MONPERMIS_INTRO_HTML } from '../assets/monpermisIntroHtml'
import { IntroLogoMark } from '../components/IntroLogoMark'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Intro'>

/** Fond crème — même teinte que l’animation HTML d’origine. */
const INTRO_BG = '#FAF9F6'

/** Si le WebView ne répond pas, on continue quand même. */
const HARD_TIMEOUT_MS = 5200
const FALLBACK_HOLD_MS = 2200

export function IntroScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useAuth()
  const navigatedRef = useRef(false)
  const animationDoneRef = useRef(false)
  const [useNativeFallback, setUseNativeFallback] = useState(false)

  const goNext = useCallback(() => {
    if (navigatedRef.current || loading) return
    navigatedRef.current = true
    navigation.replace(user ? 'Home' : 'Login')
  }, [loading, navigation, user])

  const markDone = useCallback(() => {
    animationDoneRef.current = true
    goNext()
  }, [goNext])

  useEffect(() => {
    if (animationDoneRef.current && !loading) goNext()
  }, [loading, goNext])

  // Filet absolu : l’app ne reste jamais bloquée sur l’intro.
  useEffect(() => {
    const timer = setTimeout(markDone, HARD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [markDone])

  // Fallback native : courte révélation puis navigation.
  useEffect(() => {
    if (!useNativeFallback) return
    const timer = setTimeout(markDone, FALLBACK_HOLD_MS)
    return () => clearTimeout(timer)
  }, [useNativeFallback, markDone])

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (event.nativeEvent.data !== 'intro-done') return
      markDone()
    },
    [markDone],
  )

  if (useNativeFallback) {
    return (
      <View style={styles.root}>
        <IntroLogoMark />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <WebView
        originWhitelist={['*']}
        source={{ html: MONPERMIS_INTRO_HTML }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={onMessage}
        onError={() => setUseNativeFallback(true)}
        onHttpError={() => setUseNativeFallback(true)}
        onRenderProcessGone={() => setUseNativeFallback(true)}
        onContentProcessDidTerminate={() => setUseNativeFallback(true)}
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        allowsInlineMediaPlayback
      />
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
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: INTRO_BG,
  },
})
