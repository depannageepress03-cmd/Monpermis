import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { brand } from '../theme'

interface BrandNameProps {
  style?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  size?: number
  /** Sur fond sombre : pastille claire pour garder Monpermis en noir. */
  onDark?: boolean
  /** Pour insertion dans un <Text> parent. */
  inline?: boolean
}

/** Mot-symbole : Monpermis (noir) + .bj (vert). */
export function BrandName({
  style,
  textStyle,
  size = 18,
  onDark = false,
  inline = false,
}: BrandNameProps) {
  const content = (
    <>
      <Text style={[styles.main, { fontSize: size }, textStyle]}>Monpermis</Text>
      <Text style={[styles.tld, { fontSize: size }, textStyle]}>.bj</Text>
    </>
  )

  if (inline) {
    return <Text accessibilityLabel="Monpermis.bj">{content}</Text>
  }

  return (
    <View style={[styles.row, onDark && styles.onDark, style]} accessibilityLabel="Monpermis.bj">
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  onDark: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  main: {
    color: '#000000',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tld: {
    color: brand.green,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
})
