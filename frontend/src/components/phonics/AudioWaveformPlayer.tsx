import React from 'react';

export interface AudioWaveformPlayerProps {
  title: string;
  subtitle: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  className?: string;
}

export const AudioWaveformPlayer: React.FC<AudioWaveformPlayerProps> = ({
  title,
  subtitle,
  isPlaying = false,
  onPlay,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E4DD] ${className}`}
    >
      <div className="flex items-center gap-3.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={onPlay}
          className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center shadow-xs hover:bg-primary-container transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          title={isPlaying ? 'Dừng âm thanh' : 'Phát âm thanh chuẩn'}
          aria-label={isPlaying ? 'Dừng âm thanh' : 'Phát âm thanh chuẩn'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPlaying ? 'pause' : 'volume_up'}
          </span>
        </button>

        <div>
          <p className="text-[14px] font-semibold text-stone-900">{title}</p>
          <p className="text-xs text-stone-500 font-label mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Flat stylized waveform equalizer bars */}
      <div
        className="flex items-end gap-1 h-7 px-3 py-1 bg-white rounded-lg border border-[#E8E4DD] shrink-0 select-none"
        aria-hidden="true"
      >
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-3 bg-primary/70 animate-pulse' : 'h-2 bg-stone-300'
          }`}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-5 bg-primary animate-pulse' : 'h-3 bg-stone-300'
          }`}
          style={{ animationDelay: '150ms' }}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-6 bg-primary animate-pulse' : 'h-4 bg-stone-400'
          }`}
          style={{ animationDelay: '300ms' }}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-4 bg-primary/80 animate-pulse' : 'h-2 bg-stone-300'
          }`}
          style={{ animationDelay: '200ms' }}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-2 bg-primary/50 animate-pulse' : 'h-1 bg-stone-200'
          }`}
          style={{ animationDelay: '400ms' }}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-5 bg-primary animate-pulse' : 'h-3 bg-stone-300'
          }`}
          style={{ animationDelay: '100ms' }}
        />
        <span
          className={`w-1 rounded-full transition-all duration-300 ${
            isPlaying ? 'h-3 bg-primary/60 animate-pulse' : 'h-2 bg-stone-300'
          }`}
          style={{ animationDelay: '250ms' }}
        />
      </div>
    </div>
  );
};
