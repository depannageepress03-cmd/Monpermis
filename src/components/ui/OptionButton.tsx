import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type OptionButtonState = 'default' | 'selected' | 'correct' | 'incorrect';

export interface OptionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  letter: string;
  state?: OptionButtonState;
  onSelect?: () => void;
  className?: string;
}

export const OptionButton = forwardRef<HTMLButtonElement, OptionButtonProps>(
  ({
    letter,
    state = 'default',
    onSelect,
    className = '',
    style,
    children,
    disabled,
    ...props
  }, ref) => {
    const isSelected = state === 'selected';
    const isCorrect = state === 'correct';
    const isIncorrect = state === 'incorrect';
    const isDisabled = disabled || isCorrect || isIncorrect;

    const baseStyles: React.CSSProperties = {
      minHeight: 58,
      borderRadius: 22,
      padding: '8px 14px 8px 8px',
      fontFamily: 'inherit',
      textAlign: 'left',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'background 0.2s ease, border 0.2s ease, color 0.2s ease',
      width: '100%',
      ...style,
    };

    const stateStyles: Record<OptionButtonState, React.CSSProperties> = {
      default: {
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E1E6EF',
        color: '#0A1B3D',
      },
      selected: {
        backgroundColor: '#0A1B3D',
        border: '1.5px solid #0A1B3D',
        color: '#FFFFFF',
      },
      correct: {
        backgroundColor: '#EAF7EF',
        border: '2px solid #0BAA4F',
        color: '#067A37',
      },
      incorrect: {
        backgroundColor: '#FFF1E6',
        border: '2px solid #C2410C',
        color: '#C2410C',
      },
    };

    const letterStyles: React.CSSProperties = {
      width: 40,
      height: 40,
      flexShrink: 0,
      borderRadius: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Sora, sans-serif',
      fontWeight: 800,
      fontSize: 14,
    };

    const letterStateStyles: Record<OptionButtonState, React.CSSProperties> = {
      default: { backgroundColor: '#F1F4F9', color: '#0A1B3D' },
      selected: { backgroundColor: '#FFB400', color: '#0A1B3D' },
      correct: { backgroundColor: '#0BAA4F', color: '#FFFFFF' },
      incorrect: { backgroundColor: '#C2410C', color: '#FFFFFF' },
    };

    return (
      <button
        ref={ref}
        className={`option-btn ${className}`}
        style={{
          ...baseStyles,
          ...stateStyles[state],
        }}
        onClick={onSelect}
        disabled={isDisabled}
        aria-pressed={isSelected}
        {...props}
      >
        <span
          style={{
            ...letterStyles,
            ...letterStateStyles[state],
          }}
        >
          {letter}
        </span>
        <span style={{ flexGrow: 1, fontSize: 14.5, fontWeight: 700 }}>
          {children}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800 }}>
          {isCorrect && '✓ Correct'}
          {isIncorrect && '✕ Ta réponse'}
        </span>
      </button>
    );
  }
);

OptionButton.displayName = 'OptionButton';