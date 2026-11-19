import type { ReadingDocument } from './document';
import type { VocabularyDraft } from './vocabulary';

export function readVocabularySelection(root: HTMLElement, doc: ReadingDocument): VocabularyDraft | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount !== 1) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const element = (node: Node) => node instanceof Element ? node : node.parentElement;
  const paragraph = element(range.startContainer)?.closest<HTMLElement>('[data-segment-id]');
  const endParagraph = element(range.endContainer)?.closest<HTMLElement>('[data-segment-id]');
  if (!paragraph || paragraph !== endParagraph) throw new Error('Hãy chọn từ/cụm từ trong cùng một đoạn văn.');
  const contextText = paragraph.textContent ?? '';
  const before = range.cloneRange();
  before.selectNodeContents(paragraph);
  before.setEnd(range.startContainer, range.startOffset);
  let start = before.toString().length;
  const selected = range.toString();
  start += selected.length - selected.trimStart().length;
  const term = selected.trim();
  if (!term) return null;
  if (term.length > 120) throw new Error('Hãy chọn từ/cụm từ ngắn hơn (tối đa 120 ký tự).');
  if (contextText.length > 4000) throw new Error('Đoạn văn này quá dài để lưu ngữ cảnh. Hãy chia đoạn dưới 4.000 ký tự rồi thử lại.');
  return { term, contextText, sourceDocumentId: doc.id, sourceTitle: doc.title.slice(0, 300),
    sourceKind: doc.source, segmentId: paragraph.dataset.segmentId!, start, end: start + term.length };
}
