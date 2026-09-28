import type { Ref } from 'react'

interface HintChipProps {
  copy: string
  light: 'red' | 'yellow' | 'green'
  left: number
  top: number
  visible: boolean
  innerRef?: Ref<HTMLSpanElement>
}

export function HintChip({ copy, light, left, top, visible, innerRef }: HintChipProps) {
  return (
    <span
      ref={innerRef}
      className="login-hint"
      data-light={light}
      aria-hidden="true"
      style={{ left, top, opacity: visible && copy ? 1 : 0, visibility: visible && copy ? 'visible' : 'hidden' }}
    >
      <span className="login-hint__dot" />
      {copy}
    </span>
  )
}
