import React from 'react';

export type FeedbackType = 'correct' | 'tryAgain' | 'info' | 'hint';

export interface FeedbackBannerProps {
  message: string;
  type?: FeedbackType;
  className?: string;
  onActionClick?: () => void;
  actionLabel?: string;
}

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  message,
  type = 'info',
  className = '',
  onActionClick,
  actionLabel,
}) => {
  if (!message) return null;

  const typeConfig: Record<FeedbackType, { bg: string; text: string; border: string; icon: string }> = {
    correct: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-300', icon: 'check_circle' },
    tryAgain: { bg: 'bg-amber-50', text: 'text-amber-950', border: 'border-amber-200', icon: 'hearing' },
    info: { bg: 'bg-surface-container-low', text: 'text-on-surface', border: 'border-outline-variant/40', icon: 'info' },
    hint: { bg: 'bg-blue-50', text: 'text-blue-950', border: 'border-blue-200', icon: 'lightbulb' },
  };
  const config = typeConfig[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-300 shadow-sm animate-fade-in ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
        {config.icon}
      </span>
      <span className="text-sm font-label font-medium leading-relaxed">{message}</span>
      {onActionClick && actionLabel && (
        <button type="button" onClick={onActionClick} className="ml-2 underline font-semibold text-xs hover:opacity-80">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
