import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useVocabulary } from '../../hooks/useVocabulary';
import type { ReadingDocument } from '../../lib/document';
import { readVocabularySelection } from '../../lib/vocabulary-selection';
import type { SaveResult, VocabularyDraft } from '../../lib/vocabulary';
import { WordNote } from './WordNote';

type Props = { doc: ReadingDocument; body: RefObject<HTMLDivElement | null> };

export function QuickSaveWord(props: Props) {
  const library = useVocabulary();
  return <SelectionBar key={library.scope} {...props} library={library} />;
}

function SelectionBar({ doc, body, library }: Props & { library: ReturnType<typeof useVocabulary> }) {
  const bar = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<VocabularyDraft | null>(null);
  const [problem, setProblem] = useState('');
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [retry, setRetry] = useState(false);
  useEffect(() => {
    const capture = () => {
      const root = body.current;
      if (!root || bar.current?.contains(document.activeElement)) return;
      try {
        const selection = readVocabularySelection(root, doc);
        setProblem('');
        setDraft(selection);
        if (selection) { setSaved(null); setNoteSaved(false); setRetry(false); }
      } catch (error) {
        setDraft(null);
        setSaved(null);
        setProblem((error as Error).message);
      }
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [doc, body]);

  const save = async () => {
    if (!draft) return;
    const result = await library.save(draft);
    if (result) {
      setSaved(result);
      setRetry(false);
    } else { setDraft(draft); setRetry(true); }
  };
  return <div ref={bar}>
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
      <p role="status" className="min-w-0 break-words">
        {saved && noteSaved ? `Đã lưu ghi chú cho “${saved.entry.term}”.` : saved ? (saved.created ? `Đã lưu “${saved.entry.term}”.` : `“${saved.entry.term}” đã có trong thư viện.`)
          : !draft && !problem ? 'Chọn từ hoặc cụm từ trong bài để lưu.' : ''}
      </p>
      {saved ? <WordNote key={saved.entry.id} entry={saved.entry} busy={!!library.busy} save={library.edit}
        onSaved={entry => { setSaved({ ...saved, entry }); setNoteSaved(true); }} /> :
        draft && <button type="button" disabled={!library.ready || library.busy}
          onPointerDown={event => event.preventDefault()} onClick={save}
          className="max-w-full break-words rounded-full bg-primary px-4 py-2 text-on-primary disabled:opacity-60">
          {library.busy ? 'Đang lưu…' : retry ? `Thử lại · Lưu “${draft.term}”` : `Lưu “${draft.term}”`}
        </button>}
    </div>
    {(problem || ((retry || saved) && library.error)) && <p role="alert" className="mt-2 text-error">{problem || library.error}</p>}
  </div>;
}
