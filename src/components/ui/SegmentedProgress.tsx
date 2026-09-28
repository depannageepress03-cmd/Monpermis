import { forwardRef, type HTMLAttributes } from 'react';

export type SegmentedProgressType = 'qcm' | 'conduite';

export interface SegmentedProgressProps extends HTMLAttributes<HTMLDivElement> {
  type?: SegmentedProgressType;
  segments: number;
  completed: number;
  className?: string;
}

export const SegmentedProgress = forwardRef<HTMLDivElement, SegmentedProgressProps>(
  ({
    type = 'qcm',
    segments,
    completed,
    className = '',
    style,
    ...props
  }, ref) => {
    const configs = {
      qcm: { segmentWidth: 6, gap: 3, height: 6, borderRadius: 3 },
      conduite: { segmentWidth: 8, gap: 4, height: 8, borderRadius: 4 },
    };

    const config = configs[type];

    return (
      <div
        ref={ref}
        className={`segmented-progress ${className}`}
        style={{
          display: 'flex',
          gap: config.gap,
          height: config.height,
          ...style,
        }}
        {...props}
      >
        {Array.from({ length: segments }, (_, i) => {
          const isCompleted = i < completed;
          return (
            <div
              key={i}
              style={{
                width: config.segmentWidth,
                height: config.height,
                borderRadius: config.borderRadius,
                backgroundColor: isCompleted ? '#0BAA4F' : '#DDE3EE',
                transition: 'background 0.3s ease',
              }}
            />
          );
        })}
      </div>
    );
  }
);

SegmentedProgress.displayName = 'SegmentedProgress';