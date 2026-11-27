import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import { contentVersion } from '../lib/assist';
import type { ReadingBlock } from '../lib/document';
import { summarizeDocument, toSummarySegments } from '../lib/summary';
import type { SummarizeResponse, SummaryLength, SummarySegment } from '../lib/summary';

export type SummaryMethod = 'extractive' | 'llm';

export function buildSummarySegments(blocks: ReadingBlock[]): SummarySegment[] {
  return toSummarySegments(blocks);
}

export function useDocumentSummary(
  documentId: string | undefined,
  blocks: ReadingBlock[],
  userId: number | undefined,
) {
  const segments = useMemo(() => buildSummarySegments(blocks), [blocks]);
  const [method, setMethodState] = useState<SummaryMethod>('extractive');
  const [length, setLengthState] = useState<SummaryLength>('medium');
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

  useEffect(() => clear, [documentId, userId, segments, clear]);

  const setMethod = useCallback((nextMethod: SummaryMethod) => {
    setMethodState(nextMethod);
    clear();
  }, [clear]);

  const selectLength = useCallback((nextLength: SummaryLength) => {
    setLengthState(nextLength);
    setResult((current) => {
      if (!current || current.method !== 'extractive') return current;
      const variant = current.variants?.find((item) => item.length === nextLength);
      if (!variant) return current;
      setActiveItemId((active) => (
        active && variant.items.some((item) => item.id === active)
          ? active
          : variant.items[0]?.id ?? null
      ));
      return { ...current, items: variant.items };
    });
  }, []);

  const summarize = useCallback((options?: {
    method?: SummaryMethod;
    length?: SummaryLength;
    force?: boolean;
  }): Promise<SummarizeResponse | null> => {
    if (!documentId) {
      setError('Không tìm thấy tài liệu để tóm tắt.');
      return Promise.resolve(null);
    }
    if (userId == null) {
      setNeedsLogin(true);
      setError('Hãy đăng nhập để sử dụng tính năng tóm tắt.');
      return Promise.resolve(null);
    }
    if (segments.length === 0) {
      setError('Tài liệu không có đoạn văn phù hợp để tóm tắt.');
      return Promise.resolve(null);
    }

    const reqMethod = options?.method ?? method;
    const reqLength = options?.length ?? length;
    const key = JSON.stringify([documentId, userId, reqMethod, reqLength, segments.map((s) => [s.id, s.text])]);
    if (!options?.force && pendingRef.current?.key === key) return pendingRef.current.promise;

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
          !options?.force &&
          result &&
          result.documentId === documentId &&
          result.contentVersion === expectedVersion &&
          result.method === reqMethod
        ) {
          if (reqMethod === 'extractive') {
            const variant = result.variants?.find((v) => v.length === reqLength);
            if (variant) {
              const updated = { ...result, items: variant.items };
              setResult(updated);
              setActiveItemId(updated.items[0]?.id ?? null);
              return updated;
            }
          }
          return result;
        }

        const response = await summarizeDocument(
          documentId,
          segments,
          reqMethod,
          reqLength,
          abort.signal,
        );
        if (reqSeq !== sequenceRef.current) return null;

        if (
          response.documentId !== documentId ||
          (response.contentVersion && response.contentVersion !== expectedVersion)
        ) {
          throw new Error('Nội dung bài đọc đã thay đổi. Hãy thử tạo lại tóm tắt.');
        }

        setResult(response);
        setActiveItemId(response.items[0]?.id ?? null);
        return response;
      } catch (cause) {
        if (reqSeq === sequenceRef.current && !abort.signal.aborted) {
          if (cause instanceof ApiError) {
            if (cause.status === 401) {
              setNeedsLogin(true);
              setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            } else if (cause.status === 429) {
              setError('Server đang giới hạn lượt tóm tắt.');
            } else if (cause.status === 413) {
              setError('Tài liệu quá dài để tóm tắt.');
            } else {
              setError(cause.message);
            }
          } else {
            setError(cause instanceof Error ? cause.message : 'Không thể tạo tóm tắt lúc này.');
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
  }, [documentId, length, method, result, segments, userId]);

  return {
    segments,
    method,
    setMethod,
    length,
    selectLength,
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
