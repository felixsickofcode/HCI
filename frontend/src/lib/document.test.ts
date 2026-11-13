import { describe, expect, it } from 'vitest';
import {
  blocksToText,
  buildFileDocument,
  buildPastedDocument,
  mergeBlockWithNext,
  moveBlock,
  parseTextBlocks,
  splitBlock,
  updateBlock,
} from './document';

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

    expect(blocks[0]).toMatchObject({ type: 'heading', text: 'Tiêu đề lớn', headingLevel: 2 });
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

describe('block editing', () => {
  const blocks = parseTextBlocks('# Tiêu đề\n\nĐoạn một.\n\nĐoạn hai.');

  it('tách khối tại vị trí con trỏ, giữ id khối gốc và cấp id mới cho khối tạo ra', () => {
    const paragraph = blocks[1];
    const result = splitBlock(blocks, paragraph.id, 4);

    expect(result).toHaveLength(blocks.length + 1);
    expect(result[1]).toMatchObject({ id: paragraph.id, text: 'Đoạn' });
    expect(result[2].id).not.toBe(paragraph.id);
    expect(result[2].text).toBe('một.');
  });

  it('gộp khối với khối kế và đổi thứ tự', () => {
    const merged = mergeBlockWithNext(blocks, blocks[1].id);
    expect(merged).toHaveLength(blocks.length - 1);
    expect(merged[1].text).toContain('một.');
    expect(merged[1].text).toContain('Đoạn hai.');

    const moved = moveBlock(blocks, blocks[2].id, 'up');
    expect(moved[1].text).toBe('Đoạn hai.');
    expect(moved[2].text).toBe('Đoạn một.');
  });

  it('cập nhật loại và nội dung khối', () => {
    const updated = updateBlock(blocks, blocks[1].id, { type: 'quote', text: 'Mới' });
    expect(updated[1]).toMatchObject({ type: 'quote', text: 'Mới' });
  });
});

describe('build documents', () => {
  it('giữ snapshot không có text và chỉ nhận PNG nội tuyến', () => {
    const result = buildFileDocument(file, {
      text: '', source: 'pdf', pageCount: 1, ocrUsed: false,
      blocks: [{ id: 'image-1', type: 'snapshot', text: '', imageSrc: 'data:image/png;base64,AAAA', snapshotKind: 'image' }],
    });
    expect(result.blocks[0].imageSrc).toBe('data:image/png;base64,AAAA');
    expect(result.sourceBlocks[0].snapshotKind).toBe('image');
  });
  it('tạo sourceText bất biến và sourceBlocks từ văn bản dán', () => {
    const document = buildPastedDocument('Đoạn một.\n\nĐoạn hai.');
    expect(document.text).toBe('Đoạn một.\n\nĐoạn hai.');
    expect(document.sourceText).toBe('Đoạn một.\n\nĐoạn hai.');
    expect(document.sourceBlocks).not.toBe(document.blocks);

    document.blocks[0].text = 'Đã sửa';
    expect(document.sourceBlocks[0].text).toBe('Đoạn một.');
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
});
