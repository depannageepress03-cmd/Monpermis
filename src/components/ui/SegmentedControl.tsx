import { forwardRef, type ReactNode } from 'react';

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
}

export const SegmentedControl = forwardRef<HTMLDivElement, SegmentedControlProps>(
  ({ options, value, onChange, className = '', style, fullWidth = true }, ref) => {
    return (
      <div
        ref={ref}
        className={`segmented-control ${className}`}
        style={{
          display: 'flex',
          gap: 4,
          height: 52,
          borderRadius: 26,
          backgroundColor: '#E8EDF6',
          padding: 5,
          width: fullWidth ? '100%' : 'auto',
          ...style,
        }}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className="segmented-btn"
              style={{
                flex: 1,
                borderRadius: 21,
                border: 0,
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#0A1B3D' : '#5B6680',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isActive
                  ? '0 4px 12px -4px rgba(10,27,61,0.25)'
                  : 'none',
                transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }
);

SegmentedControl.displayName = 'SegmentedControl';