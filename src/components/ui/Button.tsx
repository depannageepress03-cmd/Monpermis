import {
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from 'react'
import { type LucideIcon } from 'lucide-react'

/** Variantes du nouveau design + variantes héritées (avant refonte). */
export type ButtonVariant =
  | 'primary'
  | 'accent'
  | 'outline'
  | 'google'
  | 'slider'
  // héritées
  | 'cta'
  | 'icon'

export type ButtonSize = 'sm' | 'md' | 'lg'

export type IconProp = LucideIcon | ReactNode | ((props: { size: number; color: string }) => ReactNode)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Hérité : nœud React déjà construit, rendu avant le contenu. */
  icon?: ReactNode
  /** Hérité : teinte verte/orange/jaune. */
  tone?: 'green' | 'orange' | 'yellow' | string
  leftIcon?: IconProp
  rightIcon?: IconProp
  iconSize?: number
  fullWidth?: boolean
  loading?: boolean
}

/**
 * Rend une icône quelle que soit sa forme : composant lucide, renderer
 * `({ size, color }) => …` ou élément React déjà instancié.
 */
function renderIcon(icon: IconProp | undefined, size: number, color: string): ReactNode {
  if (icon === null || icon === undefined) return null
  if (typeof icon === 'function') {
    const Renderer = icon as (props: { size: number; color: string }) => ReactNode
    return <Renderer size={size} color={color} />
  }
  if (typeof icon === 'object') {
    if (isValidElement(icon)) return icon
    const Component = icon as ElementType
    return <Component size={size} />
  }
  return null
}

const ICON_COLORS: Record<string, string> = {
  primary: '#FFFFFF',
  accent: '#0A1B3D',
  outline: '#0A1B3D',
  google: '#0A1B3D',
  slider: '#0A1B3D',
  cta: '#FFFFFF',
  icon: '#0A1B3D',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      tone,
      leftIcon,
      rightIcon,
      iconSize = 18,
      fullWidth = false,
      loading = false,
      className = '',
      style,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading
    // `cta` et `icon` sont les variantes héritées : on les rend avec le
    // nouveau socle visuel (le CSS de refonte les re-style par-dessus).
    const visualVariant = variant === 'cta' ? 'primary' : variant
    const isIconOnly = variant === 'icon'

    const baseStyles: React.CSSProperties = {
      border: 0,
      borderRadius: 29,
      fontFamily: 'inherit',
      fontWeight: 800,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.65 : 1,
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
      width: fullWidth ? '100%' : 'auto',
      ...style,
    }

    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: { height: 56, fontSize: 15, paddingLeft: 20, paddingRight: 20 },
      md: { height: 58, fontSize: 16, paddingLeft: 22, paddingRight: 22 },
      lg: { height: 60, fontSize: 16, paddingLeft: 24, paddingRight: 24 },
    }

    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        backgroundColor: '#0A1B3D',
        color: '#FFFFFF',
        boxShadow: '0 18px 32px -14px rgba(10,27,61,0.65)',
      },
      accent: {
        backgroundColor: '#FFB400',
        color: '#0A1B3D',
        boxShadow: '0 16px 30px -12px rgba(255,180,0,0.60)',
      },
      outline: {
        backgroundColor: '#FFFFFF',
        color: '#0A1B3D',
        border: '1.5px solid #E1E6EF',
        boxShadow: 'none',
      },
      google: {
        backgroundColor: '#FFFFFF',
        color: '#0A1B3D',
        border: '1.5px solid #E1E6EF',
        boxShadow: 'none',
      },
      slider: {
        backgroundColor: '#FFB400',
        color: '#0A1B3D',
        justifyContent: 'space-between',
        paddingRight: 6,
        paddingLeft: 22,
        boxShadow: '0 16px 30px -12px rgba(255,180,0,0.60)',
      },
      cta: {
        backgroundColor: '#0A1B3D',
        color: '#FFFFFF',
        boxShadow: '0 18px 32px -14px rgba(10,27,61,0.65)',
      },
      icon: {
        backgroundColor: '#FFFFFF',
        color: '#0A1B3D',
        border: '1.5px solid #E1E6EF',
        boxShadow: 'none',
        paddingLeft: 14,
        paddingRight: 14,
      },
    }

    const sliderIconStyles: React.CSSProperties = {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: '#0A1B3D',
      color: '#FFB400',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }

    const googleIconStyles: React.CSSProperties = {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#F1F4F9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }

    const combinedStyles: React.CSSProperties = {
      ...baseStyles,
      ...(isIconOnly ? sizeStyles.sm : sizeStyles[size]),
      ...variantStyles[variant],
    }

    const iconColor = ICON_COLORS[visualVariant] ?? '#0A1B3D'

    return (
      <button
        ref={ref}
        type={type}
        className={`mp-btn mp-btn--${variant} mp-btn--${tone ?? 'green'} btn ${className}`}
        style={combinedStyles}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
              marginRight: 8,
            }}
          />
        )}
        {variant === 'google' && (
          <span style={googleIconStyles} aria-hidden="true">
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#0A1B3D' }}>G</span>
          </span>
        )}
        {renderIcon(icon, iconSize, iconColor)}
        {renderIcon(leftIcon, iconSize, iconColor)}
        {children != null && (
          <span style={{ flex: fullWidth && !isIconOnly ? 1 : undefined, textAlign: variant === 'slider' ? 'left' : 'center' }}>
            {children}
          </span>
        )}
        {rightIcon && variant !== 'slider' && renderIcon(rightIcon, iconSize, iconColor)}
        {variant === 'slider' && rightIcon && (
          <span style={sliderIconStyles}>{renderIcon(rightIcon, iconSize, '#FFB400')}</span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
