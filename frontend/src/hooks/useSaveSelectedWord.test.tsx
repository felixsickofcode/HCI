import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../context/auth-context';
import { buildPastedDocument } from '../lib/document';
import type { ExplanationResponse, WordSelection } from '../lib/assist';
import { useSaveSelectedWord } from './useSaveSelectedWord';

const mocks = vi.hoisted(() => ({ save: vi.fn(), edit: vi.fn() }));
vi.mock('./useVocabulary', () => ({
  useVocabulary: () => ({ scope: 'user:1:token-a', ready: true, error: undefined, save: mocks.save, edit: mocks.edit }),
}));

const auth = {
  user: { id: 1, email: 'reader@example.com', fullName: 'Reader', isActive: true, createdAt: '' },
  token: 'token-a', isLoading: false,
  login: async () => {}, register: async () => {}, logout: () => {},
};
const doc = { ...buildPastedDocument('Em học sinh học.'), id: 'doc-1', title: 'Bài đọc' };
const selection: WordSelection = {
  segmentId: doc.blocks[0].id, contextText: doc.blocks[0].text, selectedText: 'sinh học',
  start: 7, end: 15, rect: { left: 20, top: 30, bottom: 50 },
};
const explanation: ExplanationResponse = {
  documentId: 'doc-1', contentVersion: 'a'.repeat(64), segmentId: selection.segmentId,
  start: selection.start, end: selection.end, term: selection.selectedText,
  meaning: 'Môn học về sự sống', example: 'Em học sinh học.', cached: false,
};
const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;

beforeEach(() => { mocks.save.mockReset(); mocks.edit.mockReset(); });

it('saves the selected occurrence with its explanation and document provenance', async () => {
  mocks.save.mockResolvedValue({ created: true, entry: { term: 'sinh học', meaning: explanation.meaning } });
  const explain = vi.fn().mockResolvedValue(explanation);
  const { result } = renderHook(() => useSaveSelectedWord(doc, selection, explain), { wrapper });
  await act(async () => result.current.save());
  expect(explain).toHaveBeenCalledOnce();
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
    term: 'sinh học', meaning: explanation.meaning, example: explanation.example,
    contextText: selection.contextText, sourceDocumentId: 'doc-1', sourceTitle: 'Bài đọc',
    contentVersion: explanation.contentVersion, segmentId: selection.segmentId, start: 7, end: 15,
  }));
  expect(result.current.status).toBe('saved');
});

it('supplements a duplicate without a meaning and stops when the selection changes while explaining', async () => {
  mocks.save.mockResolvedValue({ created: false, entry: { id: 7, term: 'sinh học', meaning: null } });
  mocks.edit.mockResolvedValue({ id: 7, term: 'sinh học', meaning: explanation.meaning });
  const { result, rerender } = renderHook(({ current, explain }) => useSaveSelectedWord(doc, current, explain), {
    initialProps: { current: selection, explain: () => Promise.resolve(explanation) }, wrapper,
  });
  await act(async () => result.current.save());
  await waitFor(() => expect(result.current.status).toBe('duplicate'));
  expect(mocks.edit).toHaveBeenCalledWith(7, explanation.meaning);

  let resolve!: (value: ExplanationResponse) => void;
  const explain = () => new Promise<ExplanationResponse>((done) => { resolve = done; });
  rerender({ current: selection, explain });
  let pending!: Promise<void>;
  act(() => { pending = result.current.save(); });
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  rerender({ current: { ...selection, selectedText: 'Em', start: 0, end: 2 }, explain });
  await act(async () => { resolve(explanation); await pending; });
  expect(mocks.save).toHaveBeenCalledOnce();
});
