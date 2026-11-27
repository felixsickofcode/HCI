import { describe, expect, it } from 'vitest';
import {
  blocksToText,
  buildFileDocument,
  buildPastedDocument,
  parseTextBlocks,
  toExtractErrorMessage,
} from './document';
import type { EmphasisRange } from './document';
import { ApiError } from './api';

const file = new File([''], 'tai-lieu.pdf', { type: 'application/pdf' });

describe('parseTextBlocks', () => {
  it('giữ xuống dòng mềm trong cùng một đoạn và tách đoạn theo dòng trống', () => {
    const blocks = parseTextBlocks(
      'Dòng đầu tiên\nvẫn thuộc đoạn một.\n\nĐoạn thứ hai có câu kết thúc.',
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      type: 'paragraph',
      text: 'Dòng đầu tiên\nvẫn thuộc đoạn một.',
    });
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks.every((block) => !block.pageNumber)).toBe(true);
  });

  it('nhận tiêu đề Markdown, danh sách và trích dẫn', () => {
    const blocks = parseTextBlocks(
      '# Tiêu đề lớn\n\n### Mục nhỏ\n\n- Ý một\n- Ý hai\n\n1. Bước một\n2. Bước hai\n\n> Câu trích dẫn\n> dòng thứ hai',
    );

    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Tiêu đề lớn', headingLevel: 1 });
    expect(blocks[1]).toMatchObject({ type: 'heading', text: 'Mục nhỏ', headingLevel: 3 });
    expect(blocks.slice(2, 4)).toEqual([
      expect.objectContaining({ type: 'listItem', listKind: 'unordered', text: 'Ý một' }),
      expect.objectContaining({ type: 'listItem', listKind: 'unordered', text: 'Ý hai' }),
    ]);
    expect(blocks.slice(4, 6)).toEqual([
      expect.objectContaining({ type: 'listItem', listKind: 'ordered', text: 'Bước một' }),
      expect.objectContaining({ type: 'listItem', listKind: 'ordered', text: 'Bước hai' }),
    ]);
    expect(blocks[6]).toMatchObject({
      type: 'quote',
      text: 'Câu trích dẫn\ndòng thứ hai',
    });
  });

  it('gắn số trang cho mọi khối khi được cung cấp', () => {
    const blocks = parseTextBlocks('Một câu đủ dài để không thành tiêu đề.\n\nĐoạn khác.', {
      pageNumber: 3,
    });

    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.pageNumber === 3)).toBe(true);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
  });

  it('giữ nguyên toàn bộ chữ khi chuyển sang khối', () => {
    const source =
      '# Tiêu đề\n\nĐoạn một\nvới xuống dòng.\n\n- Mục A\n- Mục B\n\n> Trích dẫn\n\nĐoạn cuối.';
    const blocks = parseTextBlocks(source);
    const text = blocksToText(blocks);

    for (const phrase of ['Tiêu đề', 'Đoạn một\nvới xuống dòng.', 'Mục A', 'Mục B', 'Trích dẫn', 'Đoạn cuối.']) {
      expect(text).toContain(phrase);
    }
  });
});

describe('build documents', () => {
  it('giữ snapshot không có text và chỉ nhận PNG nội tuyến', () => {
    const result = buildFileDocument(file, {
      text: '', source: 'pdf', pageCount: 1, ocrUsed: false,
      blocks: [{ id: 'image-1', type: 'snapshot', text: '', imageSrc: 'data:image/png;base64,AAAA', snapshotKind: 'image' }],
    });
    expect(result.blocks[0].imageSrc).toBe('data:image/png;base64,AAAA');
    expect(result.blocks[0].snapshotKind).toBe('image');
  });
  it('tạo document từ văn bản dán', () => {
    const document = buildPastedDocument('Đoạn một.\n\nĐoạn hai.');
    expect(document.text).toBe('Đoạn một.\n\nĐoạn hai.');
    expect(document.blocks).toHaveLength(2);
    expect(document.source).toBe('paste');
  });

  it('dùng blocks từ API và fallback an toàn khi API cũ thiếu blocks', () => {
    const withBlocks = buildFileDocument(file, {
      text: 'Bỏ qua text khi có blocks',
      source: 'pdf',
      pageCount: 2,
      ocrUsed: false,
      blocks: [
        { id: 'b1', type: 'heading', text: 'Chương 1', pageNumber: 1, headingLevel: 2 },
        { id: 'b2', type: 'paragraph', text: 'Nội dung trang hai.', pageNumber: 2 },
      ],
    });
    expect(withBlocks.blocks).toHaveLength(2);
    expect(withBlocks.originalFile).toBe(file);
    expect(withBlocks.blocks[1].pageNumber).toBe(2);
    expect(withBlocks.text).toBe('Chương 1\n\nNội dung trang hai.');

    const withoutBlocks = buildFileDocument(file, {
      text: 'Đoạn cũ.\n\nĐoạn cũ hai.',
      source: 'pdf',
      pageCount: 1,
      ocrUsed: false,
    });
    expect(withoutBlocks.blocks).toHaveLength(2);
    expect(withoutBlocks.warnings).toEqual([]);
  });

  it('giữ emphasis/align/fontSizeRatio hợp lệ và loại phần vô hiệu', () => {
    const dirtyKind = { start: 1, end: 3, kind: 'weird' } as unknown as EmphasisRange;
    const result = buildFileDocument(file, {
      text: 'Bỏ qua', source: 'pdf', pageCount: 1, ocrUsed: false,
      blocks: [
        {
          id: 'b1', type: 'paragraph', text: 'Chữ đậm và lệch.',
          emphasis: [
            { start: 4, end: 13, kind: 'bold' },
            { start: -5, end: 2, kind: 'italic' },
            { start: 10, end: 99, kind: 'mono' },
            dirtyKind,
          ],
          align: 'center',
          fontSizeRatio: 1.8,
        },
        { id: 'b2', type: 'paragraph', text: 'Bên trái thường.', align: 'left', fontSizeRatio: 0.9 },
      ],
    });

    expect(result.blocks[0].emphasis).toEqual([{ start: 4, end: 13, kind: 'bold' }]);
    expect(result.blocks[0].align).toBe('center');
    expect(result.blocks[0].fontSizeRatio).toBe(1.8);
    expect(result.blocks[1].align).toBeUndefined();
    expect(result.blocks[1].fontSizeRatio).toBeUndefined();
  });

  it('snapshot bảng giữ rows để hiển thị dạng văn bản thay thế', () => {
    const result = buildFileDocument(file, {
      text: '', source: 'pdf', pageCount: 1, ocrUsed: false,
      blocks: [{
        id: 't1', type: 'snapshot', snapshotKind: 'table',
        text: 'Name Value A', imageSrc: 'data:image/png;base64,AAAA',
        imageWidth: 10, imageHeight: 10,
        rows: [['Name', 'Value'], ['A', '42']],
      }],
    });

    expect(result.blocks[0].rows).toEqual([['Name', 'Value'], ['A', '42']]);
  });
});

describe('extraction errors', () => {
  it('explains common PDF extraction failures', () => {
    expect(toExtractErrorMessage(new ApiError('PDF is password protected', 422)))
      .toContain('mật khẩu');
    expect(toExtractErrorMessage(new ApiError('No readable text was found in the file', 422)))
      .toContain('không có chữ');
    expect(toExtractErrorMessage(new ApiError('Could not read the PDF file', 422)))
      .toContain('bị hỏng');
  });
});
