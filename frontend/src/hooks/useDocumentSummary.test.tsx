import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { contentVersion } from '../lib/assist';
import * as assistApi from '../lib/assist';
import type { ReadingBlock } from '../lib/document';
import { useDocumentSummary } from './useDocumentSummary';

afterEach(() => {
  vi.restoreAllMocks();
});

const sampleBlocks: ReadingBlock[] = [
  { id: 'h1', type: 'heading', text: 'Tiêu đề bài đọc' },
  { id: 'p1', type: 'paragraph', text: 'Ánh sáng sinh học phát ra từ phản ứng hóa học tự nhiên mà không sinh nhiệt.' },
  { id: 's1', type: 'snapshot', text: 'Bảng số liệu', imageSrc: 'data:image/png;base64,AAA' },
  { id: 'p2', type: 'paragraph', text: 'Sinh vật biển sâu dùng ánh sáng xanh lam để giao tiếp trong bóng tối.' },
];

describe('useDocumentSummary', () => {
  it('filters only text segments, validates contentVersion, and selects the first summary item', async () => {
    const expectedSegments = [
      { id: 'h1', text: 'Tiêu đề bài đọc' },
      { id: 'p1', text: 'Ánh sáng sinh học phát ra từ phản ứng hóa học tự nhiên mà không sinh nhiệt.' },
      { id: 'p2', text: 'Sinh vật biển sâu dùng ánh sáng xanh lam để giao tiếp trong bóng tối.' },
    ];
    const hash = await contentVersion(expectedSegments);
    const spy = vi.spyOn(assistApi, 'summarizeDocument').mockResolvedValue({
      documentId: 'doc-1',
      contentVersion: hash,
      method: 'extractive',
      items: [
        { id: 'summary-1', text: expectedSegments[1].text, sources: ['p1'] },
        { id: 'summary-2', text: expectedSegments[2].text, sources: ['p2'] },
      ],
    });

    const { result } = renderHook(() => useDocumentSummary('doc-1', sampleBlocks, 7));

    await act(async () => {
      await result.current.summarize();
    });

    expect(spy).toHaveBeenCalledWith({ documentId: 'doc-1', segments: expectedSegments }, expect.any(AbortSignal));
    expect(result.current.result?.items).toHaveLength(2);
    expect(result.current.activeItemId).toBe('summary-1');
    expect(result.current.error).toBe('');

    // Re-calling summarize on unchanged blocks reuses the verified result without hitting API again
    await act(async () => {
      await result.current.summarize();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('flags needsLogin on 401 and clears state when switching documents or accounts', async () => {
    vi.spyOn(assistApi, 'summarizeDocument').mockRejectedValue(new ApiError('Not authenticated', 401));
    const { result, rerender } = renderHook(
      ({ docId, uid }) => useDocumentSummary(docId, sampleBlocks, uid),
      { initialProps: { docId: 'doc-1', uid: 7 as number | undefined } },
    );

    await act(async () => {
      await result.current.summarize();
    });

    expect(result.current.needsLogin).toBe(true);
    expect(result.current.error).toContain('đăng nhập');

    rerender({ docId: 'doc-2', uid: 7 });
    expect(result.current.needsLogin).toBe(false);
    expect(result.current.error).toBe('');
  });
});
