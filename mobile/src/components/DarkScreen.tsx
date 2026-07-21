import { useFocusEffect } from '@react-navigation/native'
import { setStatusBarStyle } from 'expo-status-bar'
import type { ComponentType, ReactNode } from 'react'
import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegalFooter } from './LegalFooter'
import { dark, fonts } from '../theme'

type IconProps = { size?: number; color?: string }

/** Coquille commune : fond sombre, safe-area, barre de statut claire, footer mentions légales. */
export function DarkScreen({
  children,
  hideFooter = false,
}: {
  children: ReactNode
  hideFooter?: boolean
}) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.body}>{children}</View>
        {hideFooter ? null : (
          <View style={styles.footerWrap}>
            <LegalFooter />
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

/** En-tête clair : bouton retour + titre centré. */
export function DarkHeader({
  title,
  onBack,
  icon: Icon,
  right,
}: {
  title: string
  onBack: () => void
  icon?: ComponentType<IconProps>
  right?: ReactNode
}) {
  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityLabel="Retour"
        hitSlop={10}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.headerCenter}>
        {Icon ? <Icon size={16} color={dark.green} /> : null}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.backBtn}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  footerWrap: {
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  pressed: {
    opacity: 0.85,
  },
})
