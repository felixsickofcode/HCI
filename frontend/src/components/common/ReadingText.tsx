import React, { useRef } from 'react';
import type { HeadingLevel, ReadingBlock } from '../../lib/document';
import type { SpeechBoundaryEvent } from '../../lib/speech';
import type { WordSelection } from '../../lib/assist';
import { clickedWord, selectedRange } from '../../lib/text-selection';
import { ReadingTable } from './ReadingTable';
import { SnapshotFigure } from './SnapshotFigure';

export interface StaticHighlight {
  phrase: string;
  className?: string;
}

export interface ReadingTextProps {
  blocks: ReadingBlock[];
  activeBoundary: SpeechBoundaryEvent | null;
  staticHighlights?: Record<string, StaticHighlight[]>;
  figureSlot?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onWordSelection?: (selection: WordSelection) => void;
  onSegmentClick?: (segmentId: string) => void;
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

/** Giữ định dạng gốc của tài liệu: đậm/nghiêng/mono lồng ngoài token, highlight/TTS vẫn ở ngoài cùng. */
function applyEmphasis(token: React.ReactNode, kinds: string[]): React.ReactNode {
  let content = token;
  if (kinds.includes('mono')) content = <code className="font-mono text-[0.92em]">{content}</code>;
  if (kinds.includes('italic')) content = <em>{content}</em>;
  if (kinds.includes('bold')) content = <strong className="font-semibold">{content}</strong>;
  return content;
}

function renderInline(
  block: ReadingBlock,
  activeBoundary: SpeechBoundaryEvent | null,
  staticHighlights: StaticHighlight[] | undefined,
  selectable: boolean,
): React.ReactNode {
  const tokens = tokenize(block.text);
  const highlights = findHighlightRanges(block.text, staticHighlights);
  const emphasis = block.emphasis ?? [];
  const isActiveBlock = activeBoundary?.segmentId === block.id;

  return tokens.map((token, tokenIndex) => {
    const tokenEnd = token.offset + token.text.length;
    if (!token.isWord) {
      return <span key={tokenIndex}>{token.text}</span>;
    }
    const emphasisKinds = emphasis
      .filter((range) => token.offset >= range.start && tokenEnd <= range.end)
      .map((range) => range.kind);
    const content = emphasisKinds.length ? applyEmphasis(token.text, emphasisKinds) : token.text;
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
          className="bg-tertiary-fixed text-on-tertiary-fixed rounded-sm outline outline-1 outline-tertiary focus-visible:outline-2"
          {...selectionProps}
        >
          {content}
        </span>
      );
    }
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

/** Căn lề và tỉ lệ cỡ chữ gốc của block; không đặt gì khi tài liệu không mang tín hiệu này. */
function blockStyle(block: ReadingBlock): React.CSSProperties | undefined {
  const style: React.CSSProperties = {};
  if (block.align === 'center' || block.align === 'right') {
    style.textAlign = block.align;
  }
  if (block.type === 'heading' && typeof block.fontSizeRatio === 'number') {
    const ratio = Math.min(Math.max(block.fontSizeRatio, 1.05), 2.2);
    style.fontSize = `${ratio}em`;
  }
  return Object.keys(style).length ? style : undefined;
}

/** Cấp tiêu đề 1-6 giữ đúng thứ bậc HTML; cỡ chữ theo em nên vẫn ăn theo cỡ người dùng chọn. */
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const HEADING_CLASSES: Record<HeadingLevel, string> = {
  1: 'text-[1.8em] mt-12 mb-5',
  2: 'text-[1.4em] mt-10 mb-4',
  3: 'text-[1.15em] mt-8 mb-3',
  4: 'text-[1.05em] mt-6 mb-2',
  5: 'text-[1em] mt-6 mb-2',
  6: 'text-[1em] mt-4 mb-2',
};

export const ReadingText: React.FC<ReadingTextProps> = ({
  blocks,
  activeBoundary,
  staticHighlights = {},
  figureSlot,
  className = '',
  style,
  onWordSelection,
  onSegmentClick,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectionAttributes = (block: ReadingBlock) => (onWordSelection || onSegmentClick) &&
    ['paragraph', 'heading', 'listItem', 'quote'].includes(block.type)
    ? { 'data-segment-id': block.id, 'data-segment-text': block.text, 'data-block-type': block.type, tabIndex: 0 }
    : {};
  const rendered: React.ReactNode[] = [];
  const visibleBlocks = blocks.filter((block) => block.text.trim().length > 0 || (block.type === 'snapshot' && block.imageSrc));
  let index = 0;

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
      rendered.push(
        <ListTag
          key={block.id}
          className={`mb-8 space-y-3 last:mb-4 ${
            hasMarkers ? 'list-none pl-0' : listKind === 'ordered' ? 'list-decimal pl-6' : 'list-disc pl-6'
          }`}
        >
          {items.map((item) => (
            <li key={item.id} className="whitespace-pre-line" style={blockStyle(item)} {...selectionAttributes(item)}>
              {renderInline(item, activeBoundary, staticHighlights[item.id], Boolean(onWordSelection))}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const body = renderInline(block, activeBoundary, staticHighlights[block.id], Boolean(onWordSelection && ['paragraph', 'heading', 'listItem', 'quote'].includes(block.type)));

    if (block.type === 'snapshot' && block.imageSrc) {
      rendered.push(<SnapshotFigure key={block.id} block={block} textContent={body} />);
      index += 1;
      continue;
    }

    if (block.type === 'heading') {
      const level: HeadingLevel = block.headingLevel ?? 2;
      const HeadingTag = HEADING_TAGS[level - 1];
      rendered.push(
        <HeadingTag
          key={block.id}
          id={`reader-${block.id}`}
          {...selectionAttributes(block)}
          style={blockStyle(block)}
          className={`font-semibold tracking-tight leading-snug whitespace-pre-line ${
            HEADING_CLASSES[level]
          } ${level >= 3 ? 'last:mb-4' : ''}`}
        >
          {body}
        </HeadingTag>,
      );
      index += 1;
      continue;
    }

    if (block.type === 'quote') {
      rendered.push(
        <blockquote
          key={block.id}
          {...selectionAttributes(block)}
          style={blockStyle(block)}
          className="my-12 px-6 sm:px-8 py-5 bg-surface-container-low rounded-lg text-on-surface-variant italic text-lg sm:text-[1.3rem] leading-[1.9] whitespace-pre-line"
        >
          {body}
        </blockquote>,
      );
      index += 1;
      continue;
    }

    if (block.type === 'table' && block.rows?.length) {
      rendered.push(
        <div key={block.id} className="my-8">
          <ReadingTable rows={block.rows} label={block.caption || 'Bảng dữ liệu'} caption={block.caption} />
        </div>,
      );
      index += 1;
      continue;
    }

    rendered.push(
      <p key={block.id} className="mb-8 last:mb-4 whitespace-pre-line" style={blockStyle(block)} {...selectionAttributes(block)}>
        {body}
        {figureSlot && block.id === 'third-paragraph' ? (
          <span className="block">{figureSlot}</span>
        ) : null}
      </p>,
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
        if (!rootRef.current) return;
        if (onWordSelection) {
          const next = clickedWord(event.target, rootRef.current);
          if (next) onWordSelection(next);
        }
        if (onSegmentClick) {
          const segment = (event.target as HTMLElement).closest<HTMLElement>('[data-segment-id]');
          if (segment?.dataset.segmentId) onSegmentClick(segment.dataset.segmentId);
        }
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
