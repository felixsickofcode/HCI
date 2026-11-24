import React, { useEffect, useState, useCallback } from 'react';
import type { ListenAndChooseItem, SoundType } from '../../types/phonics';
import { Button, FeedbackBanner } from '../common';
import { LetterDisplay } from './LetterDisplay';

interface ListenAndChooseRoundProps {
  roundIndex: number;
  totalRounds: number;
  item: ListenAndChooseItem;
  soundSymbol: string;
  soundReadAs: string;
  soundType: SoundType;
  onPlayTargetAudio: () => void;
  onRoundSolved: () => void;
  onNextRound: () => void;
  isLastRound: boolean;
}

const ListenAndChooseRound: React.FC<ListenAndChooseRoundProps> = ({
  roundIndex,
  totalRounds,
  item,
  soundSymbol,
  soundReadAs,
  soundType,
  onPlayTargetAudio,
  onRoundSolved,
  onNextRound,
  isLastRound,
}) => {
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [dimmedOptions, setDimmedOptions] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'correct' | 'tryAgain' | 'hint' } | null>(null);

  const target = item?.target || soundSymbol;

  // Auto-play sound on round mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onPlayTargetAudio();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [onPlayTargetAudio]);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (isCorrect) return;

      if (option === target) {
        setIsCorrect(true);
        setFeedback({
          type: 'correct',
          message: `Đúng rồi! Đây là âm ${soundReadAs}.`,
        });
        onPlayTargetAudio();
        onRoundSolved();
      } else {
        setDimmedOptions((prev) => (prev.includes(option) ? prev : [...prev, option]));
        const nextAttempts = incorrectAttempts + 1;
        setIncorrectAttempts(nextAttempts);

        if (nextAttempts >= 2) {
          setFeedback({
            type: 'hint',
            message: 'Chưa đúng, mình nghe lại nhé. (Gợi ý: chú ý thẻ có viền sáng nhẹ)',
          });
        } else {
          setFeedback({
            type: 'tryAgain',
            message: 'Chưa đúng, mình nghe lại nhé.',
          });
        }

        window.setTimeout(() => {
          onPlayTargetAudio();
        }, 500);
      }
    },
    [incorrectAttempts, isCorrect, onPlayTargetAudio, onRoundSolved, soundReadAs, target]
  );

  // Keyboard navigation 1, 2, 3
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === '1' && item?.options[0]) handleSelectOption(item.options[0]);
      if (e.key === '2' && item?.options[1]) handleSelectOption(item.options[1]);
      if (e.key === '3' && item?.options[2]) handleSelectOption(item.options[2]);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectOption, item]);

  const showHint = incorrectAttempts >= 2;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto select-none">
      {/* Round & Prompt Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <span className="text-xs font-label uppercase tracking-widest text-primary font-semibold">
          Lượt {roundIndex + 1} / {totalRounds}
        </span>
        <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">
          Lắng nghe và chọn thẻ chữ cái tương ứng
        </h3>
        <p className="text-xs font-label text-on-surface-variant">
          Nhấp vào thẻ hoặc bấm phím số <strong>1, 2, 3</strong> trên bàn phím.
        </p>

        {/* Replay Sound Button */}
        <Button
          onClick={onPlayTargetAudio}
          variant="secondary"
          icon="volume_up"
          iconPosition="left"
          size="md"
          className="mt-2"
        >
          Nghe lại âm
        </Button>
      </div>

      {/* 3 Choice Cards */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6 w-full max-w-xl">
        {item.options.map((opt, index) => {
          const isTarget = opt === target;
          const isSelectedCorrect = isCorrect && isTarget;
          const isDimmed = dimmedOptions.includes(opt);
          const isHinted = showHint && isTarget && !isCorrect;

          return (
            <button
              key={`${roundIndex}-${opt}-${index}`}
              type="button"
              disabled={isCorrect}
              onClick={() => handleSelectOption(opt)}
              aria-label={`Lựa chọn ${index + 1}: Chữ ${opt}`}
              className={`group relative p-4 sm:p-6 rounded-3xl bg-surface-container-lowest border-2 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/25 ${
                isSelectedCorrect
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400'
                  : isDimmed
                  ? 'opacity-35 border-transparent grayscale hover:opacity-60'
                  : isHinted
                  ? 'border-primary/60 bg-blue-50/50 shadow-md animate-pulse ring-2 ring-primary/30'
                  : 'border-outline-variant/30 hover:border-primary/60 hover:shadow-card-hover active:scale-98'
              }`}
            >
              <span className="absolute top-3 left-3 text-[11px] font-label font-bold text-outline w-5 h-5 rounded-full bg-surface-container-low flex items-center justify-center">
                {index + 1}
              </span>

              {isSelectedCorrect && (
                <span className="absolute top-3 right-3 material-symbols-outlined text-emerald-600 text-[22px] animate-scale-in" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
              )}

              <div className="my-2">
                <LetterDisplay
                  letter={opt}
                  type={opt === target ? soundType : 'consonant'}
                  size="lg"
                  className="pointer-events-none"
                />
              </div>

              <span className="text-xs font-label text-on-surface-variant font-medium mt-1">
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Gentle Feedback Banner */}
      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          message={feedback.message}
          className="mt-2"
        />
      )}

      {/* Next Round Button when correct */}
      {isCorrect && !isLastRound && (
        <Button
          onClick={onNextRound}
          variant="primary-solid"
          icon="arrow_forward"
          iconPosition="right"
          size="lg"
          className="mt-2 animate-fade-in"
        >
          Sang lượt tiếp theo
        </Button>
      )}

      {isCorrect && isLastRound && (
        <Button
          onClick={onNextRound}
          variant="primary-solid"
          icon="check_circle"
          iconPosition="left"
          size="lg"
          className="mt-2 animate-fade-in"
        >
          Hoàn thành nghe và chọn
        </Button>
      )}
    </div>
  );
};

export interface ListenAndChooseProps {
  items: ListenAndChooseItem[];
  soundSymbol: string;
  soundReadAs: string;
  soundType: SoundType;
  onPlayTargetAudio: () => void;
  onRoundComplete?: (round: number) => void;
  onAllRoundsCompleted?: () => void;
  className?: string;
}

export const ListenAndChoose: React.FC<ListenAndChooseProps> = ({
  items,
  soundSymbol,
  soundReadAs,
  soundType,
  onPlayTargetAudio,
  onRoundComplete,
  onAllRoundsCompleted,
  className = '',
}) => {
  const [currentRound, setCurrentRound] = useState(0);

  const handleNextRound = () => {
    if (currentRound + 1 < items.length) {
      setCurrentRound((r) => r + 1);
    } else {
      onAllRoundsCompleted?.();
    }
  };

  const currentItem = items[currentRound] || items[0];

  return (
    <div className={className}>
      <ListenAndChooseRound
        key={currentRound}
        roundIndex={currentRound}
        totalRounds={items.length}
        item={currentItem}
        soundSymbol={soundSymbol}
        soundReadAs={soundReadAs}
        soundType={soundType}
        onPlayTargetAudio={onPlayTargetAudio}
        onRoundSolved={() => onRoundComplete?.(currentRound + 1)}
        onNextRound={handleNextRound}
        isLastRound={currentRound + 1 === items.length}
      />
    </div>
  );
};
