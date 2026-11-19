import { StrictMode, useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { DocumentProvider } from '../../context/DocumentProvider';
import { QuickSaveWord } from './QuickSaveWord';
import { WordContext } from './WordContext';
import { Vocabulary } from '../../screens/Vocabulary/Vocabulary';
import { readGuestVocabulary, saveGuestVocabulary } from '../../lib/vocabulary';

const guest = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };
const draft = { term: 'sinh học', contextText: 'Em học sinh học.', segmentId: 'paragraph-0', start: 7, end: 15 };
const doc = { id: 'lesson', source: 'paste' as const, text: draft.contextText, title: 'Bài đọc', ocrUsed: false };
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Reader() {
  const body = useRef<HTMLDivElement>(null);
  return <><QuickSaveWord doc={doc} body={body} /><div ref={body}><p data-segment-id="paragraph-0">{doc.text}</p></div></>;
}

function selectTerm() {
  const text = screen.getByText(doc.text).firstChild!;
  const range = document.createRange();
  range.setStart(text, draft.start);
  range.setEnd(text, draft.end);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent(document, new Event('selectionchange'));
}
const renderShelf = () => render(<MemoryRouter><AuthContext.Provider value={guest}><DocumentProvider>
  <Vocabulary /></DocumentProvider></AuthContext.Provider></MemoryRouter>);

it('quick saves and distinguishes duplicates, then saves an optional note', async () => {
  render(<StrictMode><AuthContext.Provider value={guest}><Reader /></AuthContext.Provider></StrictMode>);
  selectTerm();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Lưu “sinh học”' }));
  await screen.findByText('Đã lưu “sinh học”.');
  selectTerm();
  await user.click(screen.getByRole('button', { name: 'Lưu “sinh học”' }));
  await screen.findByText('“sinh học” đã có trong thư viện.');
  await user.click(screen.getByRole('button', { name: 'Thêm ghi chú' }));
  await user.type(screen.getByRole('textbox'), 'Môn học về sự sống');
  await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  await screen.findByRole('button', { name: 'Sửa ghi chú' });
  expect(readGuestVocabulary()).toHaveLength(1);
  expect(readGuestVocabulary()[0].meaning).toBe('Môn học về sự sống');
});

it('clears the selected word when switching accounts', async () => {
  const view = render(<AuthContext.Provider value={guest}><Reader /></AuthContext.Provider>);
  selectTerm();
  expect(screen.getByRole('button', { name: /Lưu “sinh học”/ })).toBeTruthy();
  view.rerender(<AuthContext.Provider value={{ ...guest, token: 'b', user: { id: 2, email: 'b@example.com', fullName: 'B', isActive: true, createdAt: '' } }}><Reader /></AuthContext.Provider>);
  expect(screen.queryByRole('button', { name: /Lưu “sinh học”/ })).toBeNull();
});

it('shows the sentence of the selected occurrence, even after an emoji', () => {
  const text = '🌱 Em học sinh học. Em thích sinh học!';
  const start = text.lastIndexOf(draft.term);
  const { container } = render(<WordContext entry={{ ...draft, contextText: text, id: 1, createdAt: '', start, end: start + draft.term.length }} />);
  expect(container.querySelector('blockquote')?.textContent).toBe('Em thích sinh học!');
  expect(container.querySelector('mark')?.textContent).toBe(draft.term);
});

it('edits notes, cancels drafts, recovers the original record after reload and counts all words before clearing', async () => {
  const original = saveGuestVocabulary({ ...draft, meaning: 'Cũ' });
  saveGuestVocabulary({ term: 'quang hợp', contextText: 'Lá cây quang hợp.' });
  const user = userEvent.setup();
  const view = renderShelf();
  expect(screen.getByRole('link', { name: 'Mở văn bản' }).getAttribute('href')).toBe('/');
  await user.click(await screen.findByRole('button', { name: 'Sửa ghi chú' }));
  await user.clear(screen.getByRole('textbox'));
  await user.type(screen.getByRole('textbox'), 'Bản nháp');
  await user.click(screen.getByRole('button', { name: 'Hủy' }));
  expect(readGuestVocabulary().find(word => word.id === original.id)?.meaning).toBe('Cũ');
  await user.click(screen.getByRole('button', { name: 'Sửa ghi chú' }));
  await user.clear(screen.getByRole('textbox'));
  await user.type(screen.getByRole('textbox'), 'Mới');
  const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('quota'); });
  await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Mới');
  quota.mockRestore();
  await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  await screen.findByText('Mới');
  await user.click(screen.getByRole('button', { name: 'Xóa từ sinh học' }));
  await screen.findByRole('button', { name: 'Hoàn tác' });
  view.unmount();
  renderShelf();
  await user.click(await screen.findByRole('button', { name: 'Hoàn tác' }));
  await screen.findByRole('heading', { name: draft.term });
  expect(readGuestVocabulary().find(w => w.id === original.id)).toEqual({ ...original, meaning: 'Mới' });
  await user.type(screen.getByRole('searchbox'), draft.term);
  await screen.findByText('1 từ/cụm từ · Mới nhất trước');
  await user.click(screen.getByText('Quản lý thư viện'));
  await user.click(await screen.findByRole('button', { name: 'Xóa toàn bộ thư viện' }));
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Xóa 2 từ' }));
  expect(readGuestVocabulary()).toEqual([]);
});
