import React, { useState, useEffect } from 'react';

export interface AudioPlayerCapsuleProps {
  initialDuration?: number; // in seconds
  title?: string;
  className?: string;
}

export const AudioPlayerCapsule: React.FC<AudioPlayerCapsuleProps> = ({
  initialDuration = 438, // 07:18
  title = 'Giọng đọc AI Trầm Ấm',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const speeds = [1.0, 1.2, 1.5, 0.8];
  const currentSpeed = speeds[speedIndex];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSeconds((prev) => (prev >= initialDuration ? 0 : prev + 1));
      }, 1000 / currentSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentSpeed, initialDuration]);

  const formatTime = (sec: number) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleToggleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % speeds.length);
  };

  const handleRewind = () => {
    setSeconds((prev) => Math.max(0, prev - 10));
  };

  return (
    <div
      className={`rounded-lg bg-surface-container-low p-2.5 sm:p-3 flex items-center justify-between gap-3 text-on-surface select-none shadow-sm transition-all duration-300 hover:bg-surface-container ${className}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? 'Tạm dừng đọc' : 'Nghe đọc bài viết'}
          onClick={handleTogglePlay}
          className={`w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center shadow-sm active:scale-95 transition-all ${
            isPlaying ? 'ring-2 ring-primary/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>
        <div className="flex flex-col">
          <span className="text-[12px] font-label font-medium text-on-surface flex items-center gap-1.5">
            {title}
            {isPlaying && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            )}
          </span>
          <span className="text-[11px] font-label text-on-surface-variant font-normal">
            {formatTime(seconds)} / {formatTime(initialDuration)}
          </span>
        </div>
      </div>

      {/* Animated Waveform Simulation */}
      <div className="hidden sm:flex items-center gap-1 h-5 px-3">
        <span
          className={`w-[2.5px] bg-primary/40 rounded-full transition-all duration-200 ${
            isPlaying ? 'h-3 animate-pulse' : 'h-2'
          }`}
        />
        <span
          className={`w-[2.5px] bg-primary/60 rounded-full transition-all duration-200 ${
            isPlaying ? 'h-5 animate-pulse' : 'h-3.5'
          }`}
        />
        <span
          className={`w-[2.5px] bg-primary rounded-full transition-all duration-200 ${
            isPlaying ? 'h-4 animate-pulse' : 'h-5'
          }`}
        />
        <span
          className={`w-[2.5px] bg-primary/70 rounded-full transition-all duration-200 ${
            isPlaying ? 'h-5 animate-pulse' : 'h-3'
          }`}
        />
        <span
          className={`w-[2.5px] bg-primary/30 rounded-full transition-all duration-200 ${
            isPlaying ? 'h-3.5 animate-pulse' : 'h-2'
          }`}
        />
        <span
          className={`w-[2.5px] bg-primary/50 rounded-full transition-all duration-200 ${
            isPlaying ? 'h-4 animate-pulse' : 'h-3'
          }`}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSpeed}
          className="px-2.5 py-1 rounded bg-surface-container-highest/60 hover:bg-surface-container-highest text-[11px] font-label font-medium text-on-surface transition-colors"
        >
          {currentSpeed.toFixed(1)}x
        </button>
        <button
          type="button"
          onClick={handleRewind}
          aria-label="Tua lại 10 giây"
          className="w-8 h-8 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">replay_10</span>
        </button>
      </div>
    </div>
  );
};
