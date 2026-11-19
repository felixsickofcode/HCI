import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { DocumentProvider } from '../../context/DocumentProvider';
import { WordContext } from './WordContext';
import { Vocabulary } from '../../screens/Vocabulary/Vocabulary';
import { readGuestVocabulary, saveGuestVocabulary } from '../../lib/vocabulary';

const guest = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderShelf = () => render(<MemoryRouter><AuthContext.Provider value={guest}><DocumentProvider>
  <Vocabulary /></DocumentProvider></AuthContext.Provider></MemoryRouter>);

it('shows the sentence of the selected occurrence, even after an emoji', () => {
  const text = '🌱 Em học sinh học. Em thích sinh học!';
  const term = 'sinh học';
  const start = text.lastIndexOf(term);
  const { container } = render(<WordContext entry={{ term, contextText: text, segmentId: 'paragraph-0', start, end: start + term.length, id: 1, createdAt: '' }} />);
  expect(container.querySelector('blockquote')?.textContent).toBe('Em thích sinh học!');
  expect(container.querySelector('mark')?.textContent).toBe(term);
});

it('edits notes, cancels drafts, recovers the original record after reload and counts all words before clearing', async () => {
  const original = saveGuestVocabulary({ term: 'sinh học', meaning: 'Cũ', contextText: 'Em học sinh học.', segmentId: 'paragraph-0', start: 7, end: 15 });
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
  await screen.findByRole('heading', { name: 'sinh học' });
  expect(readGuestVocabulary().find(w => w.id === original.id)).toEqual({ ...original, meaning: 'Mới' });
  await user.type(screen.getByRole('searchbox'), 'sinh học');
  await screen.findByText('1 từ/cụm từ · Mới nhất trước');
  await user.click(screen.getByText('Quản lý thư viện'));
  await user.click(await screen.findByRole('button', { name: 'Xóa toàn bộ thư viện' }));
  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Xóa 2 từ' }));
  expect(readGuestVocabulary()).toEqual([]);
});
