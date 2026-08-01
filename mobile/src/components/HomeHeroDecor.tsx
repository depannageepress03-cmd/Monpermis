import { Image, StyleSheet, View } from 'react-native'
import { radii, shadows } from '../theme'

/** Illustration décorative hero (permis + clé) — purement visuelle. */
export function HomeHeroDecor() {
  return (
    <View
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('../../assets/home/hero-permis.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: 118,
    height: 118,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  image: {
    width: 108,
    height: 108,
  },
})
