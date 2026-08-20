import { useEffect, useRef, useState } from 'react'

export type SegmentedTab<T extends string> = {
  id: T
  label: string
}

type Props<T extends string> = {
  tabs: SegmentedTab<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}

/** Onglets avec pastille glissante (style iOS). */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const active = root.querySelector<HTMLButtonElement>(`button[data-tab-id="${value}"]`)
    if (!active) return

    const rootRect = root.getBoundingClientRect()
    const btnRect = active.getBoundingClientRect()
    setPill({
      left: btnRect.left - rootRect.left,
      width: btnRect.width,
    })
  }, [value, tabs])

  return (
    <div className={`segmented-tabs${className ? ` ${className}` : ''}`} ref={rootRef} role="tablist">
      <span
        className="segmented-tabs-pill"
        aria-hidden="true"
        style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
      />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          data-tab-id={tab.id}
          aria-selected={value === tab.id}
          className={value === tab.id ? 'is-active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
