import type { ReactNode } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet, Text, View } from 'react-native'
import { Bouncy } from './Bouncy'
import { brand, colors, gradients, radii, shadows, typography } from '../theme'

const toneStyles = {
  green: {
    card: { backgroundColor: brand.greenLight, borderColor: `${brand.green}25` },
    iconGradient: gradients.green,
  },
  gold: {
    card: { backgroundColor: brand.goldLight, borderColor: `${brand.gold}50` },
    iconGradient: gradients.gold,
  },
  navy: {
    card: { backgroundColor: brand.navyPale, borderColor: `${brand.navy}12` },
    iconGradient: gradients.navy,
  },
} as const

type Tone = keyof typeof toneStyles

export function Card({
  tone = 'green',
  icon,
  title,
  subtitle,
  locked,
  onPress,
  children,
  style,
}: {
  tone?: Tone
  icon?: ReactNode
  title: string
  subtitle?: string
  locked?: boolean
  onPress?: () => void
  children?: ReactNode
  style?: object
}) {
  const t = toneStyles[tone]
  const content = (
    <View style={[styles.card, t.card, locked && styles.locked, shadows.sm, style]}>
      {icon ? (
        <LinearGradient
          colors={locked ? ['#E5E9EF', '#D6DCE5'] : t.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          {icon}
        </LinearGradient>
      ) : null}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      {children}
    </View>
  )

  if (onPress) {
    return (
      <Bouncy onPress={onPress} disabled={locked} scaleTo={0.96}>
        {content}
      </Bouncy>
    )
  }

  return content
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    width: '100%',
    minHeight: 152,
  },
  locked: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    ...typography.bodySemiBold,
    fontSize: 15,
    color: brand.navy,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: brand.navyMuted,
    textAlign: 'center',
  },
})
