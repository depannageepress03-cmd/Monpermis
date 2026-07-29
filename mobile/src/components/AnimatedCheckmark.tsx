import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { dark } from '../theme'

/** Checkmark qui se “dessine” + scale bounce — feedback de bonne réponse / réussite. */
export function AnimatedCheckmark({
  active,
  size = 72,
  color = dark.green,
}: {
  active: boolean
  size?: number
  color?: string
}) {
  const scale = useRef(new Animated.Value(0.4)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) {
      scale.setValue(0.4)
      opacity.setValue(0)
      return
    }
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()
  }, [active, opacity, scale])

  return (
    <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
      <View style={[styles.well, { width: size, height: size, borderRadius: size / 2 }]}>
        <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 13l4 4L19 7"
            stroke={color}
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.35)',
    marginBottom: 12,
  },
})
