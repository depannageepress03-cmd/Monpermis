import type { TextStyle } from 'react-native'

export const fonts = {
  heading: 'PlayfairDisplay',
  headingBold: 'PlayfairDisplay_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const

export const typography: Record<string, TextStyle> = {
  h1: {
    fontFamily: fonts.headingBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    lineHeight: 30,
  },
  h4: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
}

export const colors = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  primaryLight: '#3b82f6',
  accent: '#f59e0b',
  success: '#16a34a',
  error: '#dc2626',
  bg: '#f8f9fc',
  surface: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  signinAccent: '#00B050',
  white: '#ffffff',
  introBg: '#FAF9F6',
  overlay: 'rgba(0,16,48,0.4)',
}

export const brand = {
  green: '#00B050',
  gold: '#FFC000',
  navy: '#001030',
  navyMuted: '#3d5a73',
  greenLight: '#e8f8ef',
  goldLight: '#fff8e6',
  greenPale: '#f0fdf4',
  navyPale: '#f1f3f6',
}

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
}

export const shadows = {
  sm: {
    shadowColor: '#001030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#001030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#001030',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  card: {
    shadowColor: '#001030',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 5,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
}

/** Dégradés — cartes et boutons plus vivants pour une exécution ludique. */
export const gradients = {
  green: ['#00D566', '#00A344'] as const,
  greenDeep: ['#00B050', '#007A38'] as const,
  gold: ['#FFD84D', '#FFB300'] as const,
  navy: ['#16264a', '#0a1530'] as const,
  sky: ['#60C6FF', '#2E93E6'] as const,
  violet: ['#B98BFF', '#8B5CF6'] as const,
  hero: ['#0f1729', '#1a2d47', '#1e3a5f'] as const,
}

/** Accents ludiques (streak, XP, réussite) pour une lecture façon jeu. */
export const play = {
  streak: '#FF7A1A',
  streakLight: '#FFF1E6',
  xp: '#FFC000',
  xpLight: '#FFF8E6',
  celebrate: '#8B5CF6',
  celebrateLight: '#F3ECFF',
  sky: '#2E93E6',
  skyLight: '#EAF6FF',
}
