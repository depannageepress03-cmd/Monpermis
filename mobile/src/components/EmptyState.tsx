import type { ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { dark, fonts } from '../theme'

/** Empty state illustré (icône Lucide + titre + texte + actions optionnelles). */
export function EmptyState({
  icon,
  title,
  message,
  action,
  style,
}: {
  icon: ReactNode
  title: string
  message: string
  action?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWell}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 18,
    gap: 8,
  },
  iconWell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
})
