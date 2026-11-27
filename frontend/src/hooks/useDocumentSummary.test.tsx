import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { contentVersion } from '../lib/assist';
import type { ReadingBlock } from '../lib/document';
import * as summaryApi from '../lib/summary';
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
  it('filters text segments, validates contentVersion, switches extractive length variants, and supports method switch', async () => {
    const expectedSegments = [
      { id: 'h1', text: 'Tiêu đề bài đọc' },
      { id: 'p1', text: 'Ánh sáng sinh học phát ra từ phản ứng hóa học tự nhiên mà không sinh nhiệt.' },
      { id: 'p2', text: 'Sinh vật biển sâu dùng ánh sáng xanh lam để giao tiếp trong bóng tối.' },
    ];
    const hash = await contentVersion(expectedSegments);
    const shortItems = [{ id: 'summary-1', text: expectedSegments[1].text, sources: ['p1'] }];
    const mediumItems = [
      { id: 'summary-1', text: expectedSegments[1].text, sources: ['p1'] },
      { id: 'summary-2', text: expectedSegments[2].text, sources: ['p2'] },
    ];
    const spy = vi.spyOn(summaryApi, 'summarizeDocument').mockResolvedValue({
      documentId: 'doc-1',
      contentVersion: hash,
      method: 'extractive',
      items: mediumItems,
      variants: [
        { length: 'short', items: shortItems },
        { length: 'medium', items: mediumItems },
        { length: 'long', items: mediumItems },
      ],
    });

    const { result } = renderHook(() => useDocumentSummary('doc-1', sampleBlocks, 7));

    await act(async () => {
      await result.current.summarize();
    });

    expect(spy).toHaveBeenCalledWith('doc-1', expectedSegments, 'extractive', 'medium', expect.any(AbortSignal));
    expect(result.current.result?.items).toHaveLength(2);
    expect(result.current.activeItemId).toBe('summary-1');
    expect(result.current.error).toBe('');

    // Switching extractive length updates items directly from variants without a new request
    act(() => {
      result.current.selectLength('short');
    });
    expect(result.current.length).toBe('short');
    expect(result.current.result?.items).toEqual(shortItems);
    expect(spy).toHaveBeenCalledTimes(1);

    // Re-calling summarize on unchanged blocks reuses the verified result without hitting API again
    await act(async () => {
      await result.current.summarize();
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // Switching to llm clears existing extractive result and calls API with method='llm'
    act(() => {
      result.current.setMethod('llm');
    });
    expect(result.current.result).toBeNull();
    spy.mockResolvedValueOnce({
      documentId: 'doc-1',
      contentVersion: hash,
      method: 'llm',
      items: shortItems,
      variants: [],
    });
    await act(async () => {
      await result.current.summarize();
    });
    expect(spy).toHaveBeenLastCalledWith('doc-1', expectedSegments, 'llm', 'short', expect.any(AbortSignal));
  });

  it('flags needsLogin on 401, maps 429/413 errors, and clears state when switching documents', async () => {
    const spy = vi.spyOn(summaryApi, 'summarizeDocument')
      .mockRejectedValueOnce(new ApiError('Not authenticated', 401))
      .mockRejectedValueOnce(new ApiError('Rate limited', 429));
    const { result, rerender } = renderHook(
      ({ docId, uid }) => useDocumentSummary(docId, sampleBlocks, uid),
      { initialProps: { docId: 'doc-1', uid: 7 as number | undefined } },
    );

    await act(async () => {
      await result.current.summarize();
    });

    expect(result.current.needsLogin).toBe(true);
    expect(result.current.error).toContain('đăng nhập');

    await act(async () => {
      await result.current.summarize({ force: true });
    });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.current.needsLogin).toBe(false);
    expect(result.current.error).toContain('giới hạn');

    rerender({ docId: 'doc-2', uid: 7 });
    expect(result.current.needsLogin).toBe(false);
    expect(result.current.error).toBe('');
  });
});
