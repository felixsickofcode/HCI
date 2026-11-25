import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/auth-context';
import type { ReadingDocument } from '../lib/document';
import type { ExplanationResponse, WordSelection } from '../lib/assist';
import { useVocabulary } from './useVocabulary';

type SaveStatus = 'idle' | 'explaining' | 'saving' | 'saved' | 'duplicate';
type Operation = { key: string; status: SaveStatus; error?: string };

export function useSaveSelectedWord(doc: ReadingDocument | null | undefined, selection: WordSelection | null,
  explain: () => Promise<import('../lib/assist').ExplanationResponse | null>) {
  const { user, token } = useAuth();
  const library = useVocabulary();
  const [operation, setOperation] = useState<Operation | null>(null);
  const run = useRef(0);
  const selectionRef = useRef(selection);
  const scopeRef = useRef(library.scope);
  useEffect(() => {
    selectionRef.current = selection;
    scopeRef.current = library.scope;
    run.current += 1;
    return () => { run.current += 1; };
  }, [doc?.id, selection, library.scope]);

  const key = JSON.stringify([library.scope, doc?.id, selection?.segmentId, selection?.start, selection?.end,
    selection?.selectedText, selection?.contextText]);
  const status: SaveStatus = operation?.key === key ? operation.status : 'idle';
  const error = operation?.key === key ? operation.error || '' : library.error || '';

  const save = useCallback(async (known?: ExplanationResponse | null) => {
    if (!selection || !doc || !user || !token || !library.ready || status === 'explaining' || status === 'saving') return;
    const selected = selection;
    const docId = doc.id;
    const accountScope = library.scope;
    const request = ++run.current;
    const stillCurrent = () => run.current === request && selectionRef.current === selected &&
      scopeRef.current === accountScope;
    // Nghĩa đã hiện trên popover thì dùng luôn, không gọi lại Groq.
    const reuse = known && known.segmentId === selected.segmentId && known.start === selected.start
      && known.end === selected.end && known.term === selected.selectedText ? known : null;
    setOperation({ key, status: reuse ? 'saving' : 'explaining' });
    const explanation = reuse ?? await explain();
    if (!stillCurrent()) return;
    if (!explanation) {
      setOperation({ key, status: 'idle', error: 'Chưa lấy được nghĩa. Hãy thử lại.' });
      return;
    }
    setOperation({ key, status: 'saving' });
    const saved = await library.save({
      term: selected.selectedText,
      meaning: explanation.meaning,
      example: explanation.example,
      contextText: selected.contextText,
      sourceDocumentId: docId,
      sourceTitle: doc.title,
      sourceKind: doc.source,
      contentVersion: explanation.contentVersion,
      segmentId: selected.segmentId,
      start: selected.start,
      end: selected.end,
    });
    if (!stillCurrent()) return;
    if (!saved) {
      setOperation({ key, status: 'idle', error: library.error || 'Chưa lưu được từ. Hãy thử lại.' });
      return;
    }
    const entry = saved.entry;
    if (!entry.meaning?.trim()) {
      const updated = await library.edit(entry.id, explanation.meaning);
      if (!stillCurrent()) return;
      if (!updated) {
        setOperation({ key, status: 'idle', error: library.error || 'Từ đã có trong thư viện nhưng chưa bổ sung được nghĩa. Hãy thử lại.' });
        return;
      }
    }
    if (!stillCurrent()) return;
    setOperation({ key, status: saved.created ? 'saved' : 'duplicate' });
  }, [doc, explain, library, selection, status, token, user, key]);

  return { save, status, error, signedIn: !!user && !!token && library.ready };
}
