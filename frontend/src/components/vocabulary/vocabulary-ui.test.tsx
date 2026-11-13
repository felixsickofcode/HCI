import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthContext } from '../../context/auth-context';
import { SaveVocabularyDialog } from './SaveVocabularyDialog';
import { Vocabulary } from '../../screens/Vocabulary/Vocabulary';
import { readGuestVocabulary, saveGuestVocabulary } from '../../lib/vocabulary';

const guest = { user: null, token: null, isLoading: false, login: async () => {}, register: async () => {}, logout: () => {} };
const draft = { term: 'sinh học', contextText: 'Em học sinh học.', segmentId: 'paragraph-0', start: 7, end: 15 };
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
});
afterEach(cleanup);

it('saves a selected phrase through the dialog under StrictMode', async () => {
  const close = vi.fn();
  render(<StrictMode><MemoryRouter><AuthContext.Provider value={guest}>
    <SaveVocabularyDialog draft={draft} onClose={close} />
  </AuthContext.Provider></MemoryRouter></StrictMode>);
  expect(close).not.toHaveBeenCalled();
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: /Nghĩa/ }), 'Môn học về sự sống');
  await user.click(screen.getByRole('button', { name: 'Lưu vào thư viện' }));
  await screen.findByRole('link', { name: 'Xem thư viện' });
  expect(readGuestVocabulary()[0].meaning).toBe('Môn học về sự sống');
  expect(close).not.toHaveBeenCalled();
});

it('lists, searches and confirms deletion without requiring an open document', async () => {
  saveGuestVocabulary(draft);
  render(<MemoryRouter><AuthContext.Provider value={guest}><Vocabulary /></AuthContext.Provider></MemoryRouter>);
  const user = userEvent.setup();
  await screen.findByRole('heading', { name: 'sinh học' });
  await user.type(screen.getByRole('searchbox'), 'không có');
  await screen.findByText('Chưa tìm thấy từ phù hợp');
  await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }));
  await screen.findByRole('heading', { name: 'sinh học' });
  await user.click(screen.getByRole('button', { name: 'Xóa từ sinh học' }));
  await user.click(screen.getByRole('button', { name: 'Giữ lại' }));
  expect(readGuestVocabulary()).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Xóa toàn bộ thư viện' }));
  await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
  await screen.findByText('Bắt đầu từ một từ bạn muốn nhớ');
  expect(readGuestVocabulary()).toEqual([]);
});

it('closes the save dialog when the account changes', async () => {
  const close = vi.fn();
  const { rerender } = render(<MemoryRouter><AuthContext.Provider value={guest}>
    <SaveVocabularyDialog draft={draft} onClose={close} />
  </AuthContext.Provider></MemoryRouter>);
  localStorage.setItem('token', 'new-token');
  rerender(<MemoryRouter><AuthContext.Provider value={{ ...guest, token: 'new-token', user: { id: 2, email: 'b@example.com', fullName: 'B', isActive: true, createdAt: '' } }}>
    <SaveVocabularyDialog draft={draft} onClose={close} />
  </AuthContext.Provider></MemoryRouter>);
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(readGuestVocabulary()).toHaveLength(0);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
});
