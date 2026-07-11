interface PublishSwitchProps {
  checked: boolean
  onChange: (published: boolean) => void
  disabled?: boolean
  label?: string
}

export function PublishSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: PublishSwitchProps) {
  return (
    <label className={`publish-switch${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="publish-switch-track" aria-hidden="true">
        <span className="publish-switch-thumb" />
      </span>
      <span className="publish-switch-label">{label ?? (checked ? 'Publié' : 'Brouillon')}</span>
    </label>
  )
}
