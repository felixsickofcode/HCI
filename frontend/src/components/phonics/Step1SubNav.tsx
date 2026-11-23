import React from 'react';

export interface Step1SubNavProps {
  sounds: Array<{ symbol: string; type: 'consonant' | 'vowel' }>;
  activeIndex: number; // 0..3 for sounds, 4 for "Dấu thanh"
  viewedTabs: number[]; // indices that have been viewed
  onSelectTab: (index: number) => void;
  className?: string;
}

export const Step1SubNav: React.FC<Step1SubNavProps> = ({
  sounds,
  activeIndex,
  viewedTabs,
  onSelectTab,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between shrink-0 mb-3 select-none ${className}`}>
      <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full shadow-xs">
        <span className="text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider mr-1">
          Các âm bài 01:
        </span>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Danh sách âm và dấu thanh Bài 01">
          {sounds.map((sound, index) => {
            const isCurrent = activeIndex === index;
            const isViewed = viewedTabs.includes(index) && !isCurrent;

            return (
              <button
                key={sound.symbol}
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Âm ${sound.symbol} (${sound.type === 'vowel' ? 'Nguyên âm' : 'Phụ âm'})`}
                type="button"
                onClick={() => onSelectTab(index)}
                className={`transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'h-7 px-3 rounded-full bg-primary text-on-primary text-xs font-headline font-bold shadow-sm gap-1.5'
                    : 'w-7 h-7 rounded-full text-xs font-headline font-bold relative hover:bg-surface-container-high ' +
                      (isViewed
                        ? 'bg-surface-container text-on-surface'
                        : 'bg-surface-container-high text-on-surface-variant')
                }`}
              >
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-on-primary shrink-0" />}
                <span>{sound.symbol}</span>
                {isViewed && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-600" title="Đã xem" />
                )}
              </button>
            );
          })}

          {/* Tab 5: Dấu thanh */}
          {(() => {
            const isCurrent = activeIndex === sounds.length;
            const isViewed = viewedTabs.includes(sounds.length) && !isCurrent;

            return (
              <button
                role="tab"
                aria-selected={isCurrent}
                aria-label="Dấu thanh tiếng Việt"
                type="button"
                onClick={() => onSelectTab(sounds.length)}
                className={`transition-all flex items-center justify-center relative ${
                  isCurrent
                    ? 'h-7 px-3 rounded-full bg-primary text-on-primary text-xs font-label font-semibold shadow-sm gap-1.5'
                    : 'h-7 px-2.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface text-[11px] font-label font-medium'
                }`}
              >
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-on-primary shrink-0" />}
                <span>Dấu thanh</span>
                {isViewed && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-600" title="Đã xem" />
                )}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
