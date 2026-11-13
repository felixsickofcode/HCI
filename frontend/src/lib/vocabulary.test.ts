import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VOCABULARY_KEY, dateBounds, deleteGuestVocabulary, filterGuestVocabulary, readGuestVocabulary, saveGuestVocabulary, validateDraft } from './vocabulary';
import { readVocabularySelection } from './vocabulary-selection';

const draft = { term: 'sinh học', contextText: 'Em học sinh học.', segmentId: 'paragraph-0', start: 7, end: 15 };
beforeEach(() => { localStorage.clear(); document.body.innerHTML = ''; });

describe('guest vocabulary', () => {
  it('persists, deduplicates and keeps distinct contexts', () => {
    const first = saveGuestVocabulary(draft);
    expect(saveGuestVocabulary({ ...draft, meaning: 'Different' }).id).toBe(first.id);
    saveGuestVocabulary({ ...draft, contextText: 'Em học sinh học rất vui.' });
    expect(readGuestVocabulary()).toHaveLength(2);
    deleteGuestVocabulary(first.id);
    expect(readGuestVocabulary()).toHaveLength(1);
    deleteGuestVocabulary();
    expect(readGuestVocabulary()).toEqual([]);
  });
  it('does not discard corrupt data or report success on quota errors', () => {
    localStorage.setItem(VOCABULARY_KEY, '{broken');
    expect(() => saveGuestVocabulary(draft)).toThrow('Không đọc được');
    expect(localStorage.getItem(VOCABULARY_KEY)).toBe('{broken');
    deleteGuestVocabulary();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    expect(() => saveGuestVocabulary(draft)).toThrow('Chưa lưu được');
  });
  it('rejects partial or incorrect UTF-16 ranges', () => {
    expect(() => validateDraft({ ...draft, start: undefined })).toThrow();
    expect(() => validateDraft({ ...draft, start: 6 })).toThrow();
    expect(() => validateDraft({ ...draft, contextText: '🌱 Em học sinh học.', start: 10, end: 18 })).not.toThrow();
  });
  it('normalizes searches and filters dates/source with an exclusive upper bound', () => {
    const entries = [
      { ...draft, id: '1', sourceDocumentId: 'one', createdAt: '2026-11-12T17:00:00Z' },
      { ...draft, id: '2', sourceDocumentId: 'two', createdAt: '2026-11-13T17:00:00Z' },
    ];
    expect(filterGuestVocabulary(entries, { q: ' SINH  HỌC ', sourceDocumentId: 'one', from: '2026-11-12T17:00:00Z', to: '2026-11-13T17:00:00Z' }).items.map(e => e.id)).toEqual(['1']);
    expect(filterGuestVocabulary(entries, { q: '%' }).total).toBe(0);
    expect(filterGuestVocabulary(entries, { skip: 1, limit: 1 }).total).toBe(2);
    expect(() => dateBounds('2026-11-14', '2026-11-13')).toThrow();
    const bounds = dateBounds('2026-11-13', '2026-11-13');
    expect(new Date(bounds.from!).getDate()).toBe(13);
    expect(new Date(bounds.to!).getDate()).toBe(14);
  });
});

it('captures the second occurrence across nested TTS spans, including an emoji prefix', () => {
  document.body.innerHTML = '<div id="reading"><p data-segment-id="paragraph-0"><span>🌱 sinh học, </span><mark>sinh</mark><span> học.</span></p></div>';
  const root = document.getElementById('reading')!;
  const range = document.createRange();
  range.setStart(root.querySelector('mark')!.firstChild!, 0);
  range.setEnd(root.querySelector('p')!.lastChild!.firstChild!, 4);
  const selection = window.getSelection()!;
  selection.removeAllRanges(); selection.addRange(range);
  const result = readVocabularySelection(root, { id: 'doc', title: 'Bài đọc', text: root.textContent!, source: 'paste', ocrUsed: false });
  expect(result?.term).toBe('sinh học');
  expect(result?.start).toBe(13);
  expect(result?.contextText.slice(result.start!, result.end!)).toBe(result?.term);
});
