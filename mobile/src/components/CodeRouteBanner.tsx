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
import { brand, fonts } from '../theme'

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

  return (
    <View
      style={styles.banner}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.stack}>
        {BANNER_IMAGES.map((src, i) => (
          <Animated.Image
            key={i}
            source={src}
            style={[styles.slide, { opacity: opacities[i] }]}
            resizeMode="cover"
          />
        ))}
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,16,48,0.45)', 'rgba(0,16,48,0.88)']}
        locations={[0, 0.45, 1]}
        style={styles.fade}
        pointerEvents="none"
      />
      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.title}>Code de la route</Text>
        <Text style={styles.text}>
          Révision, examens test et examen blanc — avancez à votre rythme.
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
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: brand.gold,
    backgroundColor: brand.navy,
    marginBottom: 18,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    zIndex: 1,
  },
  caption: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 28,
    zIndex: 2,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#fff',
    letterSpacing: -0.3,
  },
  text: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
})
