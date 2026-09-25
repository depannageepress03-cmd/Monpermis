import { forwardRef, type HTMLAttributes } from 'react';
import { LogoMark } from '../icons/LogoMark';

export interface LogoTileProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'lg';
}

export const LogoTile = forwardRef<HTMLDivElement, LogoTileProps>(
  ({ size = 'sm', className = '', style, children, ...props }, ref) => {
    const isLarge = size === 'lg';
    return (
      <div
        ref={ref}
        className={`logo-tile ${className}`}
        style={{
          width: isLarge ? 196 : 46,
          height: isLarge ? 196 : 46,
          borderRadius: isLarge ? 48 : 15,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        {...props}
      >
        {children || (
          <LogoMark
            width={isLarge ? 265 : 62}
            height={isLarge ? 265 : 62}
            alt="Monpermis.bj"
          />
        )}
      </div>
    );
  }
);

LogoTile.displayName = 'LogoTile';