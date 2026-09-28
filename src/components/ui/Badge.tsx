import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'orange' | 'green' | 'yellow' | 'navy' | 'red' | string;

export function Badge({
  children,
  tone = 'orange',
  variant,
  icon,
  className = '',
  style,
  size,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  /** Alias de `tone` utilisé par certaines pages. */
  variant?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Taille de police optionnelle (héritée). */
  size?: number | string;
}) {
  const resolvedTone = variant ?? tone;
  return (
    <span
      className={`mp-badge mp-badge--${resolvedTone} ${className}`}
      style={size === undefined ? style : { fontSize: size, ...style }}
    >
      {icon}
      {children}
    </span>
  );
}
