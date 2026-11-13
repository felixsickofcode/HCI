import React from 'react';
import type { ReadingBlock } from '../../lib/document';
import type { SpeechBoundaryEvent } from '../../lib/speech';
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

function renderInline(
  block: ReadingBlock,
  activeBoundary: SpeechBoundaryEvent | null,
  staticHighlights: StaticHighlight[] | undefined,
): React.ReactNode {
  const tokens = tokenize(block.text);
  const highlights = findHighlightRanges(block.text, staticHighlights);
  const isActiveBlock = activeBoundary?.segmentId === block.id;

  return tokens.map((token, tokenIndex) => {
    const tokenEnd = token.offset + token.text.length;
    if (!token.isWord) {
      return <span key={tokenIndex}>{token.text}</span>;
    }
    const active = Boolean(isActiveBlock && activeBoundary && isOverlapping(token.offset, tokenEnd, activeBoundary));
    if (active) {
      return (
        <span
          key={tokenIndex}
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
  });
}

export const ReadingText: React.FC<ReadingTextProps> = ({
  blocks,
  activeBoundary,
  staticHighlights = {},
  figureSlot,
  className = '',
  style,
}) => {
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
            <li key={item.id} className="whitespace-pre-line">
              {renderInline(item, activeBoundary, staticHighlights[item.id])}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const body = renderInline(block, activeBoundary, staticHighlights[block.id]);

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
        <blockquote
          key={block.id}
          className="my-12 px-6 sm:px-8 py-5 bg-surface-container-low rounded-lg text-on-surface-variant italic text-lg sm:text-[1.3rem] leading-[1.9] whitespace-pre-line"
        >
          {body}
        </blockquote>,
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
      <p key={block.id} className="mb-8 last:mb-4 whitespace-pre-line">
        {body}
        {figureSlot && block.id === 'third-paragraph' ? (
          <span className="block">{figureSlot}</span>
        ) : null}
      </p>,
    );
    index += 1;
  }

  return (
    <div className={`reading-body text-left ${className}`} style={style}>
      {rendered}
    </div>
  );
};
