import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native'
import { brand, dark, fonts, radii, shadows } from '../theme'

const BANNER_IMAGES: ImageSourcePropType[] = [
  require('../../assets/code-route/banner-1.jpg'),
  require('../../assets/code-route/banner-2.jpg'),
  require('../../assets/code-route/banner-3.jpg'),
  require('../../assets/code-route/banner-4.jpg'),
  require('../../assets/code-route/banner-5.jpg'),
  require('../../assets/code-route/banner-6.jpg'),
]

const HOLD_MS = 6000
const CROSSFADE_MS = 2800

/** Diaporama voitures : fondu croisé très fluide (images empilées). */
export function CodeRouteBanner() {
  const [index, setIndex] = useState(0)
  const opacities = useRef(BANNER_IMAGES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current
  const parallax = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(parallax, {
          toValue: 1,
          duration: HOLD_MS + CROSSFADE_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(parallax, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [parallax])

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = (index + 1) % BANNER_IMAGES.length
      Animated.parallel([
        Animated.timing(opacities[index], {
          toValue: 0,
          duration: CROSSFADE_MS,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(opacities[next], {
          toValue: 1,
          duration: CROSSFADE_MS,
          easing: Easing.bezier(0.33, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setIndex(next)
      })
    }, HOLD_MS)

    return () => clearTimeout(timer)
  }, [index, opacities])

  const scale = parallax.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  })

  return (
    <View style={styles.banner} accessibilityRole="image">
      <View style={styles.stack}>
        {BANNER_IMAGES.map((src, i) => (
          <Animated.Image
            key={i}
            source={src}
            style={[styles.slide, { opacity: opacities[i], transform: [{ scale }] }]}
            resizeMode="cover"
          />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(0,16,48,0.08)', 'rgba(0,16,48,0.42)', 'rgba(0,16,48,0.88)']}
        locations={[0, 0.4, 1]}
        style={styles.fade}
        pointerEvents="none"
      />
      <View style={styles.badge} pointerEvents="none">
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Ton parcours</Text>
      </View>
      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.title}>Code de la route</Text>
        <Text style={styles.text}>
          Révision, sujets test et examen blanc — avance à ton rythme.
        </Text>
      </View>
      <View style={styles.dots} pointerEvents="none">
        {BANNER_IMAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: brand.gold,
    backgroundColor: brand.navy,
    marginBottom: 18,
    ...shadows.md,
  },
  stack: {
    ...StyleSheet.absoluteFillObject,
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
  caption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 30,
    zIndex: 2,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 26,
    color: '#fff',
    letterSpacing: -0.4,
  },
  text: {
    marginTop: 6,
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
    maxWidth: 300,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
})
