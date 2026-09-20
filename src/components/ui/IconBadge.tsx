import type { ReactNode } from 'react';

export function IconBadge({ icon, tone = 'green' }: { icon: ReactNode; tone?: 'green' | 'orange' }) {
  return <div className={`mp-icon-badge mp-icon-badge--${tone}`}>{icon}</div>;
}
