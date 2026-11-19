import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WordExplanationPopover } from './WordExplanationPopover';
import type { WordSelection } from '../../lib/assist';

const selection: WordSelection = {
  segmentId: 'segment-1', contextText: 'Một câu có sinh học.', selectedText: 'sinh học',
  start: 11, end: 19, rect: { left: 40, top: 50, bottom: 70 },
};
const props = {
  selection, result: null, loading: false, error: '', signedIn: true, needsLogin: false,
  saveStatus: 'idle' as const, saveError: '', onExplain: vi.fn(), onSave: vi.fn(), onClose: vi.fn(),
  onRead: vi.fn(), speechSupported: true,
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('closes on pointer outside but keeps clicks inside the popup', () => {
  render(<MemoryRouter><WordExplanationPopover {...props} /></MemoryRouter>);
  fireEvent.pointerDown(screen.getByRole('dialog'));
  expect(props.onClose).not.toHaveBeenCalled();
  fireEvent.pointerDown(document.body);
  expect(props.onClose).toHaveBeenCalledWith('outside');
});

it('offers both actions for a selected phrase and restores focus on Escape', () => {
  render(<MemoryRouter><WordExplanationPopover {...props} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Giải nghĩa' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Lưu từ' })).toBeTruthy();
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(props.onClose).toHaveBeenCalledWith('restore-focus');
});

it('lets a guest read selected text without explaining or saving it', () => {
  render(<MemoryRouter><WordExplanationPopover {...props} signedIn={false} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Đọc phần đã chọn' }));
  expect(props.onRead).toHaveBeenCalledOnce();
  expect(props.onExplain).not.toHaveBeenCalled();
  expect(props.onSave).not.toHaveBeenCalled();
});
