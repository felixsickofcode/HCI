import { ApiError } from './api';
export type DocumentSource = 'paste' | 'pdf' | 'image';

export interface ReadingDocument {
  id: string;
  title: string;
  text: string;
  source: DocumentSource;
  fileName?: string;
  pageCount?: number | null;
  ocrUsed: boolean;
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

export function toParagraphs(text: string): string[] {
  const parts = /\n\s*\n/.test(text) ? text.split(/\n\s*\n/) : text.split('\n');
  return parts.map((part) => part.trim()).filter(Boolean);
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
    : String(Date.now());

export function buildPastedDocument(raw: string): ReadingDocument {
  const text = normalizePastedText(raw);
  return { id: newId(), title: 'Văn bản đã dán', text, source: 'paste', ocrUsed: false };
}

export function buildFileDocument(
  file: File,
  result: { text: string; source: 'pdf' | 'image'; pageCount: number | null; ocrUsed: boolean },
): ReadingDocument {
  return {
    id: newId(),
    title: file.name.replace(/\.[^.]+$/, '') || 'Tài liệu',
    text: result.text,
    source: result.source,
    fileName: file.name,
    pageCount: result.pageCount,
    ocrUsed: result.ocrUsed,
  };
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