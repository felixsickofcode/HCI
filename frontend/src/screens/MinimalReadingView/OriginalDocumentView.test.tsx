import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OriginalDocumentView } from './OriginalDocumentView';

const createObjectURL = vi.fn(() => 'blob:original-document');
const revokeObjectURL = vi.fn();

Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });

afterEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('OriginalDocumentView', () => {
  it('hiển thị PDF gốc và giải phóng URL khi đóng', async () => {
    const file = new File(['%PDF-1.4'], 'bao-cao.pdf', { type: 'application/pdf' });
    const { unmount } = render(<OriginalDocumentView file={file} source="pdf" />);

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(await screen.findByTitle('Bản gốc PDF: bao-cao.pdf')).toHaveAttribute('src', 'blob:original-document');
    expect(screen.getByRole('link', { name: 'Mở bản gốc ở tab mới' })).toHaveAttribute('href', 'blob:original-document');

    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original-document');
  });

  it('hiển thị ảnh gốc thay cho nội dung OCR', async () => {
    const file = new File(['image'], 'trang-1.png', { type: 'image/png' });
    render(<OriginalDocumentView file={file} source="image" />);

    expect(await screen.findByRole('img', { name: 'Bản gốc của trang-1.png' })).toHaveAttribute('src', 'blob:original-document');
  });
});
