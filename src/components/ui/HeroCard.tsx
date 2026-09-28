import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface HeroCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'conduite' | 'admin' | 'welcome';
  children: ReactNode;
  className?: string;
}

export const HeroCard = forwardRef<HTMLDivElement, HeroCardProps>(
  ({ variant = 'default', className = '', style, children, ...props }, ref) => {
    const gradients: Record<string, string> = {
      default: 'var(--d-hero-gradient)',
      conduite: 'var(--d-hero-gradient-yellow)',
      admin: 'var(--d-hero-gradient)',
      welcome: 'var(--d-hero-gradient)',
    };

    const borderRadius = variant === 'conduite' || variant === 'admin' ? 28 : 32;
    const padding = variant === 'admin' ? '20px' : '22px 20px 20px';

    return (
      <div
        ref={ref}
        className={`hero-card ${className}`}
        style={{
          position: 'relative',
          borderRadius,
          padding,
          background: gradients[variant],
          color: '#FFFFFF',
          boxShadow: '0 26px 44px -22px rgba(10,27,61,0.75), inset 0 1px 0 rgba(255,255,255,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflow: 'hidden',
          ...style,
        }}
        {...props}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </div>
    );
  }
);

HeroCard.displayName = 'HeroCard';