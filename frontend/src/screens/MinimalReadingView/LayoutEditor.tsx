import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  blocksToText,
  mergeBlockWithNext,
  moveBlock,
  splitBlock,
  updateBlock,
} from '../../lib/document';
import type { BlockType, ReadingBlock, ReadingDocument } from '../../lib/document';

export interface LayoutEditorProps {
  document: ReadingDocument;
  onClose: () => void;
  onChange: (blocks: ReadingBlock[]) => void;
  onRestore: () => void;
}

const TYPE_OPTIONS: Array<{ value: BlockType; label: string }> = [
  { value: 'paragraph', label: 'Đoạn văn' },
  { value: 'heading', label: 'Tiêu đề' },
  { value: 'listItem', label: 'Mục danh sách' },
  { value: 'quote', label: 'Trích dẫn' },
  { value: 'table', label: 'Bảng', },
  { value: 'snapshot', label: 'Bảng / hình gốc' },
];

const TYPE_BADGE: Record<BlockType, string> = {
  paragraph: 'Đoạn',
  heading: 'Tiêu đề',
  listItem: 'Danh sách',
  quote: 'Trích dẫn',
  table: 'Bảng',
  snapshot: 'Bảng / hình gốc',
};

export const LayoutEditor: React.FC<LayoutEditorProps> = ({
  document,
  onClose,
  onChange,
  onRestore,
}) => {
  const [sourceOpen, setSourceOpen] = useState(false);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const modified = useMemo(
    () => blocksToText(document.blocks) !== blocksToText(document.sourceBlocks),
    [document.blocks, document.sourceBlocks],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const changeType = (block: ReadingBlock, type: BlockType) => {
    const next = updateBlock(document.blocks, block.id, {
      type,
      ...(type === 'heading' ? { headingLevel: block.headingLevel ?? 2 } : {}),
      ...(type === 'listItem' ? { listKind: block.listKind ?? 'unordered' } : {}),
    });
    onChange(next);
  };

  const splitAtCursor = (block: ReadingBlock) => {
    const textarea = textRefs.current[block.id];
    const offset = textarea?.selectionStart ?? 0;
    onChange(splitBlock(document.blocks, block.id, offset));
  };

  const requestRestore = () => {
    if (modified && !window.confirm('Khôi phục bản trích xuất sẽ bỏ các chỉnh sửa hiện tại. Tiếp tục?')) {
      return;
    }
    onRestore();
  };

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" role="presentation">
      <button
        type="button"
        aria-label="Đóng chỉnh bố cục"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-editor-title"
        className="relative z-10 flex h-full w-full max-w-xl flex-col bg-[#FFFDF8] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          <div className="min-w-0">
            <h2 id="layout-editor-title" className="font-headline text-base font-semibold text-on-surface">
              Chỉnh bố cục
            </h2>
            <p className="mt-1 text-[11px] font-label leading-relaxed text-on-surface-variant">
              Sửa loại khối, chữ, tách hoặc gộp đoạn. Thay đổi được áp dụng ngay vào trang đọc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-5 py-3">
          <button
            type="button"
            onClick={() => setSourceOpen((open) => !open)}
            aria-pressed={sourceOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-label font-medium text-on-surface hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[15px]">description</span>
            {sourceOpen ? 'Quay lại chỉnh sửa' : 'Xem bản gốc'}
          </button>
          <button
            type="button"
            onClick={requestRestore}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-[11px] font-label font-medium text-on-surface hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[15px]">restore</span>
            Khôi phục bản trích xuất
          </button>
          {modified && (
            <span className="text-[11px] font-label text-tertiary">Đã có chỉnh sửa trong phiên</span>
          )}
          <span className="ml-auto text-[11px] font-label text-on-surface-variant">
            {document.blocks.length} khối
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {sourceOpen ? (
            <div>
              <p className="mb-3 text-[11px] font-label text-on-surface-variant">
                Văn bản trích xuất ban đầu, giữ nguyên xuống dòng. Bản này không bị chỉnh sửa.
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-xl border border-black/10 bg-white/60 p-4 font-body text-sm leading-relaxed text-on-surface">
                {document.sourceText || '(Không có văn bản gốc)'}
              </pre>
            </div>
          ) : (
            <ol className="space-y-3">
              {document.blocks.map((block, index) => (
                <li key={block.id} className="rounded-xl border border-black/10 bg-white/60 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-black/[0.05] px-2 py-0.5 text-[10px] font-label font-semibold uppercase tracking-wide text-on-surface-variant">
                      #{index + 1} · {TYPE_BADGE[block.type]}
                    </span>
                    {block.pageNumber ? (
                      <span className="text-[10px] font-label text-on-surface-variant">
                        Trang {block.pageNumber}
                      </span>
                    ) : null}
                    <select
                      aria-label={`Loại khối ${index + 1}`}
                      value={block.type}
                      onChange={(event) => changeType(block, event.target.value as BlockType)}
                      className="rounded border border-black/10 bg-white px-2 py-1 text-[11px] font-label text-on-surface"
                    >
                      {TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} disabled={['table', 'snapshot'].includes(option.value) && block.type !== option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onChange(moveBlock(document.blocks, block.id, 'up'))}
                        disabled={index === 0}
                        aria-label={`Chuyển khối ${index + 1} lên`}
                        className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant hover:bg-black/5 disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(moveBlock(document.blocks, block.id, 'down'))}
                        disabled={index === document.blocks.length - 1}
                        aria-label={`Chuyển khối ${index + 1} xuống`}
                        className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant hover:bg-black/5 disabled:opacity-30"
                      >
                        <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={(element) => {
                      textRefs.current[block.id] = element;
                    }}
                    value={block.text}
                    readOnly={block.type === 'table' || block.type === 'snapshot'}
                    onChange={(event) =>
                      onChange(updateBlock(document.blocks, block.id, { text: event.target.value }))
                    }
                    rows={Math.min(8, Math.max(2, block.text.split('\n').length + 1))}
                    aria-label={`Nội dung khối ${index + 1}`}
                    className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 font-body text-sm leading-relaxed text-on-surface outline-none focus:border-primary"
                  />
                  {block.type === 'table' && <p className="mt-1 text-[11px] font-label text-on-surface-variant">Bảng giữ cấu trúc ô; có thể đổi sang đoạn văn để sửa chữ.</p>}
                  {block.type === 'snapshot' && <p className="mt-1 text-[11px] font-label text-on-surface-variant">Ảnh giữ bố cục gốc; có thể đổi sang đoạn văn để sửa phần chữ trích xuất.</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => splitAtCursor(block)}
                      disabled={block.type === 'table' || block.type === 'snapshot'}
                      className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-[10px] font-label text-on-surface-variant hover:bg-black/5"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_cut</span>
                      Tách tại con trỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(mergeBlockWithNext(document.blocks, block.id))}
                      disabled={block.type === 'table' || block.type === 'snapshot' || ['table', 'snapshot'].includes(document.blocks[index + 1]?.type) || index === document.blocks.length - 1}
                      className="inline-flex items-center gap-1 rounded border border-black/10 px-2 py-1 text-[10px] font-label text-on-surface-variant hover:bg-black/5 disabled:opacity-30"
                    >
                      <span className="material-symbols-outlined text-[14px]">merge</span>
                      Gộp với khối kế
                    </button>
                    {block.type === 'heading' && (
                      <select
                        aria-label={`Cấp tiêu đề khối ${index + 1}`}
                        value={block.headingLevel ?? 2}
                        onChange={(event) =>
                          onChange(
                            updateBlock(document.blocks, block.id, {
                              headingLevel: Number(event.target.value) === 3 ? 3 : 2,
                            }),
                          )
                        }
                        className="rounded border border-black/10 bg-white px-2 py-1 text-[10px] font-label text-on-surface"
                      >
                        <option value={2}>Tiêu đề cấp 2</option>
                        <option value={3}>Tiêu đề cấp 3</option>
                      </select>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3">
          <p className="text-[11px] font-label text-on-surface-variant">
            Mẹo: đặt con trỏ trong ô chữ rồi bấm “Tách tại con trỏ”.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-label font-semibold text-on-primary hover:opacity-90"
          >
            Xong
          </button>
        </footer>
      </section>
    </div>
  );
};
