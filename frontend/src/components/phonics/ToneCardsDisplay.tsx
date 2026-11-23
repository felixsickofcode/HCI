import React from 'react';

export interface ToneItem {
  name: string;
  example: string;
  audio: string;
}

export interface ToneCardsDisplayProps {
  tones: ToneItem[];
  onPlayTone: (audioUrl: string) => void;
  isPlaying?: boolean;
  activeUrl?: string | null;
  className?: string;
}

const TONE_SYMBOLS: Record<string, string> = {
  huyền: '̀',
  sắc: '́',
  hỏi: '̉',
  nặng: '̣',
  ngã: '̃',
};

export const ToneCardsDisplay: React.FC<ToneCardsDisplayProps> = ({
  tones,
  onPlayTone,
  isPlaying = false,
  activeUrl = null,
  className = '',
}) => {
  return (
    <div className={`h-full w-full flex flex-col justify-between p-6 select-none ${className}`}>
      <div className="text-center mb-4">
        <h2 className="text-xl font-headline font-bold text-on-surface">
          Làm quen 4 dấu thanh tiếng Việt
        </h2>
        <p className="text-xs font-label text-on-surface-variant mt-1">
          Bấm vào từng thẻ để lắng nghe thanh điệu và cách phát âm của từ ví dụ.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-stretch my-2">
        {tones.map((tone) => {
          const isCurrentPlaying = isPlaying && activeUrl === tone.audio;
          const mark = TONE_SYMBOLS[tone.name] || '';

          return (
            <button
              key={tone.name}
              type="button"
              onClick={() => onPlayTone(tone.audio)}
              aria-label={`Nghe dấu thanh ${tone.name}, từ ví dụ ${tone.example}`}
              className={`rounded-2xl border-2 p-5 flex flex-col items-center justify-between transition-all group text-center cursor-pointer ${
                isCurrentPlaying
                  ? 'border-primary bg-primary-fixed/20 shadow-md scale-[1.02]'
                  : 'border-surface-container-high bg-surface-container-lowest hover:border-primary/50 hover:shadow-sm'
              }`}
            >
              {/* Ký hiệu dấu thanh */}
              <div className="w-14 h-14 rounded-2xl bg-primary-fixed/30 flex items-center justify-center text-primary text-4xl font-bold">
                <span>{mark}</span>
              </div>

              {/* Tên dấu thanh */}
              <div className="my-2">
                <span className="text-xs uppercase font-label tracking-wider font-bold text-on-surface-variant">
                  Thanh
                </span>
                <h3 className="text-lg font-headline font-bold text-primary capitalize">
                  {tone.name}
                </h3>
              </div>

              {/* Từ ví dụ */}
              <div className="w-full py-2 px-3 rounded-xl bg-surface-container-low flex flex-col items-center">
                <span className="text-[11px] font-label text-outline">Ví dụ:</span>
                <span className="text-2xl font-headline font-bold text-on-surface mt-0.5">
                  {tone.example}
                </span>
              </div>

              {/* Nút nghe */}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">
                  {isCurrentPlaying ? 'volume_up' : 'play_circle'}
                </span>
                <span>{isCurrentPlaying ? 'Đang phát...' : 'Nghe âm'}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-xs text-outline font-label pt-2">
        Mẹo: Dấu thanh làm thay đổi cao độ của âm tiết mà không tạo ra âm vị mới.
      </div>
    </div>
  );
};
