import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { isAnchorVisible, placePopover } from '../../lib/popover-position';
import type { AnchorRect, ViewportSize } from '../../lib/popover-position';
import { rangeRect } from '../../lib/text-selection';
import type { ExplanationResponse, WordSelection } from '../../lib/assist';

export type PopoverCloseReason = 'restore-focus' | 'outside' | 'scrolled-away';

export interface WordExplanationPopoverProps {
  selection: WordSelection;
  result: ExplanationResponse | null;
  loading: boolean;
  error: string;
  signedIn: boolean;
  needsLogin: boolean;
  saveStatus: 'idle' | 'explaining' | 'saving' | 'saved' | 'duplicate';
  saveError: string;
  onExplain: () => void;
  onSave: () => void;
  onRead: () => void;
  speechSupported: boolean;
  onClose: (reason: PopoverCloseReason) => void;
  dark?: boolean;
}

const LIGHT = {
  panel: '#FFFDF8',
  border: 'rgba(27,28,29,0.14)',
  text: '#1b1c1d',
  muted: '#5a5f63',
  field: 'rgba(9,76,178,0.05)',
  accent: '#094cb2',
  onAccent: '#ffffff',
  ghost: 'rgba(27,28,29,0.05)',
};

const DARK = {
  panel: '#232B3B',
  border: 'rgba(232,234,240,0.2)',
  text: '#E8EAF0',
  muted: '#A9B4C7',
  field: 'rgba(255,255,255,0.07)',
  accent: '#9FC4FF',
  onAccent: '#0F1A2E',
  ghost: 'rgba(255,255,255,0.09)',
};

const anchorOf = (selection: WordSelection): AnchorRect => {
  const rect = rangeRect(selection.segmentId, selection.start, selection.end);
  return rect
    ? { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width }
    : { ...selection.rect, width: 0 };
};

const viewportOf = (): ViewportSize => ({ width: window.innerWidth, height: window.innerHeight });

export function WordExplanationPopover({
  selection, result, loading, error, signedIn, needsLogin, saveStatus, saveError,
  onExplain, onSave, onRead, speechSupported, onClose, dark = false,
}: WordExplanationPopoverProps) {
  const palette = dark ? DARK : LIGHT;
  const dialogRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const [anchor, setAnchor] = useState<AnchorRect>(() => anchorOf(selection));
  const [viewport, setViewport] = useState<ViewportSize>(viewportOf);

  // Bám theo vùng chọn khi trang cuộn hoặc đổi kích thước; chỉ đóng khi vùng chọn đã ra khỏi khung nhìn.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextAnchor = anchorOf(selection);
      setAnchor((current) =>
        Math.abs(current.left - nextAnchor.left) < 0.5
        && Math.abs(current.top - nextAnchor.top) < 0.5
        && Math.abs(current.bottom - nextAnchor.bottom) < 0.5
          ? current
          : nextAnchor);
      const nextViewport = viewportOf();
      setViewport((current) =>
        current.width === nextViewport.width && current.height === nextViewport.height
          ? current
          : nextViewport);
    };
    const schedule = () => {
      if (frame) return;
      frame = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(update)
        : window.setTimeout(update, 0);
    };
    schedule();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      if (frame) {
        if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
        else window.clearTimeout(frame);
      }
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [selection]);

  useEffect(() => {
    if (!isAnchorVisible(anchor, viewport)) onClose('scrolled-away');
  }, [anchor, viewport, onClose]);

  useEffect(() => {
    const busy = loading || saveStatus === 'explaining' || saveStatus === 'saving';
    const hasPanel = !!result || saveStatus === 'saved' || saveStatus === 'duplicate';
    if (busy || hasPanel) dialogRef.current?.focus();
    else (signedIn && !needsLogin ? actionRef.current : loginRef.current)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose('restore-focus');
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) onClose('outside');
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onClose, signedIn, needsLogin, loading, result, saveStatus]);

  const placement = placePopover(anchor, viewport);
  const loggedOut = !signedIn || needsLogin;
  const disabled = loggedOut || saveStatus === 'explaining' || saveStatus === 'saving';
  const announce = saveStatus === 'saving' || saveStatus === 'explaining'
    ? 'Đang lưu từ'
    : saveStatus === 'saved'
      ? 'Đã lưu từ và nghĩa'
      : saveStatus === 'duplicate'
        ? 'Từ đã có trong sổ từ'
        : loading
          ? 'Đang giải nghĩa'
          : error || saveError;
  const explainLabel = loading ? 'Đang giải nghĩa…' : error ? 'Thử lại' : result ? 'Tra lại' : 'Giải nghĩa';
  const saveLabel = saveStatus === 'explaining'
    ? 'Đang lấy nghĩa…'
    : saveStatus === 'saving'
      ? 'Đang lưu…'
      : saveStatus === 'saved'
        ? 'Đã lưu'
        : saveStatus === 'duplicate'
          ? 'Đã có trong sổ'
          : 'Lưu từ';

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-label={`Giải nghĩa ${selection.selectedText}`}
      className="popover-enter fixed z-[80] overflow-y-auto rounded-2xl border p-4 shadow-2xl font-body"
      style={{
        left: placement.left,
        top: placement.top,
        width: placement.width,
        maxHeight: placement.maxHeight,
        background: palette.panel,
        borderColor: palette.border,
        color: palette.text,
        // Mũi nhọn bên trên khi lật lên: dịch cả khối bằng biến CSS để animation không ghi đè.
        ['--popover-shift' as string]: placement.placement === 'above' ? '-100%' : '0',
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-3 w-3 rotate-45 border"
        style={{
          left: placement.caretLeft - 6,
          background: palette.panel,
          borderColor: palette.border,
          ...(placement.placement === 'below' ? { top: -7 } : { bottom: -7 }),
        }}
      />

      <div className="flex items-start gap-2">
        <h2
          className="min-w-0 flex-1 break-words font-headline text-[17px] font-semibold leading-snug"
          style={{ color: palette.text }}
        >
          {selection.selectedText}
        </h2>
        <button
          type="button"
          onClick={onRead}
          disabled={!speechSupported}
          aria-label="Đọc phần đã chọn"
          title={speechSupported ? 'Đọc phần đã chọn' : 'Trình duyệt không hỗ trợ giọng đọc'}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40"
          style={{ background: palette.ghost, color: palette.accent }}
        >
          <span className="material-symbols-outlined text-[19px]" aria-hidden="true">volume_up</span>
        </button>
        <button
          type="button"
          onClick={() => onClose('restore-focus')}
          aria-label="Đóng giải nghĩa"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors"
          style={{ background: palette.ghost, color: palette.muted }}
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
        </button>
      </div>

      {loggedOut ? (
        <div className="mt-3 space-y-2.5">
          <p className="text-[13px] leading-relaxed" style={{ color: palette.muted }}>
            Đăng nhập để giải nghĩa và lưu từ. Tài khoản chỉ dùng cho tính năng này, không đổi vị trí đọc.
          </p>
          <Link
            ref={loginRef}
            to="/login"
            state={{ from: '/reading' }}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-label font-semibold"
            style={{ background: palette.accent, color: palette.onAccent }}
          >
            Đăng nhập
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <>
          {result && (
            <div className="mt-3 space-y-2">
              <p className="text-[13.5px] leading-relaxed">{result.meaning}</p>
              {result.example && (
                <p
                  className="rounded-xl px-3 py-2 text-[12.5px] italic leading-relaxed"
                  style={{ background: palette.field, color: palette.text }}
                >
                  {result.example}
                </p>
              )}
              <p className="text-[11px]" style={{ color: palette.muted }}>
                Nội dung do AI tạo
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              ref={actionRef}
              type="button"
              onClick={onExplain}
              disabled={loading}
              className="rounded-full px-3.5 py-1.5 text-xs font-label font-semibold transition-colors disabled:opacity-60"
              style={result
                ? { background: palette.ghost, color: palette.text }
                : { background: palette.accent, color: palette.onAccent }}
            >
              {explainLabel}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={disabled || saveStatus === 'saved' || saveStatus === 'duplicate'}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-label font-semibold transition-colors disabled:opacity-60"
              style={{ background: palette.ghost, color: saveStatus === 'saved' ? palette.accent : palette.text }}
            >
              {saveStatus === 'saving' || saveStatus === 'explaining' ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              ) : saveStatus === 'saved' ? (
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">check</span>
              ) : (
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">bookmark_add</span>
              )}
              {saveLabel}
            </button>
            {saveStatus === 'saved' && (
              <Link
                to="/vocabulary"
                className="text-[12px] font-label font-medium underline underline-offset-2"
                style={{ color: palette.accent }}
              >
                Xem sổ từ
              </Link>
            )}
          </div>

          {(error || saveError) && (
            <p role="alert" className="mt-2.5 text-[12px] leading-relaxed" style={{ color: '#c0392b' }}>
              {error || saveError}
            </p>
          )}

          <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: palette.muted }}>
            Từ đang chọn và đoạn chứa nó được gửi tới Groq để giải nghĩa.
          </p>
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </div>,
    document.body,
  );
}
