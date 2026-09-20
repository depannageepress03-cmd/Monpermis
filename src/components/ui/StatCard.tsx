import type { ReactNode } from 'react';

export function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="mp-stat">
      {icon}
      <p className="mp-stat-label">{label}</p>
      <p className="mp-stat-value">{value}</p>
    </div>
  );
}
