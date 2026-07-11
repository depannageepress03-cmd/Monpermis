import { Image, StyleSheet, View, type ViewStyle } from 'react-native'
import { brand, colors } from '../theme'

export const AUTH_HEADER_HEIGHT = 220

type DecorVariant = 'welcome' | 'header'

interface AuthDecorBackgroundProps {
  variant?: DecorVariant
  style?: ViewStyle
  showLogo?: boolean
}

export function AuthDecorBackground({
  variant = 'header',
  style,
  showLogo = variant !== 'welcome',
}: AuthDecorBackgroundProps) {
  const isWelcome = variant === 'welcome'

  return (
    <View
      style={[styles.base, isWelcome ? styles.welcome : styles.header, style]}
      pointerEvents="none"
    >
      <View style={[styles.wave, styles.waveGreen, isWelcome && styles.waveGreenWelcome]} />
      <View style={[styles.wave, styles.waveGold, isWelcome && styles.waveGoldWelcome]} />
      <View style={[styles.wave, styles.waveNavy, isWelcome && styles.waveNavyWelcome]} />
      <View style={[styles.sphere, styles.sphereGold, isWelcome && styles.sphereGoldWelcome]} />
      <View style={[styles.sphere, styles.sphereGreen, isWelcome && styles.sphereGreenWelcome]} />
      <View style={[styles.sphere, styles.sphereNavy, isWelcome && styles.sphereNavyWelcome]} />

      {showLogo ? (
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcome: {
    flex: 1,
  },
  header: {
    height: AUTH_HEADER_HEIGHT,
    width: '100%',
  },
  wave: {
    position: 'absolute',
    borderRadius: 999,
  },
  waveGreen: {
    width: 200,
    height: 200,
    backgroundColor: `${brand.green}30`,
    top: -60,
    left: -70,
    transform: [{ rotate: '-15deg' }],
  },
  waveGreenWelcome: {
    width: 320,
    height: 320,
    top: -120,
    left: -140,
    backgroundColor: `${brand.green}22`,
  },
  waveGold: {
    width: 160,
    height: 160,
    backgroundColor: `${brand.gold}40`,
    top: 10,
    right: -40,
  },
  waveGoldWelcome: {
    width: 240,
    height: 240,
    top: -40,
    right: -90,
    backgroundColor: `${brand.gold}28`,
  },
  waveNavy: {
    width: 140,
    height: 140,
    backgroundColor: `${brand.navy}18`,
    bottom: -30,
    left: 40,
  },
  waveNavyWelcome: {
    width: 280,
    height: 280,
    bottom: -80,
    left: 160,
    backgroundColor: `${brand.navy}08`,
  },
  sphere: {
    position: 'absolute',
    borderRadius: 999,
  },
  sphereGold: {
    width: 34,
    height: 34,
    backgroundColor: brand.gold,
    top: 52,
    right: 52,
    opacity: 0.9,
  },
  sphereGoldWelcome: {
    width: 18,
    height: 18,
    top: '18%',
    right: '18%',
    opacity: 0.85,
  },
  sphereGreen: {
    width: 22,
    height: 22,
    backgroundColor: brand.green,
    bottom: 48,
    left: 36,
    opacity: 0.9,
  },
  sphereGreenWelcome: {
    width: 14,
    height: 14,
    top: '62%',
    left: '12%',
    opacity: 0.7,
  },
  sphereNavy: {
    width: 18,
    height: 18,
    backgroundColor: brand.navy,
    top: 36,
    left: 48,
    opacity: 0.55,
  },
  sphereNavyWelcome: {
    width: 10,
    height: 10,
    top: '72%',
    right: '22%',
    opacity: 0.35,
  },
  logo: {
    width: 150,
    height: 100,
    zIndex: 2,
  },
})
