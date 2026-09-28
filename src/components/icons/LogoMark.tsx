import type { CSSProperties } from 'react';

export interface LogoMarkProps {
  /** Taille demandée. Dans une tuile, la maquette fait déborder le logo d'environ 135 %. */
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  'aria-hidden'?: boolean | 'true' | 'false';
}

/**
 * Logo officiel Monpermis.bj (public/logo.png), sur fond blanc.
 * La tuile parente doit garder `overflow: hidden` : l'image déborde volontairement.
 */
export const LogoMark = ({
  width = 46,
  height = 46,
  alt = 'Monpermis.bj',
  className = '',
  style,
  ...props
}: LogoMarkProps) => (
  <img
    src="/logo.png"
    alt={alt}
    width={width}
    height={height}
    className={className}
    draggable={false}
    style={{ width, height, objectFit: 'contain', display: 'block', ...style }}
    {...props}
  />
);

export default LogoMark;
