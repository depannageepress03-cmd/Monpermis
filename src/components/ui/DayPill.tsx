import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface DayPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  day: string;
  date: number;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const DayPill = forwardRef<HTMLButtonElement, DayPillProps>(
  ({
    day,
    date,
    selected = false,
    onSelect,
    className = '',
    style,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        className={`day-pill ${className}`}
        style={{
          flex: 1,
          flexBasis: 0,
          height: 72,
          borderRadius: 22,
          fontFamily: 'inherit',
          cursor: onSelect ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: selected ? '#0A1B3D' : '#FFFFFF',
          color: selected ? '#FFFFFF' : '#0A1B3D',
          border: selected ? '1.5px solid #0A1B3D' : '1.5px solid #E1E6EF',
          boxShadow: selected
            ? '0 14px 24px -14px rgba(10,27,61,0.8)'
            : 'none',
          ...style,
        }}
        onClick={onSelect}
        {...props}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, opacity: selected ? 1 : 0.8 }}>
          {day}
        </span>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 19, fontWeight: 700 }}>
          {date}
        </span>
      </button>
    );
  }
);

DayPill.displayName = 'DayPill';