import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { dark } from '../theme'

/** Même sources que le site web : /home/i1…i5.jpg */
const IMAGES = [
  require('../../assets/home/i1.jpg'),
  require('../../assets/home/i2.jpg'),
  require('../../assets/home/i3.jpg'),
  require('../../assets/home/i4.jpg'),
  require('../../assets/home/i5.jpg'),
]

const STRIP_HEIGHT = 160
const STRIP_HEIGHT_COMPACT = 112
const HOLD_MS = 5500
const CROSSFADE_MS = 2400

export function InfiniteImageMarquee({ compact = false }: { compact?: boolean }) {
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
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {IMAGES.map((src, i) => (
        <Animated.View key={i} style={[styles.slide, { opacity: opacities[i] }]}>
          <Image source={src} style={styles.image} resizeMode="cover" />
        </Animated.View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: dark.surfaceRaised,
  },
  wrapCompact: {
    borderRadius: 16,
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
  },
})
