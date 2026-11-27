import React, { useRef } from 'react';
import type { ReadingBlock } from '../../lib/document';
import type { SpeechBoundaryEvent } from '../../lib/speech';
import type { WordSelection } from '../../lib/assist';
import { clickedWord, selectedRange } from '../../lib/text-selection';
import { SnapshotFigure } from './SnapshotFigure';

export interface StaticHighlight {
  phrase: string;
  className?: string;
}

export interface ReadingTextProps {
  blocks: ReadingBlock[];
  activeBoundary: SpeechBoundaryEvent | null;
  staticHighlights?: Record<string, StaticHighlight[]>;
  highlightedBlockIds?: string[];
  figureSlot?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  mirrorLetters?: boolean;
  paragraphCards?: boolean;
  onWordSelection?: (selection: WordSelection) => void;
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

const MIRROR_CLASS: Record<string, string> = {
  b: 'reader-mirror-b',
  B: 'reader-mirror-b',
  d: 'reader-mirror-d',
  D: 'reader-mirror-d',
  p: 'reader-mirror-p',
  P: 'reader-mirror-p',
  q: 'reader-mirror-q',
  Q: 'reader-mirror-q',
};

function renderTokenText(text: string, mirrorLetters: boolean): React.ReactNode {
  if (!mirrorLetters || !/[bBdDpPqQ]/.test(text)) return text;
  const nodes: React.ReactNode[] = [];
  let plain = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const cls = MIRROR_CLASS[ch];
    if (cls) {
      if (plain) {
        nodes.push(plain);
        plain = '';
      }
      nodes.push(<span key={i} className={cls}>{ch}</span>);
    } else {
      plain += ch;
    }
  }
  if (plain) nodes.push(plain);
  return nodes;
}

function renderInline(
  block: ReadingBlock,
  activeBoundary: SpeechBoundaryEvent | null,
  staticHighlights: StaticHighlight[] | undefined,
  selectable: boolean,
  mirrorLetters: boolean,
): React.ReactNode {
  const tokens = tokenize(block.text);
  const highlights = findHighlightRanges(block.text, staticHighlights);
  const isActiveBlock = activeBoundary?.segmentId === block.id;

  return tokens.map((token, tokenIndex) => {
    const tokenEnd = token.offset + token.text.length;
    if (!token.isWord) {
      const wsHighlight = highlights.find(
        (range) => token.offset >= range.start && tokenEnd <= range.end,
      );
      if (wsHighlight) {
        return <mark key={tokenIndex} className={wsHighlight.className}>{token.text}</mark>;
      }
      return <span key={tokenIndex}>{token.text}</span>;
    }
    const active = Boolean(isActiveBlock && activeBoundary && isOverlapping(token.offset, tokenEnd, activeBoundary));
    const selectionProps = selectable ? {
      'data-token-start': token.offset,
      'data-token-end': tokenEnd,
      tabIndex: -1,
      role: 'button',
      'aria-label': `Chọn ${token.text} để giải nghĩa`,
    } : {};
    if (active) {
      return (
        <span
          key={tokenIndex}
          aria-current="true"
          className="reader-word-active px-0.5 focus-visible:outline-2"
          {...selectionProps}
        >
          {token.text}
        </span>
      );
    }
    const content = renderTokenText(token.text, mirrorLetters);
    const highlight = highlights.find(
      (range) => token.offset >= range.start && tokenEnd <= range.end,
    );
    if (highlight) {
      return (
        <mark key={tokenIndex} className={`${highlight.className} focus-visible:outline-2 focus-visible:outline-primary`} {...selectionProps}>
          {content}
        </mark>
      );
    }
    return <span key={tokenIndex} className={selectable ? 'focus-visible:outline-2 focus-visible:outline-primary' : undefined} {...selectionProps}>{content}</span>;
  });
}

export const ReadingText: React.FC<ReadingTextProps> = ({
  blocks,
  activeBoundary,
  staticHighlights = {},
  highlightedBlockIds = [],
  figureSlot,
  className = '',
  style,
  mirrorLetters = false,
  paragraphCards = false,
  onWordSelection,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const highlightedSet = new Set(highlightedBlockIds);
  const selectionAttributes = (block: ReadingBlock) => onWordSelection &&
    ['paragraph', 'heading', 'listItem', 'quote'].includes(block.type)
    ? {
        'data-segment-id': block.id,
        'data-segment-text': block.text,
        'data-block-type': block.type,
        ...(highlightedSet.has(block.id) ? { 'data-summary-source': 'true' } : {}),
        tabIndex: 0,
      }
    : highlightedSet.has(block.id)
      ? { 'data-summary-source': 'true' }
      : {};
  const rendered: React.ReactNode[] = [];
  const visibleBlocks = blocks.filter((block) => block.text.trim().length > 0 || (block.type === 'snapshot' && block.imageSrc));
  let index = 0;
  let chunkCounter = 0;
  const wrapChunk = (key: string, emphasized: boolean, child: React.ReactNode) => {
    if (!paragraphCards) return child;
    chunkCounter += 1;
    const label = String(chunkCounter).padStart(2, '0');
    return (
      <div
        key={`chunk-${key}`}
        data-reading-chunk=""
        className={`reader-chunk ${emphasized ? 'reader-chunk-speaking' : ''}`}
      >
        <span aria-hidden="true" className="reader-chunk-num">{label}</span>
        {child}
      </div>
    );
  };

  while (index < visibleBlocks.length) {
    const block = visibleBlocks[index];

    if (block.type === 'listItem') {
      const listKind = block.listKind ?? 'unordered';
      const items: ReadingBlock[] = [];
      while (
        index < visibleBlocks.length &&
        visibleBlocks[index].type === 'listItem' &&
        (visibleBlocks[index].listKind ?? 'unordered') === listKind
      ) {
        items.push(visibleBlocks[index]);
        index += 1;
      }
      const ListTag = listKind === 'ordered' ? 'ol' : 'ul';
      const hasMarkers = items.every((item) => /^(?:[-•▪]|\d+[.)]|\([a-zA-Z\d]+\))\s*/.test(item.text));
      const listSpeaking = items.some((item) => activeBoundary?.segmentId === item.id || highlightedSet.has(item.id));
      rendered.push(
        wrapChunk(
          block.id,
          listSpeaking,
          <ListTag
            key={block.id}
            className={`${paragraphCards ? 'space-y-2.5' : 'mb-8 space-y-3 last:mb-4'} ${
              hasMarkers ? 'list-none pl-0' : listKind === 'ordered' ? 'list-decimal pl-6' : 'list-disc pl-6'
            }`}
          >
            {items.map((item) => (
              <li key={item.id} className="whitespace-pre-line" {...selectionAttributes(item)}>
                {renderInline(item, activeBoundary, staticHighlights[item.id], Boolean(onWordSelection), mirrorLetters)}
              </li>
            ))}
          </ListTag>,
        ),
      );
      continue;
    }

    const body = renderInline(
      block,
      activeBoundary,
      staticHighlights[block.id],
      Boolean(onWordSelection && ['paragraph', 'heading', 'listItem', 'quote'].includes(block.type)),
      mirrorLetters,
    );

    if (block.type === 'snapshot' && block.imageSrc) {
      rendered.push(<SnapshotFigure key={block.id} block={block} textContent={body} />);
      index += 1;
      continue;
    }

    if (block.type === 'heading') {
      const HeadingTag = block.headingLevel === 3 ? 'h3' : 'h2';
      rendered.push(
        <HeadingTag
          key={block.id}
          id={`reader-${block.id}`}
          {...selectionAttributes(block)}
          className={`font-semibold tracking-tight leading-snug whitespace-pre-line ${
            block.headingLevel === 3
              ? 'text-[1.15em] mt-8 mb-3'
              : 'text-[1.4em] mt-10 mb-4'
          } ${block.headingLevel === 3 ? 'last:mb-4' : ''}`}
        >
          {body}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (block.type === 'quote') {
      rendered.push(
        wrapChunk(
          block.id,
          activeBoundary?.segmentId === block.id || highlightedSet.has(block.id),
          <blockquote
            key={block.id}
            {...selectionAttributes(block)}
            className={
              paragraphCards
                ? 'italic text-lg sm:text-[1.2rem] leading-[1.9] whitespace-pre-line'
                : 'reader-quote my-10 px-6 sm:px-8 py-5 rounded-xl italic text-lg sm:text-[1.25rem] leading-[1.9] whitespace-pre-line'
            }
          >
            {body}
          </blockquote>,
        ),
      );
      index += 1;
      continue;
    }

    if (block.type === 'table' && block.rows?.length) {
      const [header, ...rows] = block.rows;
      rendered.push(
        <div
          key={block.id}
          role="region"
          aria-label={block.caption || 'Bảng dữ liệu'}
          tabIndex={0}
          className="my-8 max-w-full overflow-x-auto rounded-lg border border-current/20"
        >
          <table className="w-full min-w-max border-collapse text-left text-[0.82em] leading-relaxed">
            {block.caption && <caption className="caption-top px-4 py-3 text-left font-semibold">{block.caption}</caption>}
            <thead>
              <tr>{header.map((cell, cellIndex) => (
                <th key={cellIndex} scope="col" className="border-b border-r border-current/20 px-4 py-3 align-top font-semibold last:border-r-0">{cell}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-r border-current/15 px-4 py-3 align-top last:border-r-0">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      index += 1;
      continue;
    }

    rendered.push(
      wrapChunk(
        block.id,
        activeBoundary?.segmentId === block.id || highlightedSet.has(block.id),
        <p
          key={block.id}
          className={`${paragraphCards ? 'mb-0' : 'mb-8 last:mb-4'} ${!paragraphCards && highlightedSet.has(block.id) ? 'reader-summary-block' : ''} whitespace-pre-line`}
          {...selectionAttributes(block)}
        >
          {body}
          {figureSlot && block.id === 'third-paragraph' ? (
            <span className="block">{figureSlot}</span>
          ) : null}
        </p>,
      ),
    );
    index += 1;
  }

  return (
    <div
      ref={rootRef}
      className={`reading-body text-left ${className}`}
      style={style}
      onMouseUp={() => {
        if (!rootRef.current || !onWordSelection) return;
        const next = selectedRange(rootRef.current);
        if (next) onWordSelection(next);
      }}
      onClick={(event) => {
        if (!rootRef.current || !onWordSelection) return;
        const next = clickedWord(event.target, rootRef.current);
        if (next) onWordSelection(next);
      }}
      onKeyUp={() => {
        if (!rootRef.current || !onWordSelection) return;
        const next = selectedRange(rootRef.current);
        if (next) onWordSelection(next);
      }}
      onKeyDown={(event) => {
        if (!rootRef.current || !onWordSelection) return;
        const target = event.target as HTMLElement;
        const segment = target.closest<HTMLElement>('[data-segment-id]');
        if (target === segment && (event.key === 'Enter' || event.key === ' ')) {
          const first = segment?.querySelector<HTMLElement>('[data-token-start]');
          if (first) {
            event.preventDefault();
            first.focus();
          }
          return;
        }
        if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && target.hasAttribute('data-token-start') && segment) {
          const tokens = [...segment.querySelectorAll<HTMLElement>('[data-token-start]')];
          const index = tokens.indexOf(target);
          const next = tokens[index + (event.key === 'ArrowRight' ? 1 : -1)];
          if (next) {
            event.preventDefault();
            next.focus();
          }
          return;
        }
        if (event.key !== 'Enter' && event.key !== ' ') return;
        window.getSelection()?.removeAllRanges();
        const next = clickedWord(event.target, rootRef.current);
        if (next) {
          event.preventDefault();
          onWordSelection(next);
        }
      }}
    >
      {rendered}
    </div>
  );
};
