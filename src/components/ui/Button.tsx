import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cta' | 'outline' | 'icon';
  tone?: 'green' | 'orange';
  icon?: ReactNode;
}

export function Button({ variant = 'cta', tone = 'green', icon, children, className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`mp-btn mp-btn--${variant} mp-btn--${tone} ${className}`} {...rest}>
      {icon}{children}
    </button>
  );
}
