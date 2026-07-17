import type { ComponentType, ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { dark, fonts, radii } from '../theme'

type IconProps = { size?: number; color?: string }

export function PageNavbar({
  title,
  icon: Icon,
  onBack,
  tone = 'default',
  numberOfLines = 1,
}: {
  title: string
  icon: ComponentType<IconProps> | ComponentType<{ size?: number }>
  onBack: () => void
  tone?: 'default' | 'drive'
  backLabel?: string
  numberOfLines?: number
}) {
  const iconColor = tone === 'drive' ? dark.coral : dark.green

  return (
    <View style={styles.navbar}>
      <Pressable
        style={({ pressed }) => [styles.navBack, pressed && styles.pressed]}
        onPress={onBack}
        hitSlop={12}
        accessibilityLabel="Retour"
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.navCenter}>
        <View style={[styles.navIcon, tone === 'drive' && styles.navIconDrive]}>
          <Icon size={16} color={iconColor} />
        </View>
        <Text style={styles.navTitle} numberOfLines={numberOfLines}>
          {title}
        </Text>
      </View>
      <View style={styles.navBack} />
    </View>
  )
}

export function PageNavbarSlot({ children }: { children: ReactNode }) {
  return <View style={styles.navbarSlot}>{children}</View>
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  navbarSlot: {
    paddingBottom: 0,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  navIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
    flexShrink: 0,
  },
  navIconDrive: {
    backgroundColor: dark.coralSoft,
  },
  navTitle: {
    flexShrink: 1,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.8,
  },
})
