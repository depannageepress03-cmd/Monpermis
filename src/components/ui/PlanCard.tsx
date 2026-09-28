import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface PlanCardProps extends HTMLAttributes<HTMLButtonElement> {
  name: string;
  description: string;
  price: string;
  popular?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  children?: ReactNode;
}

export const PlanCard = forwardRef<HTMLButtonElement, PlanCardProps>(
  ({
    name,
    description,
    price,
    popular = false,
    selected = false,
    onSelect,
    className = '',
    style,
    children,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        className={`plan-card ${className}`}
        style={{
          position: 'relative',
          minHeight: 76,
          borderRadius: 24,
          padding: '12px 16px 12px 14px',
          fontFamily: 'inherit',
          textAlign: 'left',
          cursor: onSelect ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backgroundColor: selected ? '#0A1B3D' : '#FFFFFF',
          color: selected ? '#FFFFFF' : '#0A1B3D',
          border: selected
            ? '1.5px solid #0A1B3D'
            : '1.5px solid #E1E6EF',
          boxShadow: selected
            ? '0 20px 34px -18px rgba(10,27,61,0.8)'
            : 'none',
          ...style,
        }}
        onClick={onSelect}
        {...props}
      >
        <span
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            boxSizing: 'border-box',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${selected ? '#FFB400' : '#CBD3E1'}`,
            backgroundColor: selected ? 'transparent' : 'transparent',
          }}
        >
          {selected && (
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#FFB400',
              }}
            />
          )}
        </span>
        <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700 }}>
              {name}
            </span>
            {popular && (
              <span
                style={{
                  height: 22,
                  padding: '0 9px',
                  borderRadius: 11,
                  backgroundColor: '#FFB400',
                  color: '#0A1B3D',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 10.5,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Meilleure offre
              </span>
            )}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: selected ? 0.9 : 0.8 }}>
            {description}
          </span>
        </span>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
          {price}
        </span>
        {children}
      </button>
    );
  }
);

PlanCard.displayName = 'PlanCard';