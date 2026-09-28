import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  style?: CSSProperties;
}

export function Card({ children, className = '', onClick, ariaLabel, style }: CardProps) {
  if (onClick) {
    return (
      <button
        type="button"
        className={`mp-card mp-card--clickable ${className}`}
        aria-label={ariaLabel}
        onClick={onClick}
        style={style}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={`mp-card ${className}`} style={style}>
      {children}
    </div>
  );
}
