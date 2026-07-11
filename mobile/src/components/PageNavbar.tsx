import type { ComponentType, ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { brand, colors } from '../theme'

type IconProps = { size?: number; color?: string }

export function PageNavbar({
  title,
  icon: Icon,
  onBack,
  tone = 'default',
  backLabel = 'Retour',
  numberOfLines = 1,
}: {
  title: string
  icon: ComponentType<IconProps> | ComponentType<{ size?: number }>
  onBack: () => void
  tone?: 'default' | 'drive'
  backLabel?: string
  numberOfLines?: number
}) {
  const iconColor = tone === 'drive' ? '#B8860B' : brand.green

  return (
    <View style={styles.navbar}>
      <View style={styles.navLeft}>
        <View style={[styles.navIcon, tone === 'drive' && styles.navIconDrive]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={styles.navTitle} numberOfLines={numberOfLines}>
          {title}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.navBack, pressed && styles.pressed]}
        onPress={onBack}
        hitSlop={12}
      >
        <ChevronLeft size={20} color={brand.navy} />
        <Text style={styles.navBackText}>{backLabel}</Text>
      </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: `${brand.navy}10`,
  },
  navbarSlot: {
    paddingBottom: 0,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenLight,
    borderWidth: 1,
    borderColor: `${brand.green}35`,
    flexShrink: 0,
  },
  navIconDrive: {
    backgroundColor: brand.goldLight,
    borderColor: `${brand.gold}55`,
  },
  navTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    color: brand.navy,
    letterSpacing: -0.3,
  },
  navBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  navBackText: {
    color: brand.navy,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
})
