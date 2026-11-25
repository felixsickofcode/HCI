import type { WordSelection } from './assist';

const SELECTABLE = new Set(['paragraph', 'heading', 'listItem', 'quote']);

function segmentElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  const element = node instanceof Element ? node : node?.parentElement;
  const segment = element?.closest<HTMLElement>('[data-segment-id]') ?? null;
  return segment && root.contains(segment) ? segment : null;
}

export function selectedRange(root: HTMLElement): WordSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const startElement = segmentElement(range.startContainer, root);
  const endElement = segmentElement(range.endContainer, root);
  if (!startElement || startElement !== endElement || !SELECTABLE.has(startElement.dataset.blockType ?? '')) return null;
  const contextText = startElement.dataset.segmentText ?? '';
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(startElement);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  const start = prefixRange.toString().length;
  const selectedText = range.toString();
  const end = start + selectedText.length;
  if (!selectedText.trim() || contextText.slice(start, end) !== selectedText) return null;
  const box = range.getBoundingClientRect();
  return {
    segmentId: startElement.dataset.segmentId ?? '',
    contextText,
    selectedText,
    start,
    end,
    rect: { left: box.left, top: box.top, bottom: box.bottom },
  };
}

export function clickedWord(target: EventTarget | null, root: HTMLElement): WordSelection | null {
  if (!(target instanceof HTMLElement) || !window.getSelection()?.isCollapsed) return null;
  const token = target.closest<HTMLElement>('[data-token-start]');
  const segment = token?.closest<HTMLElement>('[data-segment-id]');
  if (!token || !segment || !root.contains(segment) || !SELECTABLE.has(segment.dataset.blockType ?? '')) return null;
  const contextText = segment.dataset.segmentText ?? '';
  const rawStart = Number(token.dataset.tokenStart);
  const rawEnd = Number(token.dataset.tokenEnd);
  if (!Number.isInteger(rawStart) || !Number.isInteger(rawEnd)) return null;
  const raw = contextText.slice(rawStart, rawEnd);
  const first = raw.search(/[\p{L}\p{N}]/u);
  if (first < 0) return null;
  const last = [...raw.matchAll(/[\p{L}\p{N}\p{M}]/gu)].at(-1);
  if (!last || last.index === undefined) return null;
  const start = rawStart + first;
  const end = rawStart + last.index + last[0].length;
  const box = token.getBoundingClientRect();
  return {
    segmentId: segment.dataset.segmentId ?? '',
    contextText,
    selectedText: contextText.slice(start, end),
    start,
    end,
    rect: { left: box.left, top: box.top, bottom: box.bottom },
  };
}

function textPosition(root: HTMLElement, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (remaining <= text.length) return { node: text, offset: remaining };
    remaining -= text.length;
    last = text;
  }
  return last && remaining === 0 ? { node: last, offset: last.length } : null;
}

/** Đo lại vị trí của vùng chọn theo DOM, dùng khi trang cuộn hoặc đổi kích thước. */
export function rangeRect(segmentId: string, start: number, end: number): DOMRect | null {
  if (!segmentId) return null;
  const segment = [...document.querySelectorAll<HTMLElement>('[data-segment-id]')]
    .find((element) => element.dataset.segmentId === segmentId);
  if (!segment) return null;
  const from = textPosition(segment, start);
  const to = textPosition(segment, end);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  const rect = range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}
