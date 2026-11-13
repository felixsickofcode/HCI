import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../../components/layout';
import { useVocabulary } from '../../hooks/useVocabulary';
import { dateBounds } from '../../lib/vocabulary';
import type { VocabularyEntry, VocabularyFilters } from '../../lib/vocabulary';

function DeleteConfirmation({ entry, busy, error, onDelete, onClose }: {
  entry: VocabularyEntry | 'all'; busy: boolean; error?: string;
  onDelete: () => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    const previous = document.activeElement;
    el?.showModal();
    return () => { el?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="delete-word-title"
      className="w-[calc(100%_-_2rem)] max-w-md rounded-3xl bg-[#FFFDF8] p-6 text-on-surface shadow-xl backdrop:bg-black/30">
      <h2 id="delete-word-title" className="text-lg font-semibold">
        {entry === 'all' ? 'Xóa toàn bộ thư viện?' : `Xóa “${entry.term}”?`}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        {entry === 'all' ? 'Xóa mọi từ trong kho đang dùng, kể cả các từ ngoài bộ lọc hiện tại.' : 'Từ này sẽ được xóa khỏi kho đang dùng.'}
        {' '}Thao tác này không thể hoàn tác.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button autoFocus type="button" onClick={onClose} disabled={busy} className="rounded-full border px-5 py-2.5">Giữ lại</button>
        <button type="button" onClick={onDelete} disabled={busy} className="rounded-full bg-error px-5 py-2.5 text-on-error disabled:opacity-50">
          {busy ? 'Đang xóa…' : 'Xác nhận xóa'}
        </button>
      </div>
    </dialog>
  );
}

export function Vocabulary() {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState({ scope: '', value: 0 });
  const [confirmation, setConfirmation] = useState<{ scope: string; entry: VocabularyEntry | 'all' }>();
  const [notice, setNotice] = useState<{ scope: string; text: string }>();
  let bounds: Pick<VocabularyFilters, 'from' | 'to'> = {};
  let dateError = '';
  try { bounds = dateBounds(from, to); } catch (error) { dateError = (error as Error).message; }
  // Account-scoped pagination prevents switching into a non-existent page of another account.
  const filters = { q: search.trim(), sourceDocumentId: source, ...bounds, skip: offset.value, limit: 20 };
  const library = useVocabulary(dateError ? undefined : filters);
  const { scope, signedIn, ready, page, sources, loading, busy, error } = library;
  useEffect(() => {
    if (offset.scope !== scope || (page && page.total > 0 && page.items.length === 0 && offset.value > 0)) {
      // Pagination reset is a response to a completed account/load transition.
      queueMicrotask(() => setOffset({ scope, value: page?.total ? Math.floor((page.total - 1) / 20) * 20 : 0 }));
    }
  }, [scope, offset.scope, offset.value, page]);
  const resetPage = () => setOffset({ scope, value: 0 });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const control = 'w-full rounded-xl border border-outline-variant/60 bg-[#FFFDF8] px-3 py-2.5 text-sm focus:outline-primary';

  return (
    <div className="min-h-screen bg-[#FAF7F0] font-body text-on-surface">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">Góp từng từ, hiểu thêm mỗi ngày</p>
            <h1 className="mt-3 font-headline text-3xl sm:text-4xl">Từ khó của tôi</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant">
              Những từ bạn chủ động lưu, cùng ngữ cảnh để đọc và ôn lại.
            </p>
          </div>
          <Link to="/reading" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm text-on-primary">
            <span className="material-symbols-outlined text-lg" aria-hidden>auto_stories</span>Trở lại bài đọc
          </Link>
        </div>

        <div role="note" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4 text-sm leading-relaxed">
          <span>{!ready ? 'Đang kiểm tra tài khoản…' : signedIn
            ? 'Thư viện riêng của tài khoản đang đăng nhập. Từ lưu khi dùng khách vẫn ở riêng trên trình duyệt.'
            : 'Chỉ lưu trên trình duyệt này. Xóa dữ liệu trình duyệt sẽ mất các từ đã lưu; đăng nhập không tự chuyển những từ này lên tài khoản.'}</span>
          {!signedIn && ready && <Link to="/login" state={{ from: '/vocabulary' }} className="font-semibold text-primary underline">Đăng nhập</Link>}
        </div>

        <section aria-label="Tìm và lọc từ đã lưu" className="mt-7 rounded-2xl border border-black/5 bg-white/50 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-on-surface-variant">Tìm từ/cụm từ
              <input type="search" aria-label="Tìm từ/cụm từ" value={search} maxLength={120}
                onChange={e => { setSearch(e.target.value); resetPage(); }} placeholder="Ví dụ: sinh học" className={`mt-2 ${control}`} />
            </label>
            <label className="text-xs font-medium text-on-surface-variant">Tài liệu nguồn
              <select value={source} onChange={e => { setSource(e.target.value); resetPage(); }} className={`mt-2 ${control}`}>
                <option value="">Mọi tài liệu</option>
                {source && !sources.some(s => s.sourceDocumentId === source) && <option value={source}>Nguồn đã chọn</option>}
                {sources.map(s => <option key={s.sourceDocumentId} value={s.sourceDocumentId}>{s.sourceTitle}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-on-surface-variant">Lưu từ ngày
              <input type="date" value={from} onChange={e => { setFrom(e.target.value); resetPage(); }} className={`mt-2 ${control}`} />
            </label>
            <label className="text-xs font-medium text-on-surface-variant">Đến hết ngày
              <input type="date" value={to} onChange={e => { setTo(e.target.value); resetPage(); }} className={`mt-2 ${control}`} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button type="button" onClick={() => { setSearch(''); setSource(''); setFrom(''); setTo(''); resetPage(); }} className="text-primary underline">Bỏ bộ lọc</button>
            <button type="button" disabled={!ready || busy} onClick={() => setConfirmation({ scope, entry: 'all' })}
              className="rounded-lg px-2 py-1 text-error hover:bg-error/5 disabled:opacity-40">Xóa toàn bộ thư viện</button>
          </div>
        </section>

        {dateError && <p role="alert" className="mt-5 text-error">{dateError}</p>}
        {error && <div role="alert" className="mt-5 rounded-xl bg-error/5 p-4 text-sm text-error">
          <p>{error}</p>
          <div className="mt-2 flex gap-4">
            <button type="button" onClick={library.refresh} className="underline">Thử lại</button>
            {signedIn && <Link to="/login" state={{ from: '/vocabulary' }} className="underline">Đăng nhập lại</Link>}
          </div>
        </div>}
        {notice?.scope === scope && <p role="status" className="mt-4 text-sm text-primary">{notice.text}</p>}
        {!dateError && loading && <p role="status" className="py-12 text-center text-on-surface-variant">Đang tải thư viện…</p>}
        {!dateError && !loading && page && <>
          <p className="my-5 text-sm text-on-surface-variant">{page.total} từ/cụm từ · Mới nhất trước</p>
          {page.total === 0 ? <div className="rounded-3xl border border-dashed border-outline-variant bg-white/40 px-6 py-14 text-center">
            <span className="material-symbols-outlined text-4xl text-tertiary" aria-hidden>bookmark_border</span>
            <h2 className="mt-4 text-xl font-headline">{search || source || from || to ? 'Chưa tìm thấy từ phù hợp' : 'Bắt đầu từ một từ bạn muốn nhớ'}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-on-surface-variant">
              Mở bài đọc, bôi chọn từ hoặc cụm từ rồi bấm “Lưu từ đã chọn”. Bạn có thể ghi thêm nghĩa theo cách hiểu của mình.
            </p>
            <Link to="/" className="mt-6 inline-block rounded-full border border-primary/30 px-5 py-2.5 text-sm text-primary">Chọn văn bản để đọc</Link>
          </div> : <ul className="space-y-4">
            {page.items.map(entry => <li key={entry.id} className="rounded-2xl border border-black/5 bg-[#FFFDF8] p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="break-words font-headline text-xl font-semibold text-primary">{entry.term}</h2>
                  <p className="mt-2 text-xs text-on-surface-variant break-words">Lưu {formatDate(entry.createdAt)} · {entry.sourceTitle || 'Không có tên nguồn'}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => setConfirmation({ scope, entry })} aria-label={`Xóa từ ${entry.term}`}
                  className="shrink-0 rounded-full p-2 text-on-surface-variant hover:bg-error/10 hover:text-error">
                  <span className="material-symbols-outlined text-xl" aria-hidden>delete</span>
                </button>
              </div>
              <p className={`mt-4 whitespace-pre-wrap break-words leading-relaxed ${entry.meaning ? '' : 'text-sm italic text-on-surface-variant'}`}>
                {entry.meaning || 'Chưa ghi nghĩa. Hãy đọc lại từ trong ngữ cảnh bên dưới.'}
              </p>
              {entry.example && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed"><strong>Ví dụ:</strong> {entry.example}</p>}
              <details className="mt-4 text-sm text-on-surface-variant">
                <summary className="cursor-pointer text-primary">Xem ngữ cảnh đã lưu</summary>
                <blockquote className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-surface-container-low p-4 leading-loose">{entry.contextText}</blockquote>
              </details>
            </li>)}
          </ul>}
          {page.total > page.limit && <nav aria-label="Phân trang thư viện" className="mt-7 flex items-center justify-center gap-5 text-sm">
            <button disabled={page.skip === 0 || busy} onClick={() => setOffset({ scope, value: Math.max(0, page.skip - page.limit) })} className="rounded-full border px-4 py-2 disabled:opacity-40">Trang trước</button>
            <span>{Math.floor(page.skip / page.limit) + 1} / {Math.ceil(page.total / page.limit)}</span>
            <button disabled={page.skip + page.limit >= page.total || busy} onClick={() => setOffset({ scope, value: page.skip + page.limit })} className="rounded-full border px-4 py-2 disabled:opacity-40">Trang sau</button>
          </nav>}
        </>}
        {confirmation?.scope === scope && <DeleteConfirmation entry={confirmation.entry} busy={!!busy} error={error}
          onClose={() => setConfirmation(undefined)} onDelete={async () => {
            if (await library.remove(confirmation.entry === 'all' ? undefined : confirmation.entry.id)) {
              setConfirmation(undefined);
              setNotice({ scope, text: confirmation.entry === 'all' ? 'Đã xóa thư viện đang dùng.' : 'Đã xóa từ khỏi thư viện.' });
              resetPage();
            }
          }} />}
      </main>
    </div>
  );
}
