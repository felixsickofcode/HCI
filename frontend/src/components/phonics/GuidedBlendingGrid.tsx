import React from 'react';
import { AudioButton } from './AudioButton';

interface BlendingExample {
  parts?: string[];
  base?: string;
  tone?: string;
  result: string;
  audio: string;
}

export interface GuidedBlendingGridProps {
  examples: BlendingExample[];
  activeExample: number | null;
  activePhase: number;
  activeUrl: string | null;
  onPlayExample: (index: number) => void;
}

const consonantColor = '#094CB2';
const vowelColor = '#F97316';
const toneColor = '#6D5E00';

function ResultText({ result }: { result: string }) {
  if (result === 'cô') {
    return (
      <span className="inline-flex flex-col items-center font-headline font-bold text-[58px] leading-none" aria-label={result}>
        <span className="text-[26px] h-7" style={{ color: toneColor }}>^</span>
        <span>
          <span style={{ color: consonantColor }}>c</span>
          <span style={{ color: vowelColor }}>ô</span>
        </span>
      </span>
    );
  }

  const letters = result === 'cà' ? ['c', 'à'] : result.split('');
  return (
    <span className="inline-flex font-headline font-bold text-[58px] leading-none" aria-label={result}>
      {letters.map((letter, index) => (
        <span key={`${letter}-${index}`} style={{ color: index === 0 ? consonantColor : vowelColor }}>
          {letter}
        </span>
      ))}
    </span>
  );
}

export const GuidedBlendingGrid: React.FC<GuidedBlendingGridProps> = ({
  examples,
  activeExample,
  activePhase,
  activeUrl,
  onPlayExample,
}) => {
  return (
    <div className="h-full min-h-0 flex flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-6 mb-4 text-[11px] font-label font-medium text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: consonantColor }} />
          Phụ âm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: vowelColor }} />
          Nguyên âm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toneColor }} />
          Dấu thanh
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4 w-full max-w-5xl">
        {examples.map((example, index) => {
          const isActive = activeExample === index;
          return (
            <article
              key={`${example.result}-${index}`}
              className={`min-h-[310px] rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-5 py-5 flex flex-col items-center justify-between shadow-card-subtle transition-all ${
                isActive ? 'ring-2 ring-primary/20' : ''
              }`}
            >
              <div className="h-10 flex items-center justify-center text-base font-headline font-semibold">
                {example.parts ? (
                  <>
                    <span style={{ color: consonantColor }}>{example.parts[0]}</span>
                    <span className="mx-2 text-outline">+</span>
                    <span style={{ color: vowelColor }}>{example.parts[1]}</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: vowelColor }}>{example.base}</span>
                    <span className="mx-2 text-outline">+</span>
                    <span style={{ color: toneColor }}>dấu {example.tone}</span>
                  </>
                )}
              </div>

              <div className="min-h-[112px] flex items-center justify-center">
                {isActive && activePhase === 1 && example.parts ? (
                  <span className="text-[58px] font-headline font-bold" style={{ color: vowelColor }}>
                    {example.parts[1]}
                  </span>
                ) : (
                  <ResultText result={example.result} />
                )}
              </div>

              <p className="h-7 text-[11px] font-label text-on-surface-variant">
                {example.parts
                  ? `${example.parts[0]} - ${example.parts[1]} - ${example.result}`
                  : `${example.base?.toUpperCase()} + ${example.tone} = ${example.result}`}
              </p>

              <AudioButton
                label="Nghe"
                size="md"
                variant="subtle"
                isPlaying={Boolean(activeUrl) && isActive}
                onClick={() => onPlayExample(index)}
              />
            </article>
          );
        })}
      </div>
    </div>
  );
};
