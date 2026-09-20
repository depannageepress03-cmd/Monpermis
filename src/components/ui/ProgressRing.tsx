export function ProgressRing({ percent, size = 54 }: { percent: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="mp-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="mp-ring-track" />
        <circle cx={size / 2} cy={size / 2} r={r} className="mp-ring-value"
          strokeDasharray={c} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="mp-ring-label">{percent}%</span>
    </div>
  );
}
