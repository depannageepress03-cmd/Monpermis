import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { IntroLogoMark } from '../components/IntroLogoMark'
import { MONPERMIS_INTRO_HTML } from '../assets/monpermisIntroHtml'
import { getStoredUser } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { hasCompletedOnboarding } from '../utils/onboarding'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Intro'>

const INTRO_BG = '#FAF9F6'
const MAX_INTRO_MS = 5500

export function IntroScreen() {
  const navigation = useNavigation<Nav>()
  const { user } = useAuth()
  const navigatedRef = useRef(false)
  const revealDoneRef = useRef(false)
  const userRef = useRef(user)
  const [useNativeFallback, setUseNativeFallback] = useState(false)
  const [webReady, setWebReady] = useState(false)

  userRef.current = user

  useEffect(() => {
    setStatusBarStyle('dark')
  }, [])

  const goNext = useCallback(async () => {
    if (navigatedRef.current) return
    if (!revealDoneRef.current) return
    navigatedRef.current = true

    // Ne jamais bloquer sur le probe réseau : session locale suffit pour sortir de l’intro.
    const sessionUser = userRef.current || (await getStoredUser())
    if (sessionUser) {
      navigation.replace('Home')
      return
    }

    const seen = await hasCompletedOnboarding()
    navigation.replace(seen ? 'Login' : 'Onboarding')
  }, [navigation])

  const markRevealDone = useCallback(() => {
    if (revealDoneRef.current) return
    revealDoneRef.current = true
    void goNext()
  }, [goNext])

  useEffect(() => {
    const safety = setTimeout(() => {
      revealDoneRef.current = true
      void goNext()
    }, MAX_INTRO_MS)
    return () => clearTimeout(safety)
  }, [goNext])

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (event.nativeEvent.data === 'intro-done') {
        markRevealDone()
      }
    },
    [markRevealDone],
  )

  return (
    <View style={styles.root}>
      {/* Placeholder pendant le chargement WebView : pas d’écran vide. */}
      {!useNativeFallback && !webReady ? (
        <View style={styles.placeholder} pointerEvents="none">
          <Image
            source={require('../../assets/logo-mark.png')}
            style={styles.placeholderLogo}
            resizeMode="contain"
          />
        </View>
      ) : null}
      {useNativeFallback ? (
        <IntroLogoMark onRevealComplete={markRevealDone} />
      ) : (
        <WebView
          originWhitelist={['about:blank', 'file://*']}
          source={{
            html: MONPERMIS_INTRO_HTML,
            baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : undefined,
          }}
          style={[styles.webview, !webReady && styles.webviewHidden]}
          containerStyle={styles.webview}
          scrollEnabled={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled={false}
          setSupportMultipleWindows={false}
          mediaPlaybackRequiresUserAction
          onMessage={onWebMessage}
          onLoadEnd={() => setWebReady(true)}
          onError={() => setUseNativeFallback(true)}
          onHttpError={() => setUseNativeFallback(true)}
          androidLayerType="hardware"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: INTRO_BG,
  },
  webview: {
    flex: 1,
    backgroundColor: INTRO_BG,
  },
  webviewHidden: {
    opacity: 0,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INTRO_BG,
  },
  placeholderLogo: {
    width: 120,
    height: 120,
  },
})
