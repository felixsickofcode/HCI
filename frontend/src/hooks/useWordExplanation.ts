import { useCallback, useEffect, useRef, useState } from 'react';
import { contentVersion, explainWord } from '../lib/assist';
import type { ExplanationResponse, WordSelection } from '../lib/assist';
import type { ReadingBlock } from '../lib/document';
import { ApiError } from '../lib/api';

export function useWordExplanation(documentId: string | undefined, blocks: ReadingBlock[]) {
  const [selection, setSelection] = useState<WordSelection | null>(null);
  const [result, setResult] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const pending = useRef<{ key: string; promise: Promise<ExplanationResponse | null> } | null>(null);

  const clear = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    pending.current = null;
    setSelection(null);
    setResult(null);
    setLoading(false);
    setError('');
    setNeedsLogin(false);
  }, []);

  useEffect(() => clear, [documentId, clear]);

  const choose = useCallback((next: WordSelection) => {
    sequence.current += 1;
    controller.current?.abort();
    pending.current = null;
    setSelection(next);
    setResult(null);
    setLoading(false);
    setError('');
    setNeedsLogin(false);
  }, []);

  const explain = useCallback((): Promise<ExplanationResponse | null> => {
    if (!documentId || !selection) return Promise.resolve(null);
    const key = JSON.stringify([documentId, selection.segmentId, selection.start, selection.end, selection.selectedText, selection.contextText]);
    if (pending.current?.key === key) return pending.current.promise;
    const requestSequence = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError('');
    setNeedsLogin(false);
    setResult(null);
    const promise = (async (): Promise<ExplanationResponse | null> => {
    try {
      const version = await contentVersion(blocks);
      if (requestSequence !== sequence.current) return null;
      if (result && result.documentId === documentId && result.contentVersion === version &&
        result.segmentId === selection.segmentId && result.start === selection.start &&
        result.end === selection.end && result.term === selection.selectedText) return result;
      const response = await explainWord({
        documentId,
        contentVersion: version,
        segmentId: selection.segmentId,
        contextText: selection.contextText,
        selectedText: selection.selectedText,
        start: selection.start,
        end: selection.end,
      }, abort.signal);
      if (requestSequence !== sequence.current) return null;
      if (response.documentId !== documentId || response.contentVersion !== version ||
        response.segmentId !== selection.segmentId || response.start !== selection.start ||
        response.end !== selection.end || response.term !== selection.selectedText) {
        throw new Error('Kết quả không khớp vùng chọn. Hãy thử lại.');
      }
      setResult(response);
      return response;
    } catch (cause) {
      if (requestSequence === sequence.current && !abort.signal.aborted) {
        if (cause instanceof ApiError && cause.status === 401) {
          setNeedsLogin(true);
          setError('Phiên đăng nhập đã hết hạn.');
        } else {
          setError(cause instanceof Error ? cause.message : 'Không thể giải nghĩa lúc này.');
        }
      }
      return null;
    } finally {
      if (requestSequence === sequence.current) {
        setLoading(false);
        pending.current = null;
      }
    }
    })();
    pending.current = { key, promise };
    return promise;
  }, [blocks, documentId, result, selection]);

  return { selection, result, loading, error, needsLogin, choose, explain, clear };
}
