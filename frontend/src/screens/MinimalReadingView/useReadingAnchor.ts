import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

interface Anchor {
  segment: HTMLElement;
  start: string;
  top: number;
}

// Record a visible word just before changing the document layout. The fixed
// ruler owns scroll position while enabled; this hook serves ordinary reading.
export function useReadingAnchor(
  mainRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLElement | null>,
  rulerEnabled: boolean,
) {
  const pending = useRef<Anchor | null>(null);
  const fontAnchor = useRef<Anchor | null>(null);
  const preferred = useRef<HTMLElement | null>(null);

  function rememberWord(target: EventTarget | null) {
    if (target instanceof Element) {
      const token = target.closest<HTMLElement>('[data-token-start]');
      if (token) preferred.current = token;
    }
  }

  const capture = useCallback(() => {
    const main = mainRef.current;
    const body = bodyRef.current;
    pending.current = null;
    fontAnchor.current = null;
    if (rulerEnabled || !main || !body) return;
    const viewport = main.getBoundingClientRect();
    const visible = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom > viewport.top && rect.top < viewport.bottom;
    };
    let token = preferred.current;
    if (!token || !body.contains(token) || !visible(token)) {
      if (main.scrollTop <= 0) return;
      token = null;
      for (const block of body.querySelectorAll<HTMLElement>('[data-segment-id]')) {
        if (!visible(block)) continue;
        token = Array.from(block.querySelectorAll<HTMLElement>('[data-token-start]')).find(visible) ?? null;
        if (token) break;
      }
    }
    const segment = token?.closest<HTMLElement>('[data-segment-id]');
    if (segment && token?.dataset.tokenStart !== undefined) {
      pending.current = { segment, start: token.dataset.tokenStart, top: token.getBoundingClientRect().top - viewport.top };
    }
  }, [bodyRef, mainRef, rulerEnabled]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    const anchor = pending.current;
    pending.current = null;
    if (rulerEnabled) fontAnchor.current = null;
    if (!main || !anchor || rulerEnabled) return;
    const restore = () => {
      const word = anchor.segment.querySelector<HTMLElement>(`[data-token-start="${anchor.start}"]`);
      if (!word || !main.contains(word)) return;
      const delta = word.getBoundingClientRect().top - main.getBoundingClientRect().top - anchor.top;
      if (Math.abs(delta) > 1) main.scrollTop += delta;
    };
    restore();
    const scrollTop = main.scrollTop;
    // Access geometry first so a font requested by this render is in the font set.
    if (document.fonts.status === 'loading') {
      fontAnchor.current = anchor;
      void document.fonts.ready.then(() => {
        if (fontAnchor.current === anchor && Math.abs(main.scrollTop - scrollTop) <= 1) restore();
        if (fontAnchor.current === anchor) fontAnchor.current = null;
      });
    }
  });
  return { capture, rememberWord };
}
