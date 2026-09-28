import type { CSSProperties, ReactNode } from 'react';

export function SectionTitle({
  children,
  className = '',
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={`mp-section-title ${className}`} style={style}>
      {children}
    </p>
  );
}
