import React, { useEffect, useRef } from 'react';
import type { ReadingSegment, SpeechBoundaryEvent } from '../../lib/speech';

export interface StaticHighlight {
  phrase: string;
  className?: string;
}

export interface ReadingTextProps {
  segments: ReadingSegment[];
  activeBoundary: SpeechBoundaryEvent | null;
  staticHighlights?: Record<string, StaticHighlight[]>;
  figureSlot?: React.ReactNode;
}

interface Token {
  text: string;
  offset: number;
  isWord: boolean;
}

function tokenize(text: string): Token[] {
  const parts = text.split(/(\s+)/);
  const tokens: Token[] = [];
  let offset = 0;
  for (const part of parts) {
    if (part.length === 0) continue;
    tokens.push({ text: part, offset, isWord: !/^\s+$/.test(part) });
    offset += part.length;
  }
  return tokens;
}

function findHighlightRanges(text: string, highlights: StaticHighlight[] = []) {
  const ranges: Array<{ start: number; end: number; className: string }> = [];
  for (const highlight of highlights) {
    let from = 0;
    while (true) {
      const index = text.indexOf(highlight.phrase, from);
      if (index === -1) break;
      ranges.push({
        start: index,
        end: index + highlight.phrase.length,
        className:
          highlight.className ??
          'bg-tertiary-fixed/40 text-on-tertiary-fixed px-1.5 py-0.5 rounded-sm font-normal',
      });
      from = index + highlight.phrase.length;
    }
  }
  return ranges;
}

function isOverlapping(start: number, end: number, boundary: SpeechBoundaryEvent) {
  return start < boundary.charIndex + boundary.charLength && end > boundary.charIndex;
}

export const ReadingText: React.FC<ReadingTextProps> = ({
  segments,
  activeBoundary,
  staticHighlights = {},
  figureSlot,
}) => {
  const activeRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeBoundary) return;
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeBoundary]);

  return (
    <div className="reading-body font-body text-[17.5px] sm:text-[19px] text-on-surface tracking-[0.035em] leading-[2.1] text-left">
      {segments.map((segment, segmentIndex) => {
        const tokens = tokenize(segment.text);
        const highlights = findHighlightRanges(segment.text, staticHighlights[segment.id]);
        const isActiveSegment =
          activeBoundary?.segmentId === segment.id && activeBoundary?.segmentIndex === segmentIndex;
        const body = (
          <>
            {tokens.map((token, tokenIndex) => {
              const tokenEnd = token.offset + token.text.length;
              if (!token.isWord) {
                return <span key={tokenIndex}>{token.text}</span>;
              }
              const active = isActiveSegment && isOverlapping(token.offset, tokenEnd, activeBoundary);
              if (active) {
                return (
                  <span
                    key={tokenIndex}
                    ref={activeRef}
                    aria-current="true"
                    className="bg-tertiary-fixed text-on-tertiary-fixed rounded-sm px-0.5 outline outline-1 outline-tertiary"
                  >
                    {token.text}
                  </span>
                );
              }
              const highlight = highlights.find(
                (range) => token.offset >= range.start && tokenEnd <= range.end,
              );
              if (highlight) {
                return (
                  <mark key={tokenIndex} className={highlight.className}>
                    {token.text}
                  </mark>
                );
              }
              return <span key={tokenIndex}>{token.text}</span>;
            })}
          </>
        );
        if (segment.kind === 'quote') {
          return (
            <blockquote
              key={segment.id}
              className="my-12 px-6 sm:px-8 py-5 bg-surface-container-low rounded-lg text-on-surface-variant font-headline italic text-lg sm:text-[1.3rem] leading-[1.9]"
            >
              {body}
            </blockquote>
          );
        }
        return (
          <p key={segment.id} className="mb-8 indent-6 sm:indent-8 last:mb-4">
            {body}
            {figureSlot && segment.id === 'third-paragraph' ? (
              <span className="block">{figureSlot}</span>
            ) : null}
          </p>
        );
      })}
    </div>
  );
};
