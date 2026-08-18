import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useOffline } from '../context/OfflineContext'
import { dark, fonts, radii, shadows } from '../theme'

export function OfflineBanner() {
  const { isOffline, pendingCount } = useOffline()
  const slideAnim = useRef(new Animated.Value(-60)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isOffline) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [isOffline, slideAnim, opacityAnim])

  if (!isOffline && pendingCount === 0) return null

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents={isOffline ? 'auto' : 'none'}
    >
      <View style={styles.iconWrap}>
        <WifiOff size={14} color="#FFFFFF" />
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {isOffline
          ? pendingCount > 0
            ? `Hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente`
            : 'Mode hors ligne'
          : `${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de synchronisation`}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    ...shadows.md,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#FFFFFF',
  },
})
