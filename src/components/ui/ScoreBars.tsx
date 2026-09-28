import { forwardRef, type HTMLAttributes } from 'react';

export interface ScoreBarsProps extends HTMLAttributes<HTMLDivElement> {
  scores: Array<{
    value: number;
    label: string;
    color?: 'old' | 'recent' | 'latest';
  }>;
  maxHeight?: number;
  className?: string;
}

export const ScoreBars = forwardRef<HTMLDivElement, ScoreBarsProps>(
  ({
    scores,
    maxHeight = 100,
    className = '',
    style,
    ...props
  }, ref) => {
    const colorMap = {
      old: '#C9D3E6',
      recent: '#0BAA4F',
      latest: '#FFB400',
    };

    return (
      <div
        ref={ref}
        className={`score-bars ${className}`}
        style={{
          borderRadius: 26,
          backgroundColor: '#FFFFFF',
          padding: 18,
          boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          ...style,
        }}
        {...props}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700 }}>
            Examens blancs
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#5B6680' }}>
            6 dernières semaines
          </div>
        </div>
        <div
          style={{
            height: maxHeight,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          {scores.map((score, index) => (
            <div
              key={index}
              style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    width: '100%',
                    borderRadius: 10,
                    backgroundColor: colorMap[score.color || 'old'],
                    height: `${(score.value / 100) * maxHeight}px`,
                    maxHeight,
                    transition: 'height 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#5B6680' }}>
                {score.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

ScoreBars.displayName = 'ScoreBars';