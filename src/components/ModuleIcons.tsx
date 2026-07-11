/** Icônes figuratives pour les modules Code / Conduite (web). */

type IconProps = {
  size?: number
  className?: string
}

export function CodeModuleIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="6" y="14" width="34" height="40" rx="4" fill="#00B050" />
      <rect x="10" y="18" width="26" height="32" rx="2" fill="#E8FFF0" />
      <path d="M14 26h18M14 32h14M14 38h16" stroke="#00B050" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="38" y="10" width="18" height="40" rx="4" fill="#001030" />
      <circle cx="47" cy="20" r="5" fill="#EF4444" />
      <circle cx="47" cy="32" r="5" fill="#FFC000" />
      <circle cx="47" cy="44" r="5" fill="#22C55E" />
      <rect x="43" y="50" width="8" height="6" rx="1" fill="#334155" />
    </svg>
  )
}

export function DriveModuleIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="32" cy="54" rx="22" ry="4" fill="#00103022" />
      <path d="M12 38c2-10 8-16 20-16s18 6 20 16v6H12v-6Z" fill="#FFC000" />
      <path d="M18 28c3-6 8-9 14-9s11 3 14 9H18Z" fill="#FFE08A" />
      <path d="M20 30c2.5-4 6-6 12-6s9.5 2 12 6H20Z" fill="#7DD3FC" opacity="0.85" />
      <rect x="10" y="38" width="44" height="10" rx="3" fill="#001030" />
      <circle cx="20" cy="48" r="5.5" fill="#1E293B" />
      <circle cx="20" cy="48" r="2.5" fill="#94A3B8" />
      <circle cx="44" cy="48" r="5.5" fill="#1E293B" />
      <circle cx="44" cy="48" r="2.5" fill="#94A3B8" />
      <circle cx="18" cy="40" r="2" fill="#F8FAFC" />
      <circle cx="46" cy="40" r="2" fill="#F8FAFC" />
      <rect x="28" y="40" width="8" height="3" rx="1" fill="#FFC000" />
    </svg>
  )
}
