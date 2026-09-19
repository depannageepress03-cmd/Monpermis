import { useRef } from 'react'
import { Animated } from 'react-native'

/**
 * Souligne la barre de navigation au scroll (filet qui apparaît en fondu).
 * Driver natif : opacity seule, coût nul même à 60fps.
 *
 * Usage :
 *   const { onScroll, dividerOpacity } = useHeaderFade()
 *   <View style={styles.topBar}>…</View>
 *   <Animated.View style={[styles.barDivider, { opacity: dividerOpacity }]} />
 *   <ScrollView onScroll={onScroll} scrollEventThrottle={16}>…</ScrollView>
 */
export function useHeaderFade(distance = 16) {
  const scrollY = useRef(new Animated.Value(0)).current
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true },
  )
  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, distance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  return { onScroll, dividerOpacity }
}
