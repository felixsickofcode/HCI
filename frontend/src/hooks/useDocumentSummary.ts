import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { contentVersion, summarizeDocument } from '../lib/assist';
import type { SummarizeResponse, SummarySegmentInput } from '../lib/assist';
import type { ReadingBlock } from '../lib/document';
import { ApiError } from '../lib/api';

const SUMMARIZABLE_TYPES = new Set(['paragraph', 'heading', 'listItem', 'quote']);

export function buildSummarySegments(blocks: ReadingBlock[]): SummarySegmentInput[] {
  return blocks
    .filter((block) => SUMMARIZABLE_TYPES.has(block.type) && block.text.trim().length > 0)
    .map((block) => ({ id: block.id, text: block.text }));
}

export function useDocumentSummary(
  documentId: string | undefined,
  blocks: ReadingBlock[],
  userId: number | undefined,
) {
  const segments = useMemo(() => buildSummarySegments(blocks), [blocks]);
  const [result, setResult] = useState<SummarizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);
  const pendingRef = useRef<{ key: string; promise: Promise<SummarizeResponse | null> } | null>(null);

  const clear = useCallback(() => {
    sequenceRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    pendingRef.current = null;
    setResult(null);
    setLoading(false);
    setError('');
    setNeedsLogin(false);
    setActiveItemId(null);
  }, []);

  useEffect(() => clear, [documentId, userId, clear]);

  const summarize = useCallback((): Promise<SummarizeResponse | null> => {
    if (!documentId) return Promise.resolve(null);
    if (segments.length === 0) {
      setError('Tài liệu chưa có đoạn văn bản để rút ý chính.');
      return Promise.resolve(null);
    }

    const key = JSON.stringify([documentId, userId ?? 'guest', segments.map((s) => [s.id, s.text])]);
    if (pendingRef.current?.key === key) return pendingRef.current.promise;

    const reqSeq = ++sequenceRef.current;
    controllerRef.current?.abort();
    const abort = new AbortController();
    controllerRef.current = abort;

    setLoading(true);
    setError('');
    setNeedsLogin(false);

    const promise = (async (): Promise<SummarizeResponse | null> => {
      try {
        const expectedVersion = await contentVersion(segments);
        if (reqSeq !== sequenceRef.current) return null;

        if (
          result &&
          result.documentId === documentId &&
          result.contentVersion === expectedVersion
        ) {
          return result;
        }

        const response = await summarizeDocument(
          { documentId, segments },
          abort.signal,
        );
        if (reqSeq !== sequenceRef.current) return null;

        if (
          response.documentId !== documentId ||
          response.contentVersion !== expectedVersion
        ) {
          throw new Error('Nội dung bài đọc đã thay đổi. Hãy thử rút ý chính lại.');
        }

        setResult(response);
        setActiveItemId(response.items[0]?.id ?? null);
        return response;
      } catch (cause) {
        if (reqSeq === sequenceRef.current && !abort.signal.aborted) {
          if (cause instanceof ApiError && cause.status === 401) {
            setNeedsLogin(true);
            setError('Vui lòng đăng nhập để dùng tính năng rút ý chính.');
          } else {
            setError(cause instanceof Error ? cause.message : 'Không thể rút ý chính lúc này.');
          }
        }
        return null;
      } finally {
        if (reqSeq === sequenceRef.current) {
          setLoading(false);
          pendingRef.current = null;
        }
      }
    })();

    pendingRef.current = { key, promise };
    return promise;
  }, [documentId, result, segments, userId]);

  return {
    segments,
    result,
    loading,
    error,
    needsLogin,
    activeItemId,
    setActiveItemId,
    summarize,
    clear,
  };
}
