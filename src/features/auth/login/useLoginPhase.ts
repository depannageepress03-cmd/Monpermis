import { useEffect, useRef } from 'react'
import { normalizePhone, validateLoginIdentifier } from '../../../utils/validation'

export type LoginLayout = 'desktop-xl' | 'desktop-lg' | 'compact'
export type LoginPhase = 'empty' | 'half' | 'ready' | 'submitting' | 'error' | 'success'
export type LoginMethod = 'email' | 'phone'

export interface CarPosition {
  x: number
  y: number
  scale: number
}

export const LOGIN_POSITIONS: Record<LoginLayout, Record<LoginPhase | 'enter', CarPosition>> = {
  'desktop-xl': {
    enter: { x: 461, y: 1085.5, scale: 1 },
    empty: { x: 645.8, y: 813.9, scale: 0.88 },
    half: { x: 661, y: 697.5, scale: 0.769 },
    ready: { x: 733.6, y: 590.8, scale: 0.667 },
    submitting: { x: 733.6, y: 590.8, scale: 0.667 },
    error: { x: 645.8, y: 813.9, scale: 0.88 },
    success: { x: 1187, y: 18.5, scale: 0.121 },
  },
  'desktop-lg': {
    enter: { x: 461, y: 1085.5, scale: 1 },
    empty: { x: 645.8, y: 813.9, scale: 0.88 },
    half: { x: 628, y: 746, scale: 0.815 },
    ready: { x: 667.6, y: 687.8, scale: 0.76 },
    submitting: { x: 667.6, y: 687.8, scale: 0.76 },
    error: { x: 645.8, y: 813.9, scale: 0.88 },
    success: { x: 1187, y: 18.5, scale: 0.121 },
  },
  compact: {
    enter: { x: 348.2, y: 455.5, scale: 0.741 },
    empty: { x: 266, y: 205, scale: 0.33 },
    half: { x: 269.3, y: 215, scale: 0.346 },
    ready: { x: 247.4, y: 148.4, scale: 0.237 },
    submitting: { x: 247.4, y: 148.4, scale: 0.237 },
    error: { x: 293.6, y: 289, scale: 0.468 },
    success: { x: 214.6, y: 48.5, scale: 0.073 },
  },
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function getCarPosition(layout: LoginLayout, phase: LoginPhase | 'enter'): CarPosition {
  return LOGIN_POSITIONS[layout][phase]
}

export function useLoginPhase(
  identifier: string,
  password: string,
  method: LoginMethod,
  forcedPhase: LoginPhase | null,
) {
  const identifierValid =
    method === 'email'
      ? EMAIL_PATTERN.test(identifier.trim())
      : identifier.replace(/\D/g, '').length === 10 &&
        !validateLoginIdentifier(normalizePhone(identifier))
  const passwordValid = password.length >= 8
  const step = Number(identifierValid) + Number(passwordValid)
  const calculatedPhase: LoginPhase = step === 0 ? 'empty' : step === 1 ? 'half' : 'ready'
  const previousPhase = useRef<LoginPhase>('empty')

  useEffect(() => {
    if (!forcedPhase || (forcedPhase !== 'error' && forcedPhase !== 'submitting')) {
      previousPhase.current = calculatedPhase
    }
  }, [calculatedPhase, forcedPhase])

  const phase = forcedPhase ?? calculatedPhase
  const positionPhase = phase === 'error' ? previousPhase.current : phase === 'submitting' ? 'ready' : phase
  const copy = {
    empty: method === 'email' ? 'Remplis ton e-mail pour démarrer' : 'Remplis ton numéro pour démarrer',
    half: identifierValid
      ? 'Plus que ton mot de passe'
      : method === 'email'
        ? 'Plus que ton e-mail'
        : 'Plus que ton numéro',
    ready: 'Prêt à partir !',
    submitting: 'Démarrage…',
    error: 'Vérifie tes informations',
    success: '',
  }[phase]
  const compactCopy = {
    empty: method === 'email' ? 'Remplis ton e-mail' : 'Remplis ton numéro',
    half: identifierValid
      ? 'Plus que le mot de passe'
      : method === 'email'
        ? 'Plus que ton e-mail'
        : 'Plus que ton numéro',
    ready: 'Prêt à partir !',
    submitting: 'Démarrage…',
    error: 'Vérifie tes infos',
    success: '',
  }[phase]

  return {
    identifierValid,
    passwordValid,
    step,
    phase,
    positionPhase,
    light: phase === 'ready' || phase === 'submitting' || phase === 'success' ? 'green' : phase === 'half' ? 'yellow' : 'red',
    copy,
    compactCopy,
  } as const
}
