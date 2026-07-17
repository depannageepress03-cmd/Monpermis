import { useEffect, useRef } from 'react'
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native'
import { dark, fonts } from '../theme'

const INTRO_BG = dark.bg

/** Logo d’intro — fond blanc aligné sur le reste de l’app. */
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
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
    letterSpacing: 1.2,
  },
  dot: {
    color: dark.green,
  },
})
