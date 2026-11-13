import { ApiError } from './api';

export type DocumentSource = 'paste' | 'pdf' | 'image';
export type BlockType = 'paragraph' | 'heading' | 'listItem' | 'quote' | 'table' | 'snapshot';
export type ListKind = 'ordered' | 'unordered';

export interface ReadingBlock {
  id: string;
  type: BlockType;
  text: string;
  pageNumber?: number;
  headingLevel?: 2 | 3;
  listKind?: ListKind;
  rows?: string[][];
  caption?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  snapshotKind?: 'table' | 'image';
  sourceBbox?: [number, number, number, number];
}

export interface ReadingDocument {
  id: string;
  title: string;
  text: string;
  source: DocumentSource;
  fileName?: string;
  originalFile?: File;
  pageCount?: number | null;
  ocrUsed: boolean;
  sourceText: string;
  blocks: ReadingBlock[];
  sourceBlocks: ReadingBlock[];
  warnings: string[];
  skippedOcrPages: number[];
}

export const MAX_UPLOAD_MB = 10;
export const MAX_PASTE_CHARS = 200_000;
export const ACCEPT_ATTR = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';

export function validateFile(file: File): string | null {
  if (!/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
    return 'Chỉ hỗ trợ tệp PDF, PNG, JPEG hoặc WebP.';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn ${MAX_UPLOAD_MB} MB.`;
  }
  if (file.size === 0) return 'Tệp trống, hãy chọn tệp khác.';
  return null;
}

export function normalizePastedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HEADING_RE = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const UNORDERED_LIST_RE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_LIST_RE = /^\s*\d{1,3}[.)]\s+(.*)$/;
const SENTENCE_END = '.!?,;:…';

export function parseTextBlocks(
  text: string,
  options: { pageNumber?: number } = {},
): ReadingBlock[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const blocks: ReadingBlock[] = [];
  const pageNumber = options.pageNumber;
  let paragraphLines: string[] = [];
  let quoteLines: string[] = [];

  const addBlock = (
    type: BlockType,
    body: string,
    extra: Pick<ReadingBlock, 'headingLevel' | 'listKind'> = {},
  ) => {
    const value = body.trim();
    if (!value) return;
    blocks.push({
      id: `block-${blocks.length + 1}`,
      type,
      text: value,
      ...(pageNumber ? { pageNumber } : {}),
      ...extra,
    });
  };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const body = paragraphLines.join('\n').trim();
    paragraphLines = [];
    if (!body) return;
    if (body.split('\n').length === 1 && looksLikeHeading(body)) {
      addBlock('heading', body, { headingLevel: 2 });
    } else {
      addBlock('paragraph', body);
    }
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) return;
    const body = quoteLines.join('\n').trim();
    quoteLines = [];
    addBlock('quote', body);
  };

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushQuote();
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      flushQuote();
      addBlock('heading', heading[2], { headingLevel: heading[1].length <= 2 ? 2 : 3 });
      continue;
    }

    const quote = QUOTE_RE.exec(line);
    if (quote) {
      flushParagraph();
      quoteLines.push(quote[1].trim());
      continue;
    }

    flushQuote();
    const unordered = UNORDERED_LIST_RE.exec(line);
    const ordered = unordered ? null : ORDERED_LIST_RE.exec(line);
    const listMatch = unordered ?? ordered;
    if (listMatch) {
      flushParagraph();
      addBlock('listItem', listMatch[1], {
        listKind: unordered ? 'unordered' : 'ordered',
      });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  flushQuote();
  return blocks;
}

function looksLikeHeading(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 3 || clean.length > 80) return false;
  if (clean.split(/\s+/).length > 12) return false;
  if (!/^\p{Lu}/u.test(clean)) return false;
  return !SENTENCE_END.includes(clean[clean.length - 1]);
}

export function cloneBlocks(blocks: ReadingBlock[]): ReadingBlock[] {
  return blocks.map((block) => ({
    ...block,
    rows: block.rows?.map((row) => [...row]),
  }));
}

export function blocksToText(blocks: ReadingBlock[]): string {
  return blocks
    .filter((block) => block.text.trim())
    .map((block) => block.text)
    .join('\n\n');
}

export function updateBlock(
  blocks: ReadingBlock[],
  id: string,
  changes: Partial<Pick<ReadingBlock, 'type' | 'text' | 'headingLevel' | 'listKind'>>,
): ReadingBlock[] {
  return blocks.map((block) => (block.id === id ? { ...block, ...changes } : block));
}

export function splitBlock(
  blocks: ReadingBlock[],
  id: string,
  offset: number,
): ReadingBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1) return blocks;
  const block = blocks[index];
  const safeOffset = Math.min(Math.max(offset, 0), block.text.length);
  const before = block.text.slice(0, safeOffset).trimEnd();
  const after = block.text.slice(safeOffset).trimStart();
  if (!before || !after) return blocks;

  const created: ReadingBlock = {
    ...block,
    id: newId(),
    text: after,
    ...(block.pageNumber ? { pageNumber: block.pageNumber } : {}),
  };
  const next = cloneBlocks(blocks);
  next[index] = { ...block, text: before };
  next.splice(index + 1, 0, created);
  return next;
}

export function mergeBlockWithNext(blocks: ReadingBlock[], id: string): ReadingBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1 || index + 1 >= blocks.length) return blocks;
  const current = blocks[index];
  const following = blocks[index + 1];
  const merged: ReadingBlock = {
    ...current,
    text: `${current.text}\n${following.text}`.trim(),
  };
  const next = cloneBlocks(blocks);
  next.splice(index, 2, merged);
  return next;
}

export function moveBlock(
  blocks: ReadingBlock[],
  id: string,
  direction: 'up' | 'down',
): ReadingBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1) return blocks;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = cloneBlocks(blocks);
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const WORDS_PER_MINUTE = 200;

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE));
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function buildPastedDocument(raw: string): ReadingDocument {
  const sourceText = normalizePastedText(raw);
  const blocks = parseTextBlocks(sourceText);
  return {
    id: newId(),
    title: 'Văn bản đã dán',
    text: blocksToText(blocks),
    source: 'paste',
    ocrUsed: false,
    sourceText,
    blocks,
    sourceBlocks: cloneBlocks(blocks),
    warnings: [],
    skippedOcrPages: [],
  };
}

interface FileExtractionResult {
  text: string;
  source: 'pdf' | 'image';
  pageCount: number | null;
  ocrUsed: boolean;
  sourceText?: string;
  blocks?: ReadingBlock[];
  warnings?: string[];
  skippedOcrPages?: number[];
}

export function buildFileDocument(
  file: File,
  result: FileExtractionResult,
): ReadingDocument {
  const blocks = result.blocks?.length
    ? sanitizeBlocks(result.blocks)
    : parseTextBlocks(result.text);
  return {
    id: newId(),
    title: file.name.replace(/\.[^.]+$/, '') || 'Tài liệu',
    text: blocksToText(blocks),
    source: result.source,
    fileName: file.name,
    originalFile: file,
    pageCount: result.pageCount,
    ocrUsed: result.ocrUsed,
    sourceText: result.sourceText ?? result.text,
    blocks,
    sourceBlocks: cloneBlocks(blocks),
    warnings: result.warnings ?? [],
    skippedOcrPages: result.skippedOcrPages ?? [],
  };
}

function sanitizeBlocks(blocks: ReadingBlock[]): ReadingBlock[] {
  const seen = new Set<string>();
  const allowedTypes: BlockType[] = ['paragraph', 'heading', 'listItem', 'quote', 'table', 'snapshot'];
  const clean: ReadingBlock[] = [];
  blocks.forEach((block, index) => {
    if (!block || typeof block.text !== 'string' || (!block.text.trim() && block.type !== 'snapshot')) return;
    const type = allowedTypes.includes(block.type) ? block.type : 'paragraph';
    let id = typeof block.id === 'string' && block.id ? block.id : `block-${index + 1}`;
    if (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    clean.push({
      id,
      type,
      text: block.text.trim(),
      ...(typeof block.pageNumber === 'number' ? { pageNumber: block.pageNumber } : {}),
      ...(block.headingLevel === 2 || block.headingLevel === 3
        ? { headingLevel: block.headingLevel }
        : {}),
      ...(block.listKind === 'ordered' || block.listKind === 'unordered'
        ? { listKind: block.listKind }
        : {}),
      ...(type === 'table' && Array.isArray(block.rows)
        ? { rows: block.rows.map((row) => row.map(String)) }
        : {}),
      ...(type === 'table' && typeof block.caption === 'string'
        ? { caption: block.caption }
        : {}),
      ...(type === 'snapshot' && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(block.imageSrc ?? '')
        ? {
          imageSrc: block.imageSrc, imageWidth: block.imageWidth, imageHeight: block.imageHeight,
          snapshotKind: block.snapshotKind, sourceBbox: block.sourceBbox,
        }
        : {}),
    });
  });
  return clean;
}

export function validatePastedText(raw: string): string | null {
  if (!raw.trim()) return 'Hãy dán hoặc nhập một đoạn văn bản để bắt đầu đọc.';
  if (raw.length > MAX_PASTE_CHARS) {
    return `Văn bản quá dài (tối đa ${MAX_PASTE_CHARS.toLocaleString('vi-VN')} ký tự).`;
  }
  return null;
}

export function toExtractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 413:
        return `Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn ${MAX_UPLOAD_MB} MB.`;
      case 415:
        return 'Chỉ hỗ trợ tệp PDF, PNG, JPEG hoặc WebP.';
      case 422:
        return 'Không đọc được chữ trong tệp này. Tệp có thể bị khóa mật khẩu, bị hỏng hoặc không có chữ.';
      case 503:
        return 'Máy chủ chưa bật được chức năng nhận dạng chữ. Vui lòng thử lại sau.';
      default:
        return error.message;
    }
  }
  return 'Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.';
}
