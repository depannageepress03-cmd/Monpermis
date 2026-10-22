import type { StyleProp, ViewStyle } from 'react-native'

/**
 * Plus d'effet de chargement « ombré » : ces composants ne rendent rien.
 * Les exports sont conservés pour ne pas modifier les écrans qui les appellent.
 */
export function SkeletonCard(_props: { style?: StyleProp<ViewStyle> }) {
  return null
}

export function SkeletonList(_props: { count?: number }) {
  return null
}

export function HomeSkeleton() {
  return null
}

export function CourseDetailSkeleton() {
  return null
}
