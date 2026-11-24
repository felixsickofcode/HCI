import React from 'react';
import { SOUND_COLORS, type KeywordData, type SoundType } from '../../types/phonics';
import { Button, Card } from '../common';

export interface KeywordCardProps {
  keyword: KeywordData;
  soundType: SoundType;
  isPlaying?: boolean;
  onPlayAudio?: () => void;
  tip?: string;
  className?: string;
}

export const KeywordCard: React.FC<KeywordCardProps> = ({
  keyword,
  soundType,
  isPlaying = false,
  onPlayAudio,
  tip,
  className = '',
}) => {
  const color = SOUND_COLORS[soundType] || SOUND_COLORS.consonant;
  const lead = keyword.leadSymbol || keyword.word.charAt(0);
  const rest = keyword.word.slice(lead.length);

  return (
    <Card hoverable={false} className={`p-5 sm:p-6 border border-outline-variant/30 flex flex-col items-center gap-4 ${className}`}>
      <div className="flex items-center gap-5 w-full">
        {/* Keyword Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-amber-50/60 p-2 border border-amber-100/80 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          {keyword.image ? (
            <img
              src={keyword.image}
              alt={keyword.word}
              className="w-full h-full object-contain select-none"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-4xl" aria-label={keyword.word}>
              Aa
            </span>
          )}
        </div>

        {/* Word Display with highlighted lead letter */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant font-semibold">
            Từ khoá minh hoạ
          </span>
          <div className="text-3xl sm:text-4xl font-headline font-bold text-on-surface mt-1 flex items-baseline gap-0.5">
            <span style={{ color: color.text }}>{lead}</span>
            <span>{rest}</span>
          </div>

          {onPlayAudio && (
            <Button
              onClick={onPlayAudio}
              variant="ghost"
              aria-label={`Nghe phát âm từ ${keyword.word}`}
              icon={isPlaying ? 'graphic_eq' : 'volume_up'}
              iconPosition="left"
              size="sm"
              className="mt-2.5 self-start text-primary hover:text-primary-container"
            >
              {isPlaying ? 'Đang phát...' : 'Nghe từ'}
            </Button>
          )}
        </div>
      </div>

      {/* Tip vận động */}
      {tip && (
        <div className="w-full pt-3 border-t border-surface-container-high flex items-start gap-2.5 text-xs font-label text-on-surface-variant leading-relaxed">
          <span
            className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            tips_and_updates
          </span>
          <div>
            <strong className="text-on-surface font-semibold">Mẹo vận động: </strong>
            <span>{tip}</span>
          </div>
        </div>
      )}
    </Card>
  );
};
