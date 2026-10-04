import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/**
 * Anneau de progression animé (SVG). `progress` ∈ [0, 1].
 * Le contenu passé en enfant est centré dans l’anneau.
 */
export function ProgressRing({
  progress,
  size = 96,
  stroke = 9,
  color = '#00B050',
  trackColor = 'rgba(0,16,48,0.08)',
  delay = 0,
  children,
}: {
  progress: number
  size?: number
  stroke?: number
  color?: string
  trackColor?: string
  delay?: number
  children?: ReactNode
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))
  const animated = useRef(new Animated.Value(0)).current
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [animated, clamped, delay])

  const dashOffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  })

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
