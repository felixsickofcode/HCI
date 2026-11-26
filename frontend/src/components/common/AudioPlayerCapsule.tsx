import React from 'react';
import type { BoundaryReliability, SpeechStatus } from '../../lib/speech';

export interface AudioPlayerCapsuleProps {
  status: SpeechStatus;
  reliability: BoundaryReliability;
  voices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  hasVietnameseVoice: boolean;
  voicesLoading?: boolean;
  rate: number;
  errorMessage?: string;
  progressLabel?: string;
  title?: string;
  className?: string;
  trailing?: React.ReactNode;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRateCycle: () => void;
  onVoiceChange: (voiceURI: string) => void;
}

const STATUS_LABEL: Record<SpeechStatus, string> = {
  idle: 'Sẵn sàng đọc',
  speaking: 'Đang đọc',
  paused: 'Tạm dừng',
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
  voicesLoading = false,
  rate,
  errorMessage,
  progressLabel,
  title = 'Giọng đọc AI',
  className = '',
  trailing,
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
  const showVoiceWarning = !disabledControls && voices.length > 0 && !hasVietnameseVoice;
  const showBoundaryWarning = reliability === 'unreliable';
  const showStatusPill = isSpeaking || isPaused || status === 'ended';

  return (
    <div
      className={`rounded-2xl px-2.5 py-2 flex flex-col gap-2 select-none font-label transition-colors duration-200 ${className}`}
      style={{
        backgroundColor: 'var(--reader-surface-bg, #F2E3C2)',
        border: '1px solid var(--reader-border, #DFCFA9)',
        color: 'var(--reader-fg, #222222)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <button
            type="button"
            aria-label={isSpeaking ? 'Tạm dừng đọc' : isPaused ? 'Tiếp tục đọc' : 'Nghe đọc bài viết'}
            title={title}
            onClick={isSpeaking ? onPause : isPaused ? onResume : onPlay}
            disabled={disabledControls}
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--reader-accent, #1556B8)',
              color: 'var(--reader-accent-fg, #FAF6EE)',
            }}
          >
            <span className="material-symbols-outlined text-[19px]">
              {isSpeaking ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            type="button"
            aria-label="Dừng đọc"
            onClick={onStop}
            disabled={disabledControls || (!isSpeaking && !isPaused)}
            className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--reader-hover-bg, #EADBB9)',
              color: 'var(--reader-secondary-text, #50452E)',
            }}
          >
            <span className="material-symbols-outlined text-[14px]">stop</span>
          </button>

          {isSpeaking && (
            <div className="hidden sm:flex items-center gap-[3px] h-4 px-1 shrink-0" aria-hidden="true">
              <span className="w-[2.5px] h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--reader-accent, #1556B8)', opacity: 0.55 }} />
              <span className="w-[2.5px] h-4 rounded-full animate-pulse" style={{ backgroundColor: 'var(--reader-accent, #1556B8)' }} />
              <span className="w-[2.5px] h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--reader-accent, #1556B8)', opacity: 0.75 }} />
              <span className="w-[2.5px] h-3.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--reader-accent, #1556B8)', opacity: 0.6 }} />
            </div>
          )}

          <span className="sr-only" aria-live="polite">
            {STATUS_LABEL[status]}
            {progressLabel ? ` · ${progressLabel}` : ''}
          </span>

          {showStatusPill && (
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold"
              style={{
                backgroundColor: 'var(--reader-accent-soft, #E3ECFA)',
                color: 'var(--reader-active-fg, #1556B8)',
              }}
            >
              {isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'currentColor' }} />
              )}
              {progressLabel || STATUS_LABEL[status]}
            </span>
          )}

          <label htmlFor="speech-voice" className="sr-only">
            Giọng đọc
          </label>
          <select
            id="speech-voice"
            value={selectedVoiceURI}
            onChange={(event) => onVoiceChange(event.target.value)}
            disabled={disabledControls || voices.length === 0}
            title="Chọn giọng đọc (đổi tốc độ hoặc giọng sẽ đọc lại từ vị trí hiện tại)"
            className="min-w-[118px] max-w-[156px] truncate rounded-lg text-[11.5px] font-medium px-2 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--reader-control-bg, #FAF0DA)',
              border: '1px solid var(--reader-border, #DFCFA9)',
              color: 'var(--reader-fg, #222222)',
            }}
          >
            {voices.length === 0 ? (
              <option value="">
                {voicesLoading ? 'Đang tải giọng đọc...' : 'Không có giọng đọc'}
              </option>
            ) : (
              voices.map((voice) => (
                <option
                  key={voice.voiceURI}
                  value={voice.voiceURI}
                  style={{
                    backgroundColor: 'var(--reader-panel-bg, #F5E8CB)',
                    color: 'var(--reader-fg, #222222)',
                  }}
                >
                  {voice.lang.toLowerCase().startsWith('vi')
                    ? `${voice.name} (${voice.lang})`
                    : voice.name}
                </option>
              ))
            )}
          </select>

          {showVoiceWarning && (
            <span
              role="status"
              title="Không tìm thấy giọng tiếng Việt (vi-VN) — đang dùng giọng mặc định của trình duyệt."
              className="inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: 'var(--reader-warning-bg, #EAD7A1)',
                color: 'var(--reader-warning-fg, #594108)',
                border: '1px solid var(--reader-warning-border, #D4BC7D)',
              }}
            >
              ! Thiếu vi-VN
            </span>
          )}

          <button
            type="button"
            onClick={onRateCycle}
            disabled={disabledControls}
            aria-label={`Đổi tốc độ đọc, hiện tại ${rate.toFixed(1)} lần`}
            title="Bấm để đổi tốc độ đọc (đọc lại từ vị trí hiện tại)"
            className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--reader-hover-bg, #EADBB9)',
              color: 'var(--reader-fg, #222222)',
            }}
          >
            {rate.toFixed(1)}x
          </button>
        </div>

        {trailing && (
          <div className="flex flex-wrap items-center gap-2">
            {trailing}
          </div>
        )}
      </div>

      {showBoundaryWarning && (
        <p
          role="status"
          className="text-[11.5px] px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'var(--reader-error-bg, #F6D9D5)',
            color: 'var(--reader-error-fg, #8F1D1D)',
          }}
        >
          Trình duyệt không hỗ trợ tô sáng theo từng từ (word boundary) đáng tin cậy — chỉ phát giọng đọc, không tô sáng theo đoạn.
        </p>
      )}

      {status === 'unsupported' && (
        <p
          role="alert"
          className="text-[11.5px] px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'var(--reader-error-bg, #F6D9D5)',
            color: 'var(--reader-error-fg, #8F1D1D)',
          }}
        >
          Trình duyệt không hỗ trợ đọc thành tiếng (Web Speech API). Không thể phát giọng đọc và tô sáng theo từ.
        </p>
      )}

      {status === 'error' && errorMessage && (
        <p
          role="alert"
          className="text-[11.5px] px-2.5 py-1.5 rounded-lg"
          style={{
            backgroundColor: 'var(--reader-error-bg, #F6D9D5)',
            color: 'var(--reader-error-fg, #8F1D1D)',
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};
