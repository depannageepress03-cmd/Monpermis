import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { brand, radii } from '../theme'

export function AccentBar({ delay = 0 }: { delay?: number }) {
  const scaleX = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.spring(scaleX, {
      toValue: 1,
      friction: 7,
      tension: 55,
      delay,
      useNativeDriver: true,
    }).start()
  }, [delay, scaleX])

  return (
    <Animated.View style={[styles.row, { transform: [{ scaleX }] }]}>
      <View style={[styles.bar, styles.green]} />
      <View style={[styles.bar, styles.gold]} />
      <View style={[styles.bar, styles.navy]} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  bar: {
    height: 4,
    borderRadius: radii.pill,
  },
  green: {
    width: 30,
    backgroundColor: brand.green,
  },
  gold: {
    width: 20,
    backgroundColor: brand.gold,
  },
  navy: {
    width: 12,
    backgroundColor: brand.navy,
  },
})
