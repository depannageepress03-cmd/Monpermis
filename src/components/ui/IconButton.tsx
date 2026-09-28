import { forwardRef, isValidElement, type ButtonHTMLAttributes, type ElementType, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';

export type IconRenderer = (props: { size: number; color: string }) => ReactNode;

export type IconProp = LucideIcon | ReactNode | IconRenderer;

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconProp;
  iconSize?: number;
  iconColor?: string;
  variant?: 'default' | 'bell';
  badge?: number;
  /** Alias web/RN : tous acceptés, tous mappés sur `aria-label`. */
  ariaLabel?: string;
  accessibilityLabel?: string;
  label?: string;
  /** Alias de `onClick`. */
  onPress?: () => void;
}

function renderIcon(icon: IconProp, size: number, color: string): ReactNode {
  if (typeof icon === 'function') {
    const Renderer = icon as IconRenderer;
    return <Renderer size={size} color={color} />;
  }
  if (typeof icon === 'object' && icon !== null) {
    if (isValidElement(icon)) return icon;
    const Component = icon as ElementType;
    return <Component size={size} color={color} />;
  }
  return null;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      iconSize = 20,
      iconColor = '#0A1B3D',
      variant = 'default',
      badge,
      ariaLabel,
      accessibilityLabel,
      label,
      onPress,
      className = '',
      style,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isBell = variant === 'bell';
    const accessibleName = ariaLabel ?? accessibilityLabel ?? label;
    return (
      <button
        ref={ref}
        type={type}
        className={`icon-btn ${className}`}
        aria-label={accessibleName}
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)',
          border: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          position: 'relative',
          cursor: 'pointer',
          ...style,
        }}
        onClick={onPress ?? props.onClick}
        {...props}
      >
        {renderIcon(icon, iconSize, iconColor)}
        {isBell && badge !== undefined && badge > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 11,
              right: 12,
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: '#FFB400',
              border: '2px solid #FFFFFF',
            }}
          />
        )}
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
