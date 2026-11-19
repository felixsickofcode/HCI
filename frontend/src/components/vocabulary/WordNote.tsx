import { useEffect, useRef, useState } from 'react';
import type { VocabularyEntry } from '../../lib/vocabulary';

interface Props {
  entry: VocabularyEntry;
  busy: boolean;
  save: (id: VocabularyEntry['id'], meaning: string | null) => Promise<VocabularyEntry | null>;
  onSaved?: (word: VocabularyEntry) => void;
}

export function WordNote({ entry, busy, save, onSaved }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const editing = draft !== null;
  useEffect(() => {
    if (editing) input.current?.focus({ preventScroll: true });
  }, [editing]);
  const close = () => {
    setDraft(null);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  };
  if (draft === null) return <button ref={trigger} type="button" disabled={busy}
    onClick={() => setDraft(entry.meaning ?? '')} className="py-2 text-sm font-medium text-primary underline">
    {entry.meaning ? 'Sửa ghi chú' : 'Thêm ghi chú'}
  </button>;
  return <form className="mt-2 space-y-2" onSubmit={async event => {
    event.preventDefault();
    const updated = await save(entry.id, draft.trim() || null);
    if (updated) { onSaved?.(updated); close(); }
  }}>
    <label className="block text-sm">Ghi chú cho “{entry.term}”
      <textarea ref={input} rows={2} value={draft} maxLength={2000} disabled={busy}
        onChange={event => setDraft(event.target.value)}
        className="mt-1 block w-full rounded-xl border bg-white px-3 py-2 text-on-surface" />
    </label>
    <div className="flex gap-4 text-sm">
      <button type="submit" disabled={busy} className="rounded-full bg-primary px-4 py-2 text-on-primary">{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      <button type="button" disabled={busy} onClick={close}>Hủy</button>
    </div>
  </form>;
}
