import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { ExplanationResponse, WordSelection } from '../../lib/assist';

export type PopoverCloseReason = 'restore-focus' | 'outside';

export function WordExplanationPopover({ selection, result, loading, error, signedIn, needsLogin,
  saveStatus, saveError, onExplain, onSave, onRead, speechSupported, onClose }: {
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
  const left = Math.max(12, Math.min(selection.rect.left, window.innerWidth - 332));
  const top = Math.max(12, Math.min(selection.rect.bottom + 8, window.innerHeight - 340));
  const disabled = !signedIn || needsLogin || saveStatus === 'explaining' || saveStatus === 'saving';
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-label={`Giải nghĩa ${selection.selectedText}`}
      className="fixed z-[80] w-[min(320px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-y-auto rounded-xl border border-black/10 bg-white p-4 text-[#17294D] shadow-xl font-body text-sm"
      style={{ left, top }}
    >
      <div className="flex items-start justify-between gap-3">
        <strong className="min-w-0 max-h-24 overflow-y-auto break-words text-base">{selection.selectedText}</strong>
        <button type="button" onClick={() => onClose('restore-focus')} aria-label="Đóng giải nghĩa" className="rounded p-1 hover:bg-black/5">×</button>
      </div>
      <button type="button" onClick={onRead} disabled={!speechSupported}
        className="mt-3 w-full rounded-lg border border-[#1556B8] px-4 py-2 font-semibold text-[#1556B8] disabled:opacity-60">
        Đọc phần đã chọn
      </button>
      {!speechSupported && <p className="mt-1 text-xs">Trình duyệt không hỗ trợ giọng đọc.</p>}
      <p className="mt-1 text-xs text-[#63718A]">Nội dung chọn và đoạn chứa nó sẽ được gửi tới Groq để giải nghĩa.</p>
      {!signedIn || needsLogin ? <Link ref={loginRef} to="/login" state={{ from: '/reading' }} className="mt-3 inline-block rounded-lg bg-[#1556B8] px-4 py-2 font-semibold text-white">Đăng nhập để tiếp tục</Link> : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button ref={actionRef} type="button" onClick={onExplain} disabled={loading}
            className="rounded-lg bg-[#1556B8] px-4 py-2 font-semibold text-white disabled:opacity-60">
            {loading ? 'Đang giải nghĩa…' : error ? 'Thử lại · Giải nghĩa' : 'Giải nghĩa'}
          </button>
          <button type="button" onClick={onSave} disabled={disabled}
            className="rounded-lg border border-[#1556B8] px-4 py-2 font-semibold text-[#1556B8] disabled:opacity-60">
            {saveStatus === 'explaining' ? 'Đang lấy nghĩa…' : saveStatus === 'saving' ? 'Đang lưu…' : saveStatus === 'saved' ? 'Đã lưu' : saveStatus === 'duplicate' ? 'Đã có trong thư viện' : 'Lưu từ'}
          </button>
        </div>
      )}
      {loading && <p role="status" className="mt-3">Đang giải nghĩa…</p>}
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      {saveError && <p role="alert" className="mt-3 text-red-700">{saveError}</p>}
      {saveStatus === 'saved' && <p role="status" className="mt-3">Đã lưu từ và nghĩa</p>}
      {saveStatus === 'duplicate' && <p role="status" className="mt-3">Từ đã có trong thư viện</p>}
      {result && <div className="mt-3 space-y-2"><p>{result.meaning}</p><p><span className="font-semibold">Ví dụ:</span> {result.example}</p><p className="text-xs text-[#63718A]">Nội dung do AI tạo</p></div>}
    </div>,
    document.body,
  );
}
