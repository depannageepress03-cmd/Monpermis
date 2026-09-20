import type { ReactNode } from 'react';

export function Badge({ children, tone = 'orange', icon }: { children: ReactNode; tone?: 'orange' | 'green'; icon?: ReactNode }) {
  return <span className={`mp-badge mp-badge--${tone}`}>{icon}{children}</span>;
}
