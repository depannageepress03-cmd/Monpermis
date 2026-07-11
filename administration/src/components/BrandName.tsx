import type { HTMLAttributes } from 'react'

type BrandNameProps = HTMLAttributes<HTMLSpanElement> & {
  as?: 'span' | 'h1' | 'h2' | 'p'
  onDark?: boolean
}

/** Mot-symbole : Monpermis (noir) + .bj (vert). */
export function BrandName({
  as: Tag = 'span',
  onDark = false,
  className = '',
  ...props
}: BrandNameProps) {
  return (
    <Tag
      className={`brand-name${onDark ? ' brand-name--on-dark' : ''}${className ? ` ${className}` : ''}`}
      aria-label="Monpermis.bj"
      {...props}
    >
      <span className="brand-name-main">Monpermis</span>
      <span className="brand-name-tld">.bj</span>
    </Tag>
  )
}
