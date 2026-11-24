import React from 'react';
import { SOUND_COLORS, type SoundType } from '../../types/phonics';

export interface LetterDisplayProps {
  letter: string;
  type: SoundType;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  highlighted?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export const LetterDisplay: React.FC<LetterDisplayProps> = ({
  letter,
  type,
  size = 'hero',
  highlighted = false,
  interactive = false,
  onClick,
  className = '',
  ariaLabel,
}) => {
  const color = SOUND_COLORS[type] || SOUND_COLORS.consonant;

  // Responsive font sizes to ensure fit within 1366x768 without vertical scrolling
  const sizeClasses = {
    sm: 'text-2xl sm:text-3xl min-w-[48px] min-h-[48px] px-3 py-1.5',
    md: 'text-4xl sm:text-5xl min-w-[72px] min-h-[72px] px-5 py-2.5',
    lg: 'text-6xl sm:text-7xl min-w-[96px] min-h-[96px] px-6 py-4',
    hero: 'text-[clamp(140px,18vh,220px)] leading-none select-none py-2 px-8',
  };

  const Component = interactive || onClick ? 'button' : 'div';

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      onClick={onClick}
      disabled={Component === 'button' && !interactive && !onClick}
      aria-label={ariaLabel || `Chữ cái ${letter}, loại ${type === 'consonant' ? 'phụ âm' : 'nguyên âm'}`}
      className={`inline-flex items-center justify-center font-bold tracking-tight rounded-3xl transition-all duration-300 ${
        sizeClasses[size]
      } ${
        interactive
          ? 'cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-4'
          : ''
      } ${
        highlighted
          ? 'scale-105 shadow-lg'
          : ''
      } ${className}`}
      style={{
        color: color.text,
        fontFamily: "'Lexend', sans-serif",
        boxShadow: highlighted ? `0 0 24px ${color.glow}` : undefined,
        borderColor: highlighted ? color.border : undefined,
      }}
    >
      <span className="leading-none">{letter}</span>
    </Component>
  );
};
