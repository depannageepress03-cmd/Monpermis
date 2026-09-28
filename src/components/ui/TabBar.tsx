import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface TabBarItem {
  id: string;
  icon: ReactNode;
  label: string;
}

export interface TabBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabBarItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const TabBar = forwardRef<HTMLDivElement, TabBarProps>(
  ({ items, activeId, onChange, className = '', style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`tabbar ${className}`}
        aria-label="Navigation principale"
        style={{
          width: '100%',
          maxWidth: 390,
          margin: '0 auto',
          padding: `0 16px 22px`,
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      >
        <div
          style={{
            flexGrow: 1,
            height: 72,
            boxSizing: 'border-box',
            padding: '0 8px',
            borderRadius: 36,
            backgroundColor: 'rgba(10,27,61,0.93)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 20px 40px -14px rgba(10,27,61,0.6), inset 0 1px 0 rgba(255,255,255,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="tabbar-item"
                style={{
                  width: 64,
                  height: 56,
                  borderRadius: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  fontSize: 10.5,
                  fontWeight: 700,
                  textDecoration: 'none',
                  backgroundColor: isActive ? '#FFB400' : 'transparent',
                  color: isActive ? '#0A1B3D' : 'rgba(255,255,255,0.74)',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  onChange(item.id);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  }
);

TabBar.displayName = 'TabBar';