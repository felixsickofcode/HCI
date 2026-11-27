import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ExplanationResponse, WordSelection } from '../../lib/assist';
import { THEMES, type ThemePalette } from '../../context/DisplaySettingsProvider';

export type PopoverCloseReason = 'restore-focus' | 'outside';

export function WordExplanationPopover({ selection, result, loading, error, signedIn, needsLogin,
  saveStatus, saveError, onExplain, onSave, onRead, speechSupported, onClose, theme = THEMES.cream }: {
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
  theme?: ThemePalette;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loading || result || saveStatus === 'saved' || saveStatus === 'duplicate' || saveStatus === 'saving') {
      dialogRef.current?.focus();
    } else (signedIn && !needsLogin ? actionRef.current : loginRef.current)?.focus();
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
  }, [onClose, signedIn, needsLogin, loading, result, error, saveStatus]);
  const left = Math.max(12, Math.min(selection.rect.left, window.innerWidth - 348));
  const top = Math.max(12, Math.min(selection.rect.bottom + 8, window.innerHeight - 360));
  const disabled = !signedIn || needsLogin || saveStatus === 'explaining' || saveStatus === 'saving';
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-label={`Giải nghĩa ${selection.selectedText}`}
      className="fixed z-[80] w-[min(336px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl p-4 font-body text-sm"
      style={{
        left,
        top,
        backgroundColor: theme.panelBg,
        color: theme.fg,
        border: `1px solid ${theme.borderStrong}`,
        boxShadow: theme.isDark
          ? '0 20px 46px rgba(0, 0, 0, 0.55)'
          : '0 16px 38px rgba(27, 28, 29, 0.16)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <strong
          className="min-w-0 max-h-24 overflow-y-auto break-words text-base font-semibold"
          style={{ color: theme.activeFg }}
        >
          {selection.selectedText}
        </strong>
        <button
          type="button"
          onClick={() => onClose('restore-focus')}
          aria-label="Đóng giải nghĩa"
          className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-base font-semibold transition-colors"
          style={{
            backgroundColor: theme.surfaceBg,
            color: theme.secondaryText,
          }}
        >
          ×
        </button>
      </div>

      <button
        type="button"
        onClick={onRead}
        disabled={!speechSupported}
        className="mt-3 w-full rounded-xl px-4 py-2 font-semibold transition-colors disabled:opacity-60"
        style={{
          backgroundColor: theme.controlBg,
          border: `1px solid ${theme.borderStrong}`,
          color: theme.activeFg,
        }}
      >
        Đọc phần đã chọn
      </button>

      {!speechSupported && (
        <p className="mt-1.5 text-xs" style={{ color: theme.secondaryText }}>
          Trình duyệt không hỗ trợ giọng đọc.
        </p>
      )}
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.secondaryText }}>
        Nội dung chọn và đoạn chứa nó sẽ được gửi tới Groq để giải nghĩa.
      </p>

      {!signedIn || needsLogin ? (
        <Link
          ref={loginRef}
          to="/login"
          state={{ from: '/reading' }}
          className="mt-3 inline-block rounded-xl px-4 py-2 font-semibold"
          style={{ backgroundColor: theme.accent, color: theme.accentFg }}
        >
          Đăng nhập để tiếp tục
        </Link>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            ref={actionRef}
            type="button"
            onClick={onExplain}
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2 font-semibold transition-opacity disabled:opacity-60"
            style={{ backgroundColor: theme.accent, color: theme.accentFg }}
          >
            {loading ? 'Đang giải nghĩa…' : error ? 'Thử lại · Giải nghĩa' : 'Giải nghĩa'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={disabled}
            className="flex-1 rounded-xl px-4 py-2 font-semibold transition-opacity disabled:opacity-60"
            style={{
              backgroundColor: saveStatus === 'saved' ? theme.accentSoft : theme.controlBg,
              border: `1px solid ${theme.accent}`,
              color: theme.activeFg,
            }}
          >
            {saveStatus === 'explaining'
              ? 'Đang lấy nghĩa…'
              : saveStatus === 'saving'
                ? 'Đang lưu…'
                : saveStatus === 'saved'
                  ? 'Đã lưu'
                  : saveStatus === 'duplicate'
                    ? 'Đã có trong thư viện'
                    : 'Lưu từ'}
          </button>
        </div>
      )}

      {loading && (
        <p role="status" className="mt-3 text-xs font-medium" style={{ color: theme.secondaryText }}>
          Đang giải nghĩa…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
        >
          {error}
        </p>
      )}
      {saveError && (
        <p
          role="alert"
          className="mt-3 rounded-lg px-2.5 py-1.5 text-xs font-medium"
          style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
        >
          {saveError}
        </p>
      )}
      {saveStatus === 'saved' && (
        <p role="status" className="mt-3 text-xs font-semibold" style={{ color: theme.activeFg }}>
          Đã lưu từ và nghĩa
        </p>
      )}
      {saveStatus === 'duplicate' && (
        <p role="status" className="mt-3 text-xs font-semibold" style={{ color: theme.secondaryText }}>
          Từ đã có trong thư viện
        </p>
      )}

      {result && (
        <div
          className="mt-3 space-y-2.5 pt-3"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          <p className="leading-relaxed">{result.meaning}</p>
          <p
            className="rounded-r-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              backgroundColor: theme.controlBg,
              borderLeft: `3px solid ${theme.accent}`,
              color: theme.secondaryText,
            }}
          >
            <span className="font-semibold" style={{ color: theme.fg }}>Ví dụ:</span> {result.example}
          </p>
          <p className="text-[11px]" style={{ color: theme.secondaryText }}>
            Nội dung do AI tạo
          </p>
        </div>
      )}
    </div>,
    document.body,
  );
}
