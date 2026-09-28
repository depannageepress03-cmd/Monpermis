import type { CSSProperties, ReactNode } from 'react';

export type IconBadgeTone = 'green' | 'orange' | 'yellow' | 'navy' | string;

export function IconBadge({
  icon,
  tone = 'green',
  className = '',
  style,
}: {
  icon: ReactNode;
  tone?: IconBadgeTone;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`mp-icon-badge mp-icon-badge--${tone} ${className}`} style={style}>
      {icon}
    </div>
  );
}
