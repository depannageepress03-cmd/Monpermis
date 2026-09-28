import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type SlotButtonState = 'available' | 'selected' | 'unavailable';

export interface SlotButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  time: string;
  state?: SlotButtonState;
  onSelect?: () => void;
  className?: string;
}

export const SlotButton = forwardRef<HTMLButtonElement, SlotButtonProps>(
  ({
    time,
    state = 'available',
    onSelect,
    className = '',
    style,
    ...props
  }, ref) => {
    const isUnavailable = state === 'unavailable';

    const stateStyles: Record<SlotButtonState, React.CSSProperties> = {
      available: {
        backgroundColor: '#FFFFFF',
        color: '#0A1B3D',
        border: '1.5px solid #E1E6EF',
        textDecoration: 'none',
      },
      selected: {
        backgroundColor: '#EAF7EF',
        color: '#065C2A',
        border: '2px solid #0BAA4F',
        textDecoration: 'none',
      },
      unavailable: {
        backgroundColor: '#EEF1F6',
        color: '#8A93A8',
        border: '1.5px dashed #CBD3E1',
        textDecoration: 'line-through',
      },
    };

    return (
      <button
        ref={ref}
        className={`slot-btn ${className}`}
        style={{
          height: 48,
          borderRadius: 24,
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 700,
          cursor: onSelect && !isUnavailable ? 'pointer' : 'not-allowed',
          ...stateStyles[state],
          ...style,
        }}
        onClick={onSelect}
        disabled={isUnavailable}
        {...props}
      >
        {time}
      </button>
    );
  }
);

SlotButton.displayName = 'SlotButton';