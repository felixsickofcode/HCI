import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { FocusSettings } from '../../lib/api';

interface VisualLine {
  top: number;
  bottom: number;
  firstToken: HTMLElement;
  fragment: number;
}

function measureLines(body: HTMLElement): VisualLine[] {
  const origin = body.getBoundingClientRect().top;
  const lines: VisualLine[] = [];
  for (const block of body.querySelectorAll<HTMLElement>('[data-segment-id]')) {
    const height = parseFloat(getComputedStyle(block).lineHeight);
    for (const token of block.querySelectorAll<HTMLElement>('[data-token-start]')) {
      // A long token can wrap across several lines. Spaces and OCR newlines have no stop of their own.
      Array.from(token.getClientRects()).forEach((rect, fragment) => {
        if (!rect.width || !rect.height) return;
        const top = rect.top - origin + (rect.height - height) / 2;
        if (lines.length && Math.abs(lines[lines.length - 1].top - top) < 1) return;
        lines.push({ top, bottom: top + height, firstToken: token, fragment });
      });
    }
  }
  return lines;
}

function nearestLine(lines: VisualLine[], y: number) {
  let low = 0;
  let high = lines.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (lines[mid].top < y) low = mid + 1;
    else high = mid;
  }
  return low > 0 && y - lines[low - 1].top < lines[low].top - y ? low - 1 : low;
}

interface Props {
  mainRef: RefObject<HTMLElement | null>;
  bodyRef: RefObject<HTMLDivElement | null>;
  lineCount: FocusSettings['lineCount'];
  background: string;
  opacity: number;
  accent?: string;
  accentFg?: string;
  surfaceBg?: string;
  controlBg?: string;
  border?: string;
  fg?: string;
}

export function FixedReadingRuler({
  mainRef,
  bodyRef,
  lineCount,
  background,
  opacity,
  accent = '#1556B8',
  accentFg = '#FAF6EE',
  surfaceBg,
  controlBg,
  border,
  fg,
}: Props) {
  const maskRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<(direction: number) => boolean>(() => false);
  const [limits, setLimits] = useState({ first: true, last: false });

  useLayoutEffect(() => {
    const main = mainRef.current;
    const body = bodyRef.current;
    const mask = maskRef.current;
    const band = bandRef.current;
    if (!main || !body || !mask || !band) return;

    let lines: VisualLine[] = [];
    let current = 0;
    let aligned = false;
    const anchor = () => Math.round(main.clientHeight * 0.3);
    const bodyOffset = () => body.getBoundingClientRect().top - main.getBoundingClientRect().top;
    const lastStart = () => Math.max(0, lines.length - lineCount);

    const paint = () => {
      mask.hidden = !lines.length;
      if (!lines.length) return;
      const viewport = main.getBoundingClientRect();
      const content = body.getBoundingClientRect();
      const y = anchor() + viewport.top - content.top;
      current = Math.min(nearestLine(lines, y), lastStart());
      const first = lines[current];
      const last = lines[Math.min(current + lineCount - 1, lines.length - 1)];
      aligned = Math.abs(first.top - y) <= 1;
      const inset = [content.top - viewport.top, viewport.right - content.right,
        viewport.bottom - content.bottom, content.left - viewport.left];
      mask.style.clipPath = 'inset(' + inset.map(value => Math.max(0, value) + 'px').join(' ') + ')';
      band.style.top = anchor() + 'px';
      band.style.height = (last.bottom - first.top) + 'px';
      const atFirst = y <= lines[0].top + 1;
      const atLast = y >= lines[lastStart()].top - 1;
      setLimits(old => old.first === atFirst && old.last === atLast ? old : { first: atFirst, last: atLast });
    };

    const goTo = (index: number) => {
      main.scrollTop += bodyOffset() + lines[index].top - anchor();
      paint();
    };

    const measure = () => {
      const previous = aligned ? lines[current] : undefined;
      const initial = !lines.length;
      lines = measureLines(body);
      if (lines.length && (initial || previous)) {
        // Keep the same word under the ruler when a font loads or the column reflows.
        const rects = previous?.firstToken.getClientRects();
        const rect = rects?.[Math.min(previous?.fragment ?? 0, rects.length - 1)];
        const y = rect ? rect.top + rect.height / 2 - body.getBoundingClientRect().top : anchor() - bodyOffset();
        const index = rect ? lines.findIndex(line => line.bottom > y) : nearestLine(lines, y);
        goTo(Math.min(index < 0 ? lines.length - 1 : index, lastStart()));
      } else paint();
    };

    const step = (direction: number) => {
      if (!lines.length) return false;
      const y = anchor() - bodyOffset();
      let index = nearestLine(lines, y);
      if ((lines[index].top - y) * direction <= 1) index += direction;
      if (direction < 0 && y > lines[lastStart()].top + 1) index = lastStart();
      if (index < 0 || index > lastStart()) return false;
      goTo(index);
      return true;
    };
    stepRef.current = step;

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || document.querySelector('[role="dialog"]')) return;
      const rulerControl = target.closest('[data-ruler-control], [data-ruler-switch]');
      if (!rulerControl && target !== document.body &&
          (!main.contains(target) || target.closest('input, select, textarea, button, a, [contenteditable="true"], [role="region"]'))) return;
      if (step(event.key === 'ArrowDown' ? 1 : -1) || aligned) event.preventDefault();
    };

    // Retain native zoom, selections, horizontal pans, and scrolling outside the text.
    const inText = (target: EventTarget | null) =>
      target instanceof Element && body.contains(target) && !target.closest('figure, table, button, a, [role="dialog"]');
    const canStep = (dy: number) => {
      const y = anchor() - bodyOffset();
      return lines.length > 0 && (dy > 0 ? y < lines[lastStart()].top - 1 : y > lines[0].top + 1);
    };
    let wheelDelta = 0;
    let lastWheel = 0;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (!inText(event.target)) return;
      const dy = event.deltaY;
      if (!canStep(dy)) return;
      if (!event.cancelable) return;
      event.preventDefault();
      if (event.timeStamp - lastWheel > 160 || Math.sign(wheelDelta) !== Math.sign(dy)) wheelDelta = 0;
      wheelDelta += dy;
      lastWheel = event.timeStamp;
      if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || Math.abs(wheelDelta) >= 32) {
        step(Math.sign(dy));
        wheelDelta = 0;
      }
    };

    let touch: Touch | undefined;
    let swiped = false;
    const onTouchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1 && inText(event.target) ? event.touches[0] : undefined;
      swiped = false;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1 || !event.cancelable || window.getSelection()?.type === 'Range') return;
      const dy = touch.clientY - event.touches[0].clientY;
      const dx = touch.clientX - event.touches[0].clientX;
      if (Math.abs(dx) > Math.abs(dy) || (!swiped && !canStep(dy))) return;
      event.preventDefault();
      if (!swiped && Math.abs(dy) >= 24) swiped = step(Math.sign(dy));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    observer.observe(body);
    // A font or spacing change can move words without changing the block's total height.
    const styleObserver = new MutationObserver(measure);
    styleObserver.observe(body, { attributes: true, attributeFilter: ['style'] });
    document.fonts.addEventListener('loadingdone', measure);
    main.addEventListener('scroll', paint);
    body.addEventListener('touchstart', onTouchStart, { passive: true });
    body.addEventListener('touchmove', onTouchMove, { passive: false });
    main.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      observer.disconnect();
      styleObserver.disconnect();
      document.fonts.removeEventListener('loadingdone', measure);
      main.removeEventListener('scroll', paint);
      body.removeEventListener('touchstart', onTouchStart);
      body.removeEventListener('touchmove', onTouchMove);
      main.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      stepRef.current = () => false;
    };
  }, [mainRef, bodyRef, lineCount]);

  return (
    <>
      <div ref={maskRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div
          ref={bandRef}
          data-reading-ruler=""
          className="absolute inset-x-0 border-y border-l-[3px]"
          style={{
            boxShadow: '0 0 0 100vmax ' + background,
            opacity,
            borderTopColor: accent,
            borderBottomColor: accent,
            borderLeftColor: accent,
          }}
        />
      </div>
      <div
        role="group"
        aria-label="Chuyển dòng"
        data-ruler-control=""
        className="absolute bottom-4 right-4 z-20 flex gap-1.5 rounded-2xl p-1.5 shadow-md font-label"
        style={{
          backgroundColor: surfaceBg ?? background,
          border: `1px solid ${border ?? 'currentColor'}`,
          color: fg,
        }}
      >
        <button
          type="button"
          disabled={limits.first}
          onClick={() => stepRef.current(-1)}
          className="min-h-10 rounded-xl px-3.5 text-sm font-medium transition-opacity focus-visible:outline disabled:opacity-40"
          style={{
            backgroundColor: controlBg ?? background,
            border: `1px solid ${border ?? 'transparent'}`,
            color: fg,
          }}
        >
          ↑ Dòng trước
        </button>
        <button
          type="button"
          disabled={limits.last}
          onClick={() => stepRef.current(1)}
          className="min-h-10 rounded-xl px-3.5 text-sm font-semibold transition-opacity focus-visible:outline disabled:opacity-40"
          style={{
            backgroundColor: accent,
            color: accentFg,
          }}
        >
          ↓ Dòng sau
        </button>
      </div>
    </>
  );
}
