import { type SVGAttributes } from 'react';

export interface LogoMarkProps extends SVGAttributes<SVGSVGElement> {
  width?: number;
  height?: number;
  alt?: string;
}

export const LogoMark = ({
  width = 48,
  height = 48,
  alt = 'Monpermis.bj',
  ...props
}: LogoMarkProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 170 200"
    fill="none"
    role="img"
    aria-label={alt}
    {...props}
  >
    <path
      d="M20 200 L150 0H174L70 200Z"
      fill="#0A1B3D"
    />
    <path
      d="M130 46L121 60M110 78L101 92M90 110L81 124M70 142L61 156"
      stroke="#FFB400"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);