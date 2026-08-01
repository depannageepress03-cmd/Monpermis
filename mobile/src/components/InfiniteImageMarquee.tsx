import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { dark, fonts, radii } from '../theme'

/** Même sources que le site web : /home/i1…i5.jpg */
const IMAGES = [
  require('../../assets/home/i1.jpg'),
  require('../../assets/home/i2.jpg'),
  require('../../assets/home/i3.jpg'),
  require('../../assets/home/i4.jpg'),
  require('../../assets/home/i5.jpg'),
]

const STRIP_HEIGHT = 168
const STRIP_HEIGHT_COMPACT = 96
const HOLD_MS = 5500
const CROSSFADE_MS = 2400

export function InfiniteImageMarquee({
  compact = false,
  caption,
}: {
  compact?: boolean
  caption?: string
}) {
  const [index, setIndex] = useState(0)
  const [width, setWidth] = useState(0)
  const opacities = useRef(IMAGES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current
  const height = compact ? STRIP_HEIGHT_COMPACT : STRIP_HEIGHT

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }

  useEffect(() => {
    if (width <= 0) return

    const timer = setTimeout(() => {
      const next = (index + 1) % IMAGES.length
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
  }, [index, opacities, width])

  return (
    <View
      style={[styles.wrap, { height }, compact && styles.wrapCompact]}
      onLayout={onLayout}
      accessibilityElementsHidden={!caption}
      importantForAccessibility={caption ? 'yes' : 'no-hide-descendants'}
    >
      {IMAGES.map((src, i) => (
        <Animated.View key={i} style={[styles.slide, { opacity: opacities[i] }]}>
          <Image source={src} style={styles.image} resizeMode="cover" />
        </Animated.View>
      ))}

      {!compact ? (
        <LinearGradient
          colors={['rgba(0,16,48,0.05)', 'rgba(0,16,48,0.55)', 'rgba(0,16,48,0.78)']}
          locations={[0, 0.45, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />
      ) : null}

      {!compact && caption ? (
        <View style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.caption}>{caption}</Text>
          <View style={styles.captionBar}>
            <View style={styles.captionBarGreen} />
            <View style={styles.captionBarWhite} />
          </View>
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.dots} pointerEvents="none">
          {IMAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: dark.surfaceRaised,
  },
  wrapCompact: {
    borderRadius: radii.md,
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  captionWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
  },
  caption: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    maxWidth: 260,
  },
  captionBar: {
    flexDirection: 'row',
    marginTop: 10,
    height: 3,
    width: 56,
    borderRadius: 999,
    overflow: 'hidden',
  },
  captionBarGreen: {
    flex: 1,
    backgroundColor: dark.green,
  },
  captionBarWhite: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: dark.green,
    width: 14,
  },
})
