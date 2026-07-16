import type { ComponentType } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { radii, typography } from '../theme'

type IconProps = { size?: number; color?: string }

/** Puce colorée façon jeu (streak, XP, réussite) pour habiller un chiffre-clé. */
export function StatChip({
  icon: Icon,
  label,
  color,
  background,
}: {
  icon: ComponentType<IconProps>
  label: string
  color: string
  background: string
}) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Icon size={14} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  label: {
    ...typography.caption,
    fontWeight: '800',
  },
})
