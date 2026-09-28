import { forwardRef, type ReactNode, type SVGAttributes } from 'react';

export interface ProgressRingSegment {
  color: string;
  value: number;
  max: number;
}

export interface ProgressRingProps extends SVGAttributes<SVGSVGElement> {
  /** API héritée : anneau simple à un seul arc. */
  percent?: number;
  /** API refonte : progression 0…1 utilisée quand `segments` est fourni. */
  progress?: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  segments?: ProgressRingSegment[];
  centerContent?: ReactNode;
}

/** Anneau hérité : un seul arc + pourcentage centré. */
function LegacyRing({ percent, size }: { percent: number; size: number }) {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="mp-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="mp-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="mp-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mp-ring-label">{percent}%</span>
    </div>
  );
}

export const ProgressRing = forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      percent,
      progress = 0,
      size = 270,
      strokeWidth = 24,
      trackColor = '#E6ECF5',
      segments,
      centerContent,
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    if (segments === undefined && percent !== undefined) {
      const legacySize = centerContent ? size : Math.min(size, 220);
      return (
        <div className={className} style={style as React.CSSProperties}>
          <LegacyRing percent={percent} size={legacySize} />
          {centerContent}
        </div>
      );
    }

    const radius = 105;
    const circumference = 2 * Math.PI * radius;
    const gap = 4;

    const resolvedSegments: ProgressRingSegment[] =
      segments && segments.length > 0
        ? segments
        : [
            { color: '#0BAA4F', value: progress, max: 1 },
            { color: '#0A1B3D', value: 0, max: 1 },
            { color: '#FFB400', value: 0, max: 1 },
          ];

    const totalSegments = resolvedSegments.length;
    const segmentCircumference = (circumference - gap * totalSegments) / totalSegments;

    const segmentPaths = resolvedSegments.map((segment, index) => {
      const percentage = segment.max > 0 ? segment.value / segment.max : 0;
      const dashArray = `${segmentCircumference * percentage} ${circumference}`;
      const dashOffset = -index * (segmentCircumference + gap) - 14;

      return (
        <circle
          key={index}
          cx="135"
          cy="135"
          r={radius}
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          fill="none"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '135px 135px' }}
        />
      );
    });

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 270 270"
        fill="none"
        className={className}
        style={style}
        role="img"
        {...props}
      >
        <circle cx="135" cy="135" r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <g transform="rotate(-90 135 135)">{segmentPaths}</g>
        {centerContent ? <g transform="translate(135, 135)">{centerContent}</g> : null}
      </svg>
    );
  },
);

ProgressRing.displayName = 'ProgressRing';

export interface ProgressRingCenterProps {
  percentage: number;
  label: string;
  trend?: {
    value: string;
    icon?: ReactNode;
  };
}

export const ProgressRingCenter = ({ percentage, label, trend }: ProgressRingCenterProps) => (
  <div
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <div
      style={{
        fontFamily: 'Sora, sans-serif',
        fontSize: 54,
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: '-0.04em',
        color: '#0A1B3D',
      }}
    >
      {percentage}
      <span style={{ color: '#8A93A8', fontSize: '45%', fontWeight: 700 }}>%</span>
    </div>
    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B6680' }}>{label}</div>
    {trend && (
      <div
        style={{
          marginTop: 8,
          height: 28,
          padding: '0 12px',
          borderRadius: 14,
          backgroundColor: '#EAF7EF',
          color: '#067A37',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {trend.icon}
        <span>{trend.value}</span>
      </div>
    )}
  </div>
);
