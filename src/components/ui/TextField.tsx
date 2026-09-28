import { forwardRef, isValidElement, type ElementType, type InputHTMLAttributes, type ReactNode } from 'react';
import { useState, type FocusEvent } from 'react';
import { type LucideIcon } from 'lucide-react';

/** Icône : composant lucide, renderer `({ size, color }) => …` ou élément React. */
export type TextFieldIcon = LucideIcon | ReactNode | ((props: { size: number; color: string }) => ReactNode);

function renderIcon(icon: TextFieldIcon | undefined, size: number, color: string): ReactNode {
  if (icon === null || icon === undefined) return null;
  if (typeof icon === 'function') {
    const Renderer = icon as (props: { size: number; color: string }) => ReactNode;
    return <Renderer size={size} color={color} />;
  }
  if (typeof icon === 'object') {
    if (isValidElement(icon)) return icon;
    const Component = icon as ElementType;
    return <Component size={size} color={color} />;
  }
  return null;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: TextFieldIcon;
  rightIcon?: TextFieldIcon;
  prefix?: ReactNode;
  iconSize?: number;
  fullWidth?: boolean;
  onRightIconClick?: () => void;
  rightIconLabel?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    prefix,
    iconSize = 20,
    fullWidth = true,
    className = '',
    style,
    id,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
  const { onRightIconClick, rightIconLabel, ...restProps } = props;
  const inputStyle = ((restProps as React.InputHTMLAttributes<HTMLInputElement>).style || {}) as React.CSSProperties;
    const [focused, setFocused] = useState(false);
    const inputId = id || `textfield-${Math.random().toString(36).slice(2)}`;

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    const borderColor = error
      ? '#C2410C'
      : focused
        ? '#0BAA4F'
        : '#E1E6EF';

    const boxShadow = focused && !error
      ? '0 0 0 4px rgba(11, 170, 79, 0.12)'
      : 'none';

    const LeftIcon = leftIcon;
    const RightIcon = rightIcon;

    return (
      <div
        className={`textfield-wrapper ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          width: fullWidth ? '100%' : 'auto',
          ...style,
        }}
      >
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#0A1B3D',
            }}
          >
            {label}
          </label>
        )}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {prefix && (
            <span
              style={{
                position: 'absolute',
                left: 16,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {prefix}
            </span>
          )}
          {(leftIcon || prefix) && (
            <span
              style={{
                position: 'absolute',
                left: prefix ? 70 : 16,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: '#0BAA4F',
              }}
            >
              {renderIcon(LeftIcon, iconSize, '#0BAA4F')}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className="textfield-input"
            style={{
              width: '100%',
              height: 56,
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              border: `1.5px solid ${borderColor}`,
              boxShadow,
              paddingLeft: prefix ? 92 : leftIcon ? 48 : 16,
              paddingRight: rightIcon ? 56 : 16,
              paddingTop: 0,
              paddingBottom: 0,
              fontFamily: 'inherit',
              fontSize: 15,
              color: '#0A1B3D',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
              ...inputStyle,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...restProps}
          />
          {RightIcon && (
            <button
              type="button"
              aria-label={rightIconLabel ?? 'Afficher ou masquer'}
              onClick={onRightIconClick}
              style={{
                position: 'absolute',
                right: 8,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'transparent',
                border: 0,
                color: '#5B6680',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {renderIcon(RightIcon, iconSize, '#5B6680')}
            </button>
          )}
        </div>
        {error && (
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#C2410C',
            }}
            role="alert"
          >
            {error}
          </div>
        )}
        {hint && !error && (
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#5B6680',
            }}
          >
            {hint}
          </div>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';