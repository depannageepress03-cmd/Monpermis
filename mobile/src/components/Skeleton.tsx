import { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { dark, radii } from '../theme'

function PulseBlock({
  height,
  width,
  style,
  radius = 12,
}: {
  height: number
  width?: number | `${number}%`
  style?: StyleProp<ViewStyle>
  radius?: number
}) {
  const opacity = useRef(new Animated.Value(0.35)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        styles.block,
        {
          height,
          width: width ?? '100%',
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  )
}

/** Carte skeleton générique — listes de chapitres / cours. */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <PulseBlock height={14} width="42%" radius={8} />
      <PulseBlock height={22} width="78%" radius={8} style={{ marginTop: 10 }} />
      <PulseBlock height={12} width="58%" radius={8} style={{ marginTop: 12 }} />
    </View>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  )
}

/** Habillage accueil pendant le premier chargement. */
export function HomeSkeleton() {
  return (
    <View style={styles.home}>
      <PulseBlock height={18} width="36%" radius={8} />
      <PulseBlock height={34} width="70%" radius={10} style={{ marginTop: 10 }} />
      <PulseBlock height={72} radius={18} style={{ marginTop: 18 }} />
      <PulseBlock height={88} radius={18} style={{ marginTop: 14 }} />
      <View style={styles.homeRow}>
        <PulseBlock height={120} width="48%" radius={18} />
        <PulseBlock height={120} width="48%" radius={18} />
      </View>
    </View>
  )
}

/** Habillage détail de cours. */
export function CourseDetailSkeleton() {
  return (
    <View style={styles.home}>
      <PulseBlock height={18} width="40%" radius={8} />
      <PulseBlock height={28} width="85%" radius={10} style={{ marginTop: 12 }} />
      <PulseBlock height={180} radius={18} style={{ marginTop: 18 }} />
      <PulseBlock height={14} width="92%" radius={8} style={{ marginTop: 16 }} />
      <PulseBlock height={14} width="80%" radius={8} style={{ marginTop: 8 }} />
      <PulseBlock height={14} width="70%" radius={8} style={{ marginTop: 8 }} />
      <PulseBlock height={48} radius={14} style={{ marginTop: 22 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: dark.surfaceRaised,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 12,
  },
  list: {
    gap: 4,
  },
  home: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  homeRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
