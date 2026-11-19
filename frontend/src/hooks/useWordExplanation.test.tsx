import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWordExplanation } from './useWordExplanation';
import { contentVersion, explainWord } from '../lib/assist';
import type { ExplanationResponse, WordSelection } from '../lib/assist';

vi.mock('../lib/assist', () => ({
  contentVersion: vi.fn(async () => 'hash-1'),
  explainWord: vi.fn(),
}));

const blocks = [{ id: 'block-1', type: 'paragraph' as const, text: 'sinh học và toán học' }];
const first: WordSelection = {
  segmentId: 'block-1', contextText: blocks[0].text, selectedText: 'sinh học',
  start: 0, end: 8, rect: { left: 0, top: 0, bottom: 0 },
};
const second: WordSelection = {
  ...first, selectedText: 'toán học', start: 12, end: 20,
};

describe('useWordExplanation', () => {
  it('ignores a response from a previous selection', async () => {
    let resolveOld!: (value: ExplanationResponse) => void;
    vi.mocked(contentVersion).mockResolvedValue('hash-1');
    vi.mocked(explainWord).mockReturnValue(new Promise((resolve) => { resolveOld = resolve; }));
    const { result } = renderHook(() => useWordExplanation('doc-1', blocks));
    act(() => result.current.choose(first));
    act(() => { void result.current.explain(); });
    await waitFor(() => expect(explainWord).toHaveBeenCalledOnce());
    act(() => result.current.choose(second));
    await act(async () => resolveOld({
      documentId: 'doc-1', contentVersion: 'hash-1', segmentId: 'block-1',
      start: 0, end: 8, term: 'sinh học', meaning: 'Cũ', example: 'Cũ', cached: false,
    }));
    expect(result.current.result).toBeNull();
    expect(result.current.selection?.selectedText).toBe('toán học');
  });

  it('shares an in-flight explanation request for the same selection', async () => {
    let resolve!: (value: ExplanationResponse) => void;
    vi.mocked(contentVersion).mockResolvedValue('hash-1');
    vi.mocked(explainWord).mockReturnValue(new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => useWordExplanation('doc-1', blocks));
    act(() => result.current.choose(first));
    let firstRequest!: Promise<ExplanationResponse | null>;
    let joinedRequest!: Promise<ExplanationResponse | null>;
    act(() => { firstRequest = result.current.explain(); });
    act(() => { joinedRequest = result.current.explain(); });
    expect(joinedRequest).toBe(firstRequest);
    await waitFor(() => expect(explainWord).toHaveBeenCalledOnce());
    await act(async () => resolve({
      documentId: 'doc-1', contentVersion: 'hash-1', segmentId: 'block-1',
      start: 0, end: 8, term: 'sinh học', meaning: 'Môn học', example: 'Ví dụ', cached: false,
    }));
    await expect(firstRequest).resolves.toMatchObject({ meaning: 'Môn học' });
  });
});
