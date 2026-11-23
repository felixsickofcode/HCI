import React from 'react';
import type { VisualLetterDetail } from '../../types/phonics';

export interface VisualLetterCardProps {
  letter: VisualLetterDetail;
  onPlaySound?: () => void;
  className?: string;
}

export const VisualLetterCard: React.FC<VisualLetterCardProps> = ({
  letter,
  onPlaySound,
  className = '',
}) => {
  const isRightBadge = letter.badgePosition === 'right';

  return (
    <div
      onClick={onPlaySound}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlaySound?.();
        }
      }}
      className={`relative bg-[#FAF8F5] rounded-xl p-6 flex flex-col items-center justify-center border border-[#E8E4DD]/80 transition-all hover:-translate-y-0.5 hover:border-primary/40 duration-200 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      aria-label={`${letter.title}, nhấp để nghe phát âm`}
    >
      {/* Category / Letter Header */}
      <span className="text-[11px] font-label uppercase tracking-widest font-bold mb-2 text-stone-500">
        {letter.title}
      </span>

      {/* Main Big Letter + Direction Indicator Pin */}
      <div className="relative my-2 w-36 h-36 flex items-center justify-center">
        <span className="text-8xl font-headline font-bold text-stone-900 select-none transform transition-transform duration-300 hover:scale-105">
          {letter.symbol}
        </span>

        {/* Direction Badge */}
        <div
          className={`absolute top-12 flex items-center gap-1 bg-white/95 px-2.5 py-1 rounded-md shadow-xs border text-[11px] font-semibold select-none ${
            isRightBadge ? '-right-2 sm:-right-4' : '-left-2 sm:-left-4'
          } ${letter.badgeColorClass}`}
        >
          <span className="material-symbols-outlined text-[14px]">{letter.badgeIcon}</span>
          <span>{letter.badgeText}</span>
        </div>
      </div>

      {/* Motor Direction Guidance Tip */}
      <p className="text-xs text-stone-500 font-label text-center mt-2 leading-relaxed">
        {letter.description}
      </p>
    </div>
  );
};
