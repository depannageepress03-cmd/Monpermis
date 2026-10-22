interface SkeletonProps {
  height?: number | string
  width?: number | string
  className?: string
}

/** Plus d'effet de chargement « ombré » : ces composants ne rendent rien. */
export function Skeleton(_props: SkeletonProps) {
  return null
}

export function SkeletonBlock(_props: { rows?: number }) {
  return null
}
