import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import { brand } from '../theme'

const INTRO_BG = '#FAF9F6'

/**
 * Fallback natif si le WebView HTML échoue — même fond crème, sans fond vert.
 */
export function IntroLogoMark() {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(10)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, translateY])

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.scene, { opacity, transform: [{ translateY }] }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Monpermis.bj"
        />
        <Text style={styles.wordmark}>
          monpermis<Text style={styles.dot}>.bj</Text>
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: INTRO_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scene: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
  wordmark: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#14263F',
    letterSpacing: 1.2,
  },
  dot: {
    color: brand.green,
  },
})
