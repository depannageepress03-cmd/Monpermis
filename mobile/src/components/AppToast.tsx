import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { dark, fonts } from '../theme'

type ToastTone = 'info' | 'success' | 'error'

type ToastState = {
  message: string
  tone: ToastTone
} | null

let showToastImpl: ((message: string, tone?: ToastTone) => void) | null = null

export function showAppToast(message: string, tone: ToastTone = 'info') {
  showToastImpl?.(message, tone)
}

/** Host global à monter une fois (RootNavigator). */
export function AppToastHost({ style }: { style?: StyleProp<ViewStyle> }) {
  const [toast, setToast] = useState<ToastState>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-12)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    showToastImpl = (message, tone = 'info') => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setToast({ message, tone })
      opacity.setValue(0)
      translateY.setValue(-12)
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start()
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setToast(null)
        })
      }, 3200)
    }
    return () => {
      showToastImpl = null
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [opacity, translateY])

  if (!toast) return null

  const toneStyle =
    toast.tone === 'success'
      ? styles.success
      : toast.tone === 'error'
        ? styles.error
        : styles.info

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, style, { opacity, transform: [{ translateY }] }]}
    >
      <Pressable onPress={() => setToast(null)} style={[styles.card, toneStyle]}>
        <Text style={styles.text}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  card: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  info: {
    backgroundColor: dark.surface,
    borderColor: dark.border,
  },
  success: {
    backgroundColor: dark.greenSoft,
    borderColor: 'rgba(0,176,80,0.35)',
  },
  error: {
    backgroundColor: dark.coralSoft,
    borderColor: 'rgba(232,93,59,0.35)',
  },
  text: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textPrimary,
    textAlign: 'center',
  },
})
