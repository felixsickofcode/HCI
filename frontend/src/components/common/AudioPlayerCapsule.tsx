import React from 'react';
import type { BoundaryReliability, SpeechStatus } from '../../lib/speech';

export interface AudioPlayerCapsuleProps {
  status: SpeechStatus;
  reliability: BoundaryReliability;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  hasVietnameseVoice: boolean;
  rate: number;
  errorMessage?: string;
  progressLabel?: string;
  title?: string;
  className?: string;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateCycle: () => void;
  onVoiceChange: (voiceURI: string) => void;
}

const STATUS_LABEL: Record<SpeechStatus, string> = {
  idle: 'Sẵn sàng đọc',
  speaking: 'Đang đọc...',
  paused: 'Đã tạm dừng',
  stopped: 'Đã dừng',
  ended: 'Đã đọc xong',
  unsupported: 'Không hỗ trợ giọng đọc',
  error: 'Lỗi giọng đọc',
};

export const AudioPlayerCapsule: React.FC<AudioPlayerCapsuleProps> = ({
  status,
  reliability,
  voices,
  selectedVoiceURI,
  hasVietnameseVoice,
  rate,
  errorMessage,
  progressLabel,
  title = 'Giọng đọc AI',
  className = '',
  onPlay,
  onPause,
  onResume,
  onStop,
  onRateCycle,
  onVoiceChange,
}) => {
  const isSpeaking = status === 'speaking';
  const isPaused = status === 'paused';
  const disabledControls = status === 'unsupported';
  const canPlay = !disabledControls && !isSpeaking && !isPaused;
  const showVoiceWarning = !disabledControls && voices.length > 0 && !hasVietnameseVoice;
  const showBoundaryWarning = reliability === 'unreliable';

  return (
    <div
      className={`rounded-2xl bg-white/80 backdrop-blur-sm border border-black/[0.06] p-3 sm:p-3.5 flex flex-col gap-3 text-on-surface select-none shadow-[0_10px_30px_rgba(27,28,29,0.06)] transition-all duration-300 hover:shadow-[0_14px_34px_rgba(27,28,29,0.09)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label={isSpeaking ? 'Tạm dừng đọc' : isPaused ? 'Tiếp tục đọc' : 'Nghe đọc bài viết'}
            onClick={isSpeaking ? onPause : isPaused ? onResume : onPlay}
            disabled={disabledControls}
            className={`w-11 h-11 shrink-0 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center shadow-[0_5px_14px_rgba(9,76,178,0.28)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isSpeaking ? 'ring-2 ring-primary/20' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSpeaking ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            aria-label="Dừng đọc"
            onClick={onStop}
            disabled={disabledControls || (!isSpeaking && !isPaused)}
            className="w-9 h-9 shrink-0 rounded-full bg-surface-container-highest/60 hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">stop</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-label font-medium text-on-surface flex items-center gap-1.5 truncate">
              {title}
              {isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              )}
            </span>
            <span className="text-[11px] font-label text-on-surface-variant font-normal" aria-live="polite">
              {STATUS_LABEL[status]}
              {progressLabel ? ` · ${progressLabel}` : ''}
            </span>
          </div>
        </div>

        {/* Animated Waveform Simulation */}
        <div className="hidden sm:flex items-center gap-1 h-5 px-3 shrink-0" aria-hidden="true">
          <span
            className={`w-[2.5px] bg-primary/40 rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-3 animate-pulse' : 'h-2'
            }`}
          />
          <span
            className={`w-[2.5px] bg-primary/60 rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-5 animate-pulse' : 'h-3.5'
            }`}
          />
          <span
            className={`w-[2.5px] bg-primary rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-4 animate-pulse' : 'h-5'
            }`}
          />
          <span
            className={`w-[2.5px] bg-primary/70 rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-5 animate-pulse' : 'h-3'
            }`}
          />
          <span
            className={`w-[2.5px] bg-primary/30 rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-3.5 animate-pulse' : 'h-2'
            }`}
          />
          <span
            className={`w-[2.5px] bg-primary/50 rounded-full transition-all duration-200 ${
              isSpeaking ? 'h-4 animate-pulse' : 'h-3'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRateCycle}
            disabled={disabledControls}
            aria-label={`Đổi tốc độ đọc, hiện tại ${rate.toFixed(1)} lần`}
            className="px-2.5 py-1 rounded bg-surface-container-highest/60 hover:bg-surface-container-highest text-[11px] font-label font-medium text-on-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rate.toFixed(1)}x
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="speech-voice" className="text-[11px] font-label font-medium text-on-surface-variant">
          Giọng đọc
        </label>
        <select
          id="speech-voice"
          value={selectedVoiceURI}
          onChange={(event) => onVoiceChange(event.target.value)}
          disabled={disabledControls || voices.length === 0}
          className="flex-1 min-w-[180px] rounded bg-surface-container-highest/60 hover:bg-surface-container-highest text-[11px] font-label text-on-surface px-2 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {voices.length === 0 ? (
            <option value="">Đang tải giọng đọc...</option>
          ) : (
            voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.lang.toLowerCase().startsWith('vi')
                  ? `${voice.name} (${voice.lang})`
                  : voice.name}
              </option>
            ))
          )}
        </select>
        {canPlay && (
          <span className="text-[11px] font-label text-on-surface-variant">
            Đổi tốc độ/giọng sẽ đọc lại từ vị trí hiện tại
          </span>
        )}
      </div>

      {showVoiceWarning && (
        <p role="status" className="text-[11px] font-label text-tertiary bg-tertiary-fixed/30 px-2.5 py-1.5 rounded">
          Không tìm thấy giọng tiếng Việt (vi-VN) — đang dùng giọng mặc định của trình duyệt.
        </p>
      )}

      {showBoundaryWarning && (
        <p role="status" className="text-[11px] font-label text-error bg-error-container/50 px-2.5 py-1.5 rounded">
          Trình duyệt không hỗ trợ tô sáng theo từng từ (word boundary) đáng tin cậy — chỉ phát giọng đọc, không tô sáng theo đoạn.
        </p>
      )}

      {status === 'unsupported' && (
        <p role="alert" className="text-[11px] font-label text-error bg-error-container/50 px-2.5 py-1.5 rounded">
          Trình duyệt không hỗ trợ đọc thành tiếng (Web Speech API). Không thể phát giọng đọc và tô sáng theo từ.
        </p>
      )}

      {status === 'error' && errorMessage && (
        <p role="alert" className="text-[11px] font-label text-error bg-error-container/50 px-2.5 py-1.5 rounded">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
