import type { ReactNode } from 'react';

export function SectionTitle({ children }: { children: ReactNode }) {
  return <p className="mp-section-title">{children}</p>;
}
