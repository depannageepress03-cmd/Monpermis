import { forwardRef, isValidElement, type AnchorHTMLAttributes, type ElementType, type ReactNode } from 'react';

export type GlassActionIcon = ReactNode | ((props: { size: number; color: string }) => ReactNode);

export type GlassActionTone = 'glass' | 'light' | 'green';

export interface GlassActionProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: GlassActionIcon;
  label?: string;
  accent?: boolean;
  /**
   * `glass` (défaut) : tuile en verre, à poser sur un fond sombre.
   * `light` : tuile blanche bordée, à poser sur le fond clair de l'application.
   * `green` : tuile verte pleine (texte bleu nuit), pour l'action principale.
   */
  tone?: GlassActionTone;
  href?: string;
  className?: string;
  /** Alias de `onClick`, aligné sur l'API React Native. */
  onPress?: () => void;
}

function renderIcon(icon: GlassActionIcon | undefined, size: number, color: string): ReactNode {
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

export const GlassAction = forwardRef<HTMLAnchorElement | HTMLButtonElement, GlassActionProps>(
  (
    { icon, label, accent = false, tone = 'glass', href, onPress, className = '', style, children, onClick, ...props },
    ref,
  ) => {
    const palette: Record<GlassActionTone, { bg: string; border: string; color: string; shadow: string }> = {
      glass: {
        bg: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.20)',
        color: '#FFFFFF',
        shadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      light: {
        bg: '#FFFFFF',
        border: '1.5px solid #E1E6EF',
        color: '#0A1B3D',
        shadow: '0 10px 30px -18px rgba(10,27,61,0.30)',
      },
      green: {
        bg: '#0BAA4F',
        border: 'none',
        color: '#06122A',
        shadow: '0 16px 30px -16px rgba(11,170,79,0.55)',
      },
    };
    const skin = accent
      ? { bg: '#FFB400', border: 'none', color: '#0A1B3D', shadow: '0 12px 24px -12px rgba(255,180,0,0.7)' }
      : palette[tone];
    const contentColor = skin.color;
    const sharedStyles: React.CSSProperties = {
      height: 76,
      borderRadius: 22,
      backgroundColor: skin.bg,
      border: skin.border,
      backdropFilter: tone === 'glass' && !accent ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: tone === 'glass' && !accent ? 'blur(12px)' : 'none',
      color: contentColor,
      textDecoration: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      fontFamily: 'inherit',
      fontSize: 12.5,
      fontWeight: accent || tone === 'green' ? 800 : 700,
      cursor: 'pointer',
      boxShadow: skin.shadow,
      ...style,
    };

    const body = (
      <>
        {renderIcon(icon, 22, contentColor)}
        {label !== undefined && <span>{label}</span>}
        {children}
      </>
    );

    if (href !== undefined) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={`glass-action ${className}`}
          style={sharedStyles}
          onClick={onClick}
          {...props}
        >
          {body}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={`glass-action ${className}`}
        style={sharedStyles}
        onClick={onPress ?? (onClick as unknown as () => void)}
      >
        {body}
      </button>
    );
  },
);

GlassAction.displayName = 'GlassAction';
