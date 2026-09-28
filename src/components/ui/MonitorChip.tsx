import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface MonitorChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  initials: string;
  name: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const MonitorChip = forwardRef<HTMLButtonElement, MonitorChipProps>(
  ({
    initials,
    name,
    selected = false,
    onSelect,
    className = '',
    style,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        className={`monitor-chip ${className}`}
        style={{
          flexShrink: 0,
          height: 52,
          boxSizing: 'border-box',
          padding: '0 16px 0 6px',
          borderRadius: 26,
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          cursor: onSelect ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          backgroundColor: selected ? '#0A1B3D' : '#FFFFFF',
          color: selected ? '#FFFFFF' : '#0A1B3D',
          border: selected ? '1.5px solid #0A1B3D' : '1.5px solid #E1E6EF',
          ...style,
        }}
        onClick={onSelect}
        aria-label={`${selected ? 'Moniteur sélectionné' : 'Sélectionner le moniteur'} ${name}`}
        {...props}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Sora, sans-serif',
            fontSize: 13,
            fontWeight: 800,
            backgroundColor: selected ? '#FFB400' : '#BFEBD2',
            color: selected ? '#0A1B3D' : '#0A1B3D',
          }}
        >
          {initials}
        </span>
        <span>{name}</span>
      </button>
    );
  }
);

MonitorChip.displayName = 'MonitorChip';