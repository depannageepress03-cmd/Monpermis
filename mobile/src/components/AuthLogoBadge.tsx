import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

type Props = {
  /** Diamètre du cercle blanc. */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Logo Monpermis (marque détourée) dans un cercle fond blanc. */
export function AuthLogoBadge({ size = 72, style }: Props) {
  const logo = Math.round(size * 0.9)
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image
        source={require('../../assets/logo-mark.png')}
        style={{ width: logo, height: logo }}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#001030',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
})
