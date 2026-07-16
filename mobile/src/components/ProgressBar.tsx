import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { brand, radii } from '../theme'

/** Barre de progression animée — feedback visuel façon jeu. */
export function ProgressBar({
  progress,
  color = brand.green,
  trackColor = `${brand.navy}0F`,
  height = 8,
}: {
  progress: number
  color?: string
  trackColor?: string
  height?: number
}) {
  const width = useRef(new Animated.Value(0)).current
  const clamped = Math.max(0, Math.min(1, progress))

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 650,
      useNativeDriver: false,
    }).start()
  }, [clamped, width])

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            height,
            borderRadius: height,
            width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radii.pill,
  },
  fill: {
    borderRadius: radii.pill,
  },
})
