import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadingText } from './ReadingText';
import type { ReadingBlock } from '../../lib/document';

const blocks: ReadingBlock[] = [
  { id: 'h1', type: 'heading', text: 'Tiêu đề chính', headingLevel: 2 },
  { id: 'p1', type: 'paragraph', text: 'Đoạn văn đầu tiên.' },
  { id: 'l1', type: 'listItem', text: 'Mục một', listKind: 'unordered' },
  { id: 'l2', type: 'listItem', text: 'Mục hai', listKind: 'unordered' },
  { id: 'q1', type: 'quote', text: 'Câu trích dẫn.' },
];

describe('ReadingText', () => {
  it('render đúng thẻ ngữ nghĩa cho heading, paragraph, list và quote', () => {
    const { container } = render(<ReadingText blocks={blocks} activeBoundary={null} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tiêu đề chính');
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'reader-h1');
    expect(container.querySelector('p')?.textContent).toBe('Đoạn văn đầu tiên.');
    expect(screen.getByRole('list')).toHaveClass('list-disc');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(container.querySelector('blockquote')?.textContent).toBe('Câu trích dẫn.');
  });

  it('nhóm danh sách có thứ tự thành thẻ ol', () => {
    const ordered: ReadingBlock[] = [
      { id: 'o1', type: 'listItem', text: 'Bước một', listKind: 'ordered' },
      { id: 'o2', type: 'listItem', text: 'Bước hai', listKind: 'ordered' },
    ];
    render(<ReadingText blocks={ordered} activeBoundary={null} />);

    expect(screen.getByRole('list')).toHaveClass('list-decimal');
  });

  it('tô sáng đúng từ theo boundary của khối đang đọc', () => {
    render(
      <ReadingText
        blocks={[{ id: 'p1', type: 'paragraph', text: 'Xin chào bạn' }]}
        activeBoundary={{ segmentId: 'p1', segmentIndex: 0, charIndex: 4, charLength: 4 }}
      />,
    );

    expect(screen.getByText('chào')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Xin')).not.toHaveAttribute('aria-current');
  });

  it('giữ hàng và cột của bảng trong vùng cuộn ngang', () => {
    render(<ReadingText blocks={[{
      id: 't1', type: 'table', text: 'Đối tượng, Vấn đề', caption: 'Bảng 1',
      rows: [['Đối tượng', 'Vấn đề'], ['Chuyên viên', 'Cần giải thích']],
    }]} activeBoundary={null} />);

    expect(screen.getByRole('region', { name: 'Bảng 1' })).toHaveClass('overflow-x-auto');
    expect(screen.getByRole('table')).toHaveTextContent('Chuyên viên');
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    expect(screen.getByRole('cell', { name: 'Cần giải thích' })).toBeInTheDocument();
  });

  it('hiển thị snapshot, phóng to và cho mở văn bản thay thế', () => {
    render(<ReadingText blocks={[{
      id: 's1', type: 'snapshot', text: 'Nội dung bảng', pageNumber: 2,
      imageSrc: 'data:image/png;base64,AAAA', imageWidth: 1000, imageHeight: 500,
      snapshotKind: 'table',
    }]} activeBoundary={null} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to bảng · trang 2' }));
    expect(image).toHaveStyle({ width: '150%' });
    expect(screen.getByText('Văn bản để đọc và sao chép').closest('details')).toBeInTheDocument();
  });
});
