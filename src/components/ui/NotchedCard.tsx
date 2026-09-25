import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface NotchedCardProps extends HTMLAttributes<HTMLDivElement> {
  tabLabel: string;
  tabColor: string;
  /** `dark` (défaut) : corps bleu nuit, texte blanc. `light` : corps teinté clair (ex. carte « Cours terminé »). */
  tone?: 'dark' | 'light';
  tabIcon?: ReactNode;
  time?: string;
  date?: string;
  children: ReactNode;
  className?: string;
}

export const NotchedCard = forwardRef<HTMLDivElement, NotchedCardProps>(
  ({
    tabLabel,
    tabColor,
    tone = 'dark',
    tabIcon,
    time,
    date,
    className = '',
    style,
    children,
    ...props
  }, ref) => {
    const isLight = tone === 'light';
    return (
      <div
        ref={ref}
        className={`notched-card ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
        {...props}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: -8 }}>
          <div
            style={{
              height: 40,
              padding: '0 20px',
              borderRadius: '20px 20px 0 0',
              backgroundColor: tabColor,
              color: isLight ? '#065C2A' : '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {tabIcon && <span>{tabIcon}</span>}
            <span>{tabLabel}</span>
          </div>
          {(time || date) && (
            <div
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 12.5,
                fontWeight: 700,
                color: '#3C4760',
                paddingRight: 4,
              }}
            >
              {time && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="8.5" />
                    <path d="M12 7.5V12l3 2" />
                  </svg>
                  {time}
                </span>
              )}
              {date && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
                    <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
                  </svg>
                  {date}
                </span>
              )}
            </div>
          )}
        </div>
        <div
          style={{
            borderRadius: '0 24px 24px 24px',
            backgroundColor: isLight ? tabColor : '#0A1B3D',
            color: isLight ? '#065C2A' : '#FFFFFF',
            padding: '16px 18px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: isLight ? 6 : 12,
            boxShadow: isLight ? 'none' : '0 20px 36px -22px rgba(10,27,61,0.7)',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);

NotchedCard.displayName = 'NotchedCard';