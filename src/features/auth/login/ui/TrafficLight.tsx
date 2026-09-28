interface TrafficLightProps {
  light: 'red' | 'yellow' | 'green'
  error: boolean
}

export function TrafficLight({ light, error }: TrafficLightProps) {
  return (
    <span className={`login-traffic-light ${error ? 'is-error' : ''}`} data-light={light} aria-hidden="true">
      {(['red', 'yellow', 'green'] as const).map((color) => (
        <span
          className={`login-traffic-light__bulb login-traffic-light__bulb--${color} ${light === color ? 'is-lit' : ''}`}
          key={color}
        />
      ))}
    </span>
  )
}
