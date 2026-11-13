import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVocabulary } from '../../hooks/useVocabulary';
import type { VocabularyDraft } from '../../lib/vocabulary';

export function SaveVocabularyDialog({ draft, onClose }: { draft: VocabularyDraft; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [meaning, setMeaning] = useState(draft.meaning ?? '');
  const [saved, setSaved] = useState(false);
  const { save, ready, busy, error, signedIn, scope } = useVocabulary();
  // Remount form state on account changes; never keep a previous account's success state.
  const initialScope = useRef(scope);
  useEffect(() => {
    if (initialScope.current !== scope) onClose();
  }, [scope, onClose]);
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement;
    el?.showModal();
    return () => { el?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);

  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="save-word-title"
      className="w-[calc(100%_-_2rem)] max-w-lg rounded-3xl bg-[#FFFDF8] p-6 text-on-surface shadow-2xl backdrop:bg-black/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-tertiary">Từ khó của tôi</p>
          <h2 id="save-word-title" className="mt-2 text-xl font-semibold break-words">Lưu “{draft.term}”</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng hộp lưu từ" className="rounded-lg p-2 hover:bg-black/5">✕</button>
      </div>
      <blockquote className="mt-4 max-h-36 overflow-y-auto rounded-xl bg-surface-container-low p-4 text-sm leading-relaxed break-words">
        {draft.contextText}
      </blockquote>
      {saved ? (
        <div className="mt-5 space-y-4">
          <p role="status">Từ đã có trong thư viện. Bạn có thể ôn lại bất cứ lúc nào.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/vocabulary" className="rounded-full bg-primary px-5 py-2.5 text-on-primary">Xem thư viện</Link>
            <button type="button" onClick={onClose} className="rounded-full border px-5 py-2.5">Đọc tiếp</button>
          </div>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={async e => {
          e.preventDefault();
          if (await save({ ...draft, meaning: meaning.trim() || null })) setSaved(true);
        }}>
          <label className="block text-sm font-medium">
            Nghĩa / ghi chú (không bắt buộc)
            <textarea autoFocus value={meaning} onChange={e => setMeaning(e.target.value)} maxLength={2000} rows={3}
              placeholder="Ghi lại cách bạn hiểu từ này…" disabled={busy}
              className="mt-2 block w-full rounded-xl border border-outline-variant bg-white/70 p-3 font-normal focus:outline-primary" />
          </label>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            {signedIn ? 'Lưu riêng trong tài khoản đang đăng nhập.' : 'Chỉ lưu trên trình duyệt này. Các từ này sẽ không tự chuyển vào tài khoản khi bạn đăng nhập.'}
          </p>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-full border px-5 py-2.5">Hủy</button>
            <button type="submit" disabled={!ready || busy} className="rounded-full bg-primary px-5 py-2.5 text-on-primary disabled:opacity-50">
              {busy ? 'Đang lưu…' : 'Lưu vào thư viện'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
