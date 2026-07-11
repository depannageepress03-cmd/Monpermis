import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native'

const IMAGES = [
  require('../../assets/i1.jpg'),
  require('../../assets/i2.jpg'),
  require('../../assets/i3.jpg'),
  require('../../assets/i4.jpg'),
  require('../../assets/i5.jpg'),
]

const STRIP_HEIGHT = 160
const STRIP_HEIGHT_COMPACT = 112
const HOLD_MS = 2800
const SLIDE_MS = 500

export function InfiniteImageMarquee({ compact = false }: { compact?: boolean }) {
  const [width, setWidth] = useState(0)
  const offset = useRef(new Animated.Value(0)).current
  const indexRef = useRef(0)
  const height = compact ? STRIP_HEIGHT_COMPACT : STRIP_HEIGHT

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }

  useEffect(() => {
    if (width <= 0) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const advance = () => {
      if (cancelled) return
      const next = indexRef.current + 1

      Animated.timing(offset, {
        toValue: -next * width,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return

        if (next >= IMAGES.length) {
          indexRef.current = 0
          offset.setValue(0)
        } else {
          indexRef.current = next
        }

        timer = setTimeout(advance, HOLD_MS)
      })
    }

    timer = setTimeout(advance, HOLD_MS)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      offset.stopAnimation()
    }
  }, [offset, width])

  const track = [...IMAGES, IMAGES[0]]

  return (
    <View
      style={[styles.wrap, { height }, compact && styles.wrapCompact]}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.track,
            {
              height,
              width: width * track.length,
              transform: [{ translateX: offset }],
            },
          ]}
        >
          {track.map((src, index) => (
            <Image
              key={`${index}`}
              source={src}
              style={[styles.image, { width, height }]}
              resizeMode="cover"
            />
          ))}
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: STRIP_HEIGHT,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
  },
  wrapCompact: {
    marginBottom: 10,
  },
  track: {
    flexDirection: 'row',
    height: STRIP_HEIGHT,
  },
  image: {
    height: STRIP_HEIGHT,
  },
})
