import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { FeedbackBanner } from '../common';

export interface ElkoninItem {
  word: string;
  audio: string;
  consonant: string;
  vowel: string;
  tone: string | null;
  chips: string[];
}

interface ElkoninExerciseProps {
  item: ElkoninItem;
  exerciseIndex: number;
  onReplay: (audio: string) => void;
  onStateChange: (state: { isReady: boolean; isCorrect: boolean }) => void;
}

export interface ElkoninExerciseHandle {
  checkAnswer: () => void;
}

const TONE_OPTIONS = [
  { name: 'huyền', mark: '\\' },
  { name: 'sắc', mark: '/' },
  { name: 'hỏi', mark: '?' },
  { name: 'nặng', mark: '.' },
];

export const ElkoninExercise = forwardRef<ElkoninExerciseHandle, ElkoninExerciseProps>(({
  item,
  exerciseIndex,
  onReplay,
  onStateChange,
}, ref) => {
  const [consonant, setConsonant] = useState<string | null>(null);
  const [vowel, setVowel] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'correct' | 'tryAgain' } | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    setConsonant(null);
    setVowel(null);
    setTone(null);
    setSelectedChip(null);
    setFeedback(null);
    setIsCorrect(false);
  }, [exerciseIndex, item.word]);

  useEffect(() => {
    onReplay(item.audio);
  }, [exerciseIndex, item.audio, onReplay]);

  useEffect(() => {
    onStateChange({ isReady: Boolean(consonant && vowel), isCorrect });
  }, [consonant, vowel, isCorrect, onStateChange]);

  const placeChip = (chip: string) => {
    if (isCorrect) return;
    if (chip === 'c') setConsonant(chip);
    else setVowel(chip);
    setSelectedChip(null);
  };

  const placeTone = (value: string) => {
    if (!isCorrect) setTone(value);
  };

  const checkAnswer = () => {
    if (!consonant || !vowel) return;
    const toneMatches = item.tone === null ? tone === null : tone === item.tone;
    if (consonant === item.consonant && vowel === item.vowel && toneMatches) {
      setIsCorrect(true);
      setFeedback({ type: 'correct', message: 'Đúng rồi!' });
      onReplay(item.audio);
    } else {
      setFeedback({ type: 'tryAgain', message: 'Chưa đúng, mình nghe lại nhé.' });
      onReplay(item.audio);
    }
  };

  useImperativeHandle(ref, () => ({ checkAnswer }));

  const handleDrop = (event: React.DragEvent, target: 'consonant' | 'vowel' | 'tone') => {
    event.preventDefault();
    const chip = event.dataTransfer.getData('text/plain');
    if (target === 'tone') {
      const toneName = event.dataTransfer.getData('application/tone');
      if (toneName) placeTone(toneName);
      return;
    }
    if (chip) placeChip(chip);
  };

  return (
    <div className="h-full min-h-0 flex flex-col justify-between py-1">
      <div className="flex justify-center shrink-0">
        <button
          type="button"
          aria-label="Nghe lại âm thanh mẫu"
          onClick={() => onReplay(item.audio)}
          className="h-12 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-medium text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-2xl">volume_up</span>
          <span className="font-headline tracking-wide">Nghe lại âm thanh mẫu</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-on-primary/20 font-label ml-1">Phím bấm: Space</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center gap-5 my-auto shrink-0">
        <button
          type="button"
          onClick={() => selectedChip && placeChip(selectedChip)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, 'consonant')}
          className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest/80 flex items-center justify-center shadow-inner"
          aria-label="Ô phụ âm"
        >
          {consonant ? (
            <span className="text-5xl font-headline font-bold text-primary">{consonant}</span>
          ) : (
            <span className="text-3xl text-outline/40 font-headline">_</span>
          )}
        </button>

        <span className="text-2xl font-light text-secondary">+</span>

        <div className="relative flex items-center justify-center">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, 'tone')}
            className="absolute -top-16 w-[60px] h-[60px] rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-lowest/80 flex items-center justify-center"
            aria-label="Ô dấu thanh"
          >
            {tone ? (
              <span className="text-xl font-headline font-black">{TONE_OPTIONS.find((option) => option.name === tone)?.mark}</span>
            ) : (
              <span className="text-sm text-outline/40 font-headline">-</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => selectedChip && placeChip(selectedChip)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, 'vowel')}
            className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest/80 flex items-center justify-center shadow-inner"
            aria-label="Ô nguyên âm"
          >
            {vowel ? (
              <span className="text-5xl font-headline font-bold text-amber-700">{vowel}</span>
            ) : (
              <span className="text-3xl text-outline/40 font-headline">_</span>
            )}
          </button>
        </div>

        <span className="material-symbols-outlined text-3xl text-secondary">arrow_forward</span>

        <div className="w-[100px] h-[100px] rounded-xl border-2 border-outline-variant bg-surface-container-low flex items-center justify-center" aria-label={isCorrect ? `Kết quả ${item.word}` : 'Kết quả chưa biết'}>
          {isCorrect ? (
            <span className="text-4xl font-headline font-bold text-primary">{item.word}</span>
          ) : (
            <span className="text-4xl font-headline font-bold text-outline/40">?</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-label font-medium uppercase tracking-wider text-on-surface-variant">
          Chọn hoặc kéo thẻ âm vào ô tương ứng
        </span>
        <div className="flex items-center gap-4">
          {item.chips.map((chip, index) => (
            <button
              key={`${chip}-${index}`}
              type="button"
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', chip)}
              onClick={() => setSelectedChip((current) => current === chip ? null : chip)}
              aria-label={`Chip ${chip}`}
              aria-pressed={selectedChip === chip}
              className={`w-[100px] h-[100px] rounded-xl shadow-sm flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-md transition-all ring-1 ${
                chip === 'c'
                  ? 'bg-primary-fixed/50 ring-primary/30'
                  : 'bg-surface-container-lowest ring-outline-variant/30'
              } ${selectedChip === chip ? 'ring-2 ring-primary' : ''}`}
            >
              <span className={`text-4xl font-headline font-bold ${chip === 'c' ? 'text-primary' : 'text-amber-700'}`}>{chip}</span>
              <span className={`text-[11px] font-label font-medium mt-1 ${chip === 'c' ? 'text-primary/80' : 'text-amber-800/70'}`}>
                {chip === 'c' ? 'phụ âm' : 'nguyên âm'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0 pb-1">
        <span className="text-[10px] font-label font-medium uppercase tracking-wider text-on-surface-variant">
          Dấu thanh (nhấn vào để chọn)
        </span>
        <div className="flex items-center gap-3">
          {TONE_OPTIONS.map((option) => (
            <button
              key={option.name}
              type="button"
              draggable
              onDragStart={(event) => event.dataTransfer.setData('application/tone', option.name)}
              onClick={() => placeTone(option.name)}
              aria-label={option.name}
              aria-pressed={tone === option.name}
              className={`w-[60px] h-[60px] rounded-lg bg-surface-container-lowest shadow-sm flex flex-col items-center justify-center cursor-grab transition-all ring-1 ${
                tone === option.name ? 'ring-2 ring-primary' : 'ring-outline-variant/30'
              }`}
            >
              <span className="text-xl font-headline font-black text-on-surface leading-none">{option.mark}</span>
              <span className="text-[9px] font-label font-medium text-secondary truncate mt-1">
                {option.name[0].toUpperCase() + option.name.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} className="absolute bottom-20 left-1/2 -translate-x-1/2" />}
    </div>
  );
});
