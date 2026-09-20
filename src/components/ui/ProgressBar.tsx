export function ProgressBar({ percent, dark = false }: { percent: number; dark?: boolean }) {
  return (
    <div className={`mp-bar ${dark ? 'mp-bar--dark' : ''}`}>
      <div className="mp-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
