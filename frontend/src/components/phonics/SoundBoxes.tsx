import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BlendingItem, BlendingPart } from '../../types/phonics';
import { Button, FeedbackBanner } from '../common';
import { LetterDisplay } from './LetterDisplay';

interface SoundBoxesWordProps {
  item: BlendingItem;
  wordIndex: number;
  totalWords: number;
  onPlayWordAudio: (url: string, onEnded?: () => void) => void;
  onPlayPartAudio: (url: string, onEnded?: () => void) => void;
  onNextWord: () => void;
  isLastWord: boolean;
}

const SoundBoxesWord: React.FC<SoundBoxesWordProps> = ({
  item,
  wordIndex,
  totalWords,
  onPlayWordAudio,
  onPlayPartAudio,
  onNextWord,
  isLastWord,
}) => {
  // Boxes state: 2 slots
  const [placedParts, setPlacedParts] = useState<(BlendingPart | null)[]>([null, null]);

  // Initial shuffled chips on shelf
  const [shelfChips, setShelfChips] = useState<BlendingPart[]>(() => {
    const partsCopy = [...item.parts];
    if (Math.random() > 0.5) {
      partsCopy.reverse();
    }
    return partsCopy;
  });

  const [selectedChipSymbol, setSelectedChipSymbol] = useState<string | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<number | 'both' | null>(null);
  const [isWordComplete, setIsWordComplete] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Dragging state with pointer
  const [draggingChip, setDraggingChip] = useState<BlendingPart | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const box0Ref = useRef<HTMLDivElement>(null);
  const box1Ref = useRef<HTMLDivElement>(null);

  // Play target word once on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onPlayWordAudio(item.audio);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [item.audio, onPlayWordAudio]);

  const handlePlaceChipIntoSlot = useCallback(
    (part: BlendingPart, slotIndex: number) => {
      const expectedPart = item.parts[slotIndex];

      if (part.symbol === expectedPart.symbol) {
        const nextPlaced = [...placedParts];
        nextPlaced[slotIndex] = part;
        setPlacedParts(nextPlaced);

        setShelfChips((prev) => prev.filter((p) => p.symbol !== part.symbol));
        setSelectedChipSymbol(null);

        onPlayPartAudio(part.audio);

        if (nextPlaced[0] !== null && nextPlaced[1] !== null) {
          setIsWordComplete(true);

          window.setTimeout(() => {
            setHighlightedSlot(0);
            onPlayPartAudio(nextPlaced[0]!.audio, () => {
              setHighlightedSlot(1);
              onPlayPartAudio(nextPlaced[1]!.audio, () => {
                setHighlightedSlot('both');
                onPlayWordAudio(item.audio, () => {
                  setFeedback(
                    `Giỏi lắm! ${nextPlaced[0]!.symbol} + ${nextPlaced[1]!.symbol} = ${item.word}.`
                  );
                });
              });
            });
          }, 450);
        }
      } else {
        setSelectedChipSymbol(null);
      }
    },
    [item.audio, item.parts, item.word, onPlayPartAudio, onPlayWordAudio, placedParts]
  );

  const handleBoxClick = (slotIndex: number) => {
    if (!selectedChipSymbol || placedParts[slotIndex] !== null) return;
    const chip = shelfChips.find((c) => c.symbol === selectedChipSymbol);
    if (chip) {
      handlePlaceChipIntoSlot(chip, slotIndex);
    }
  };

  const handlePointerDown = (e: React.PointerEvent, chip: BlendingPart) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingChip(chip);
    setPointerPos({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingChip) return;
    setDragOffset((prev) => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
    setPointerPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    if (!draggingChip) return;

    const b0 = box0Ref.current?.getBoundingClientRect();
    const b1 = box1Ref.current?.getBoundingClientRect();

    let droppedSlot: number | null = null;
    if (b0 && pointerPos.x >= b0.left && pointerPos.x <= b0.right && pointerPos.y >= b0.top && pointerPos.y <= b0.bottom) {
      droppedSlot = 0;
    } else if (b1 && pointerPos.x >= b1.left && pointerPos.x <= b1.right && pointerPos.y >= b1.top && pointerPos.y <= b1.bottom) {
      droppedSlot = 1;
    }

    if (droppedSlot !== null && placedParts[droppedSlot] === null) {
      handlePlaceChipIntoSlot(draggingChip, droppedSlot);
    }

    setDraggingChip(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto select-none">
      {/* Target Word & Instructions */}
      <div className="flex flex-col items-center text-center gap-2">
        <span className="text-xs font-label uppercase tracking-widest text-primary font-semibold">
          Từ {wordIndex + 1} / {totalWords}
        </span>
        <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">
          Ghép các âm vào ô để tạo thành tiếng &quot;{item.word}&quot;
        </h3>
        <p className="text-xs font-label text-on-surface-variant max-w-md">
          Kéo thả chip chữ vào ô, hoặc nhấp vào chip rồi nhấp vào ô trống (hoặc dùng phím Tab và Enter).
        </p>

        {/* Listen Word Button */}
        <Button
          onClick={() => onPlayWordAudio(item.audio)}
          variant="secondary"
          icon="volume_up"
          iconPosition="left"
          size="md"
          className="mt-1"
        >
          Phát lại từ: &quot;{item.word}&quot;
        </Button>
      </div>

      {/* 2 Elkonin Boxes */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 my-2 w-full max-w-md">
        {[0, 1].map((slotIdx) => {
          const placed = placedParts[slotIdx];
          const isSlotHighlighted =
            highlightedSlot === slotIdx || highlightedSlot === 'both';

          return (
            <div
              key={`box-${slotIdx}`}
              ref={slotIdx === 0 ? box0Ref : box1Ref}
              onClick={() => handleBoxClick(slotIdx)}
              tabIndex={selectedChipSymbol && placed === null ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBoxClick(slotIdx);
                }
              }}
              aria-label={`Ô âm số ${slotIdx + 1}${
                placed ? `: Đã đặt âm ${placed.symbol}` : ': Ô trống, nhấp để đặt'
              }`}
              className={`relative flex-1 aspect-square max-w-[150px] min-h-[120px] rounded-3xl border-4 transition-all duration-300 flex items-center justify-center ${
                placed
                  ? 'border-primary/80 bg-surface-container-lowest shadow-md'
                  : selectedChipSymbol
                  ? 'border-dashed border-primary/50 bg-primary-fixed/20 hover:bg-primary-fixed/30 cursor-pointer animate-pulse'
                  : 'border-dashed border-outline-variant/60 bg-surface-container-low/70'
              } ${
                isSlotHighlighted
                  ? 'scale-105 ring-4 ring-primary/40 shadow-xl'
                  : ''
              }`}
            >
              {placed ? (
                <LetterDisplay
                  letter={placed.symbol}
                  type={placed.type}
                  size="lg"
                  highlighted={isSlotHighlighted}
                  className="pointer-events-none"
                />
              ) : (
                <span className="text-xs font-label text-outline uppercase font-semibold">
                  Ô {slotIdx + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Chips Shelf */}
      <div className="flex flex-col items-center gap-2 w-full">
        <span className="text-xs font-label text-on-surface-variant font-medium">
          Các thẻ âm có sẵn:
        </span>

        <div className="flex items-center justify-center gap-6 min-h-[90px] p-3 rounded-2xl bg-surface-container-low/50 border border-outline-variant/20 w-full max-w-md">
          {shelfChips.length === 0 && !isWordComplete ? (
            <span className="text-xs font-label text-outline">Đã đặt tất cả các âm vào ô</span>
          ) : null}

          {shelfChips.map((chip) => {
            const isSelected = selectedChipSymbol === chip.symbol;
            const isDragging = draggingChip?.symbol === chip.symbol;

            return (
              <div
                key={`shelf-${chip.symbol}`}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Thẻ âm ${chip.symbol}, loại ${
                  chip.type === 'consonant' ? 'phụ âm' : 'nguyên âm'
                }`}
                onClick={() =>
                  setSelectedChipSymbol((curr) => (curr === chip.symbol ? null : chip.symbol))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedChipSymbol((curr) => (curr === chip.symbol ? null : chip.symbol));
                  }
                }}
                onPointerDown={(e) => handlePointerDown(e, chip)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{
                  transform: isDragging
                    ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
                    : undefined,
                  zIndex: isDragging ? 50 : undefined,
                  touchAction: 'none',
                }}
                className={`cursor-grab active:cursor-grabbing p-3 sm:p-4 rounded-2xl bg-surface-container-lowest border-2 transition-all duration-150 shadow-sm flex items-center justify-center ${
                  isSelected
                    ? 'border-primary ring-4 ring-primary/30 scale-105'
                    : 'border-outline-variant/30 hover:border-primary/50 hover:shadow-card-hover'
                } ${isDragging ? 'shadow-2xl scale-110 opacity-90' : ''}`}
              >
                <LetterDisplay
                  letter={chip.symbol}
                  type={chip.type}
                  size="md"
                  className="pointer-events-none"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Feedback Banner */}
      {feedback && (
        <FeedbackBanner
          type="correct"
          message={feedback}
          className="mt-2"
        />
      )}

      {/* Next Word Trigger */}
      {isWordComplete && !isLastWord && (
        <Button
          onClick={onNextWord}
          variant="primary-solid"
          icon="arrow_forward"
          iconPosition="right"
          size="lg"
          className="mt-2 animate-fade-in"
        >
          Sang từ tiếp theo
        </Button>
      )}

      {isWordComplete && isLastWord && (
        <Button
          onClick={onNextWord}
          variant="primary-solid"
          icon="check_circle"
          iconPosition="left"
          size="lg"
          className="mt-2 animate-fade-in"
        >
          Hoàn thành ghép âm
        </Button>
      )}
    </div>
  );
};

export interface SoundBoxesProps {
  items: BlendingItem[];
  onPlayWordAudio: (url: string, onEnded?: () => void) => void;
  onPlayPartAudio: (url: string, onEnded?: () => void) => void;
  onAllBlendingCompleted?: () => void;
  className?: string;
}

export const SoundBoxes: React.FC<SoundBoxesProps> = ({
  items,
  onPlayWordAudio,
  onPlayPartAudio,
  onAllBlendingCompleted,
  className = '',
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const handleNextWord = () => {
    if (currentWordIndex + 1 < items.length) {
      setCurrentWordIndex((idx) => idx + 1);
    } else {
      onAllBlendingCompleted?.();
    }
  };

  const currentItem = items[currentWordIndex] || items[0];

  return (
    <div className={className}>
      <SoundBoxesWord
        key={currentWordIndex}
        item={currentItem}
        wordIndex={currentWordIndex}
        totalWords={items.length}
        onPlayWordAudio={onPlayWordAudio}
        onPlayPartAudio={onPlayPartAudio}
        onNextWord={handleNextWord}
        isLastWord={currentWordIndex + 1 === items.length}
      />
    </div>
  );
};
