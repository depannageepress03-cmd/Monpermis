import { forwardRef, type HTMLAttributes } from 'react';

export type ChipVariant = 'default' | 'green' | 'yellow' | 'navy' | 'wrong' | 'glass';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: 'sm' | 'md';
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({
    variant = 'default',
    size = 'md',
    className = '',
    style,
    children,
    ...props
  }, ref) => {
    const isSmall = size === 'sm';
    const height = isSmall ? 28 : 30;
    const padding = isSmall ? '0 10px' : '0 12px';
    const fontSize = isSmall ? 11.5 : 12;
    const borderRadius = 15;

    const variantStyles: Record<ChipVariant, React.CSSProperties> = {
      default: {
        backgroundColor: '#E8EDF6',
        color: '#0A1B3D',
        border: 'none',
      },
      green: {
        backgroundColor: '#EAF7EF',
        color: '#067A37',
        border: 'none',
      },
      yellow: {
        backgroundColor: '#FFF4D6',
        color: '#7A5200',
        border: 'none',
      },
      navy: {
        backgroundColor: '#E8EDF6',
        color: '#0A1B3D',
        border: 'none',
      },
      wrong: {
        backgroundColor: '#FFF1E6',
        color: '#C2410C',
        border: 'none',
      },
      glass: {
        backgroundColor: 'rgba(255,255,255,0.10)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      },
    };

    return (
      <span
        ref={ref}
        className={`chip ${className}`}
        style={{
          height,
          padding: padding,
          borderRadius,
          display: 'inline-flex',
          alignItems: 'center',
          fontSize,
          fontWeight: 800,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          ...variantStyles[variant],
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Chip.displayName = 'Chip';