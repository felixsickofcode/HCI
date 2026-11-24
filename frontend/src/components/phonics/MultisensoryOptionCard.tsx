import React from 'react';
import type { MultisensoryOption } from '../../types/phonics';

export interface MultisensoryOptionCardProps {
  option: MultisensoryOption;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const MultisensoryOptionCard: React.FC<MultisensoryOptionCardProps> = ({
  option,
  isSelected = false,
  onSelect,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl p-4 transition-all text-left flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        isSelected
          ? 'bg-blue-50/40 border-2 border-primary shadow-xs'
          : 'bg-white border border-[#E8E4DD] hover:border-primary/50 hover:bg-blue-50/20'
      } ${className}`}
      aria-pressed={isSelected}
    >
      <div className="flex items-center gap-3.5 pr-2">
        {/* Option Letter Tag (A, B, C) */}
        <span
          className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-xs font-semibold transition-colors ${
            isSelected
              ? 'bg-primary text-white'
              : 'bg-stone-100 text-stone-700 group-hover:bg-primary group-hover:text-white'
          }`}
        >
          {option.key}
        </span>

        {/* Option Description Text */}
        <span
          className={`text-[14px] leading-relaxed ${
            isSelected ? 'text-stone-900 font-semibold' : 'text-stone-800 font-medium'
          }`}
        >
          {option.text}
        </span>
      </div>

      {/* Radio or Check Circle Icon */}
      <span
        className={`material-symbols-outlined text-[20px] shrink-0 transition-colors ${
          isSelected ? 'text-primary' : 'text-stone-400 group-hover:text-primary'
        }`}
        style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
      </span>
    </button>
  );
};
