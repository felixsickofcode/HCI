import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ThemePalette } from '../../context/DisplaySettingsProvider';
import type { ReadingBlock } from '../../lib/document';
import type { SummaryItem } from '../../lib/summary';

interface SummarySourcesDialogProps {
  item: SummaryItem;
  blocks: ReadingBlock[];
  theme: ThemePalette;
  onClose: () => void;
  onGoToSource: (segmentId: string) => void;
}

export const SummarySourcesDialog: React.FC<SummarySourcesDialogProps> = ({
  item,
  blocks,
  theme,
  onClose,
  onGoToSource,
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-sources-title"
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl p-5 shadow-2xl sm:max-w-2xl sm:p-6"
        style={{
          backgroundColor: theme.panelBg,
          color: theme.fg,
          border: `1px solid ${theme.border}`,
        }}
      >
        <header
          className="flex items-start justify-between gap-4 pb-4"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <div>
            <h2 id="summary-sources-title" className="font-headline text-lg font-semibold">
              Nguồn hỗ trợ ý này
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.secondaryText }}>
              {item.text}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng nguồn"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.border}`,
              color: theme.secondaryText,
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="mt-4 space-y-3">
          {item.sources.map((sourceId, index) => {
            const sourceBlock = blocks.find((block) => block.id === sourceId);
            return (
              <details
                key={sourceId}
                open
                className="overflow-hidden rounded-xl"
                style={{
                  backgroundColor: theme.controlBg,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                  Đoạn nguồn {index + 1}
                </summary>
                <blockquote
                  className="mx-4 mb-3 pl-4 text-sm leading-relaxed whitespace-pre-line"
                  style={{
                    borderLeft: `2px solid ${theme.accent}`,
                    color: theme.secondaryText,
                  }}
                >
                  {sourceBlock?.text ?? 'Không tìm thấy đoạn nguồn trong tài liệu hiện tại.'}
                </blockquote>
                {sourceBlock && (
                  <div className="px-4 pb-3 text-right">
                    <button
                      type="button"
                      onClick={() => onGoToSource(sourceId)}
                      className="rounded-lg px-3 py-2 text-xs font-label font-semibold transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: theme.accentSoft,
                        border: `1px solid ${theme.accent}`,
                        color: theme.activeFg,
                      }}
                    >
                      Đi tới đoạn trong tài liệu
                    </button>
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
};

interface SummaryPreviewDialogProps {
  items: SummaryItem[];
  documentTitle: string;
  theme: ThemePalette;
  onClose: () => void;
}

export const SummaryPreviewDialog: React.FC<SummaryPreviewDialogProps> = ({
  items,
  documentTitle,
  theme,
  onClose,
}) => {
  const [previewItems, setPreviewItems] = useState<Array<{ id: string; text: string; included: boolean }>>(
    () => items.map((item) => ({ id: item.id, text: item.text, included: true })),
  );
  const [previewFontSize, setPreviewFontSize] = useState(16);
  const [previewFormat, setPreviewFormat] = useState<'list' | 'prose'>('list');
  const [previewError, setPreviewError] = useState('');
  const [previewCopied, setPreviewCopied] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const previewText = previewItems
    .filter((item) => item.included && item.text.trim())
    .map((item) => item.text.trim())
    .join(previewFormat === 'list' ? '\n\n' : ' ');

  const copySummaryPreview = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(previewText);
      setPreviewError('');
      setPreviewCopied(true);
    } catch {
      setPreviewError('Không thể sao chép nội dung trong trình duyệt này.');
      setPreviewCopied(false);
    }
  };

  const downloadSummaryText = () => {
    if (!previewText) return;
    const blob = new Blob([previewText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${(documentTitle || 'tom-tat').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tom-tat'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setPreviewError('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-preview-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          backgroundColor: theme.panelBg,
          color: theme.fg,
          border: `1px solid ${theme.border}`,
        }}
      >
        <header
          className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <div>
            <h2 id="summary-preview-title" className="font-headline text-xl font-semibold">
              Bản tóm tắt hoàn chỉnh
            </h2>
            <p className="mt-1 text-sm" style={{ color: theme.secondaryText }}>
              Chọn ý cần giữ, chỉnh nội dung và xem trước định dạng xuất.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng bản xem trước"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.border}`,
              color: theme.secondaryText,
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div
          className="flex flex-wrap items-end gap-3 px-5 py-3 sm:px-6"
          style={{
            backgroundColor: theme.surfaceBg,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-label font-medium">
            Cách trình bày
            <select
              value={previewFormat}
              onChange={(event) => {
                setPreviewFormat(event.target.value as 'list' | 'prose');
                setPreviewCopied(false);
              }}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: theme.controlBg,
                border: `1px solid ${theme.border}`,
                color: theme.fg,
              }}
            >
              <option value="list">Mỗi ý một đoạn</option>
              <option value="prose">Nối thành văn bản liền</option>
            </select>
          </label>
          <label className="flex min-w-36 flex-col gap-1 text-xs font-label font-medium">
            Cỡ chữ xem trước: {previewFontSize}px
            <input
              type="range"
              min="14"
              max="24"
              step="1"
              style={{ accentColor: theme.accent }}
              value={previewFontSize}
              onChange={(event) => setPreviewFontSize(Number(event.target.value))}
            />
          </label>
          <p className="ml-auto text-xs font-label" style={{ color: theme.secondaryText }}>
            {previewItems.filter((item) => item.included).length}/{previewItems.length} ý được chọn
          </p>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6"
          style={{ fontSize: `${previewFontSize}px` }}
        >
          {previewItems.length === 0 ? (
            <p className="text-sm" style={{ color: theme.secondaryText }}>
              Không có ý tóm tắt để xem trước.
            </p>
          ) : previewFormat === 'list' ? (
            <ol className="space-y-3">
              {previewItems.map((item, index) => (
                <li
                  key={item.id}
                  className={`rounded-xl p-3 transition-opacity ${item.included ? '' : 'opacity-60'}`}
                  style={{
                    backgroundColor: item.included ? theme.controlBg : theme.surfaceBg,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-label font-medium">
                      <input
                        type="checkbox"
                        checked={item.included}
                        style={{ accentColor: theme.accent }}
                        onChange={(event) => {
                          setPreviewCopied(false);
                          setPreviewItems((current) => current.map((entry) => (
                            entry.id === item.id ? { ...entry, included: event.target.checked } : entry
                          )));
                        }}
                      />
                      Giữ ý {index + 1}
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Chuyển ý ${index + 1} lên`}
                        disabled={index === 0}
                        onClick={() => {
                          setPreviewCopied(false);
                          setPreviewItems((current) => {
                            const next = [...current];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return next;
                          });
                        }}
                        className="rounded px-2 py-1 text-sm disabled:opacity-30"
                        style={{ backgroundColor: theme.surfaceBg, color: theme.fg }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Chuyển ý ${index + 1} xuống`}
                        disabled={index === previewItems.length - 1}
                        onClick={() => {
                          setPreviewCopied(false);
                          setPreviewItems((current) => {
                            const next = [...current];
                            [next[index], next[index + 1]] = [next[index + 1], next[index]];
                            return next;
                          });
                        }}
                        className="rounded px-2 py-1 text-sm disabled:opacity-30"
                        style={{ backgroundColor: theme.surfaceBg, color: theme.fg }}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <textarea
                    aria-label={`Nội dung ý ${index + 1}`}
                    value={item.text}
                    onChange={(event) => {
                      setPreviewCopied(false);
                      setPreviewItems((current) => current.map((entry) => (
                        entry.id === item.id ? { ...entry, text: event.target.value } : entry
                      )));
                    }}
                    rows={Math.max(2, Math.min(6, Math.ceil(item.text.length / 100)))}
                    className="w-full resize-y rounded-lg px-3 py-2 leading-relaxed focus:outline-none"
                    style={{
                      backgroundColor: theme.bg,
                      border: `1px solid ${theme.border}`,
                      color: theme.fg,
                    }}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="space-y-3">
              {previewItems.map((item, index) => (
                item.included && item.text.trim() ? (
                  <label key={item.id} className="block">
                    <span
                      className="mb-1 flex items-center gap-2 text-xs font-label font-medium"
                      style={{ color: theme.secondaryText }}
                    >
                      <input
                        type="checkbox"
                        checked
                        style={{ accentColor: theme.accent }}
                        onChange={() => {
                          setPreviewCopied(false);
                          setPreviewItems((current) => current.map((entry) => (
                            entry.id === item.id ? { ...entry, included: false } : entry
                          )));
                        }}
                      />
                      Ý {index + 1}
                    </span>
                    <textarea
                      aria-label={`Nội dung ý ${index + 1}`}
                      value={item.text}
                      onChange={(event) => {
                        setPreviewCopied(false);
                        setPreviewItems((current) => current.map((entry) => (
                          entry.id === item.id ? { ...entry, text: event.target.value } : entry
                        )));
                      }}
                      rows={Math.max(2, Math.min(6, Math.ceil(item.text.length / 100)))}
                      className="w-full resize-y rounded-lg px-3 py-2 leading-relaxed focus:outline-none"
                      style={{
                        backgroundColor: theme.controlBg,
                        border: `1px solid ${theme.border}`,
                        color: theme.fg,
                      }}
                    />
                  </label>
                ) : null
              ))}
            </div>
          )}

          {previewCopied && (
            <p role="status" className="mt-4 text-sm font-label font-medium" style={{ color: theme.activeFg }}>
              Đã sao chép toàn bộ bản tóm tắt.
            </p>
          )}
          {previewError && (
            <p
              role="alert"
              className="mt-4 rounded-xl px-3 py-2 text-sm"
              style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
            >
              {previewError}
            </p>
          )}
        </div>

        <footer
          className="flex flex-wrap justify-end gap-2 px-5 py-4 sm:px-6"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-label font-medium"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.border}`,
              color: theme.fg,
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => void copySummaryPreview()}
            disabled={!previewText}
            className="rounded-lg px-4 py-2 text-sm font-label font-semibold disabled:opacity-40"
            style={{
              backgroundColor: theme.accentSoft,
              border: `1px solid ${theme.accent}`,
              color: theme.activeFg,
            }}
          >
            Sao chép
          </button>
          <button
            type="button"
            onClick={downloadSummaryText}
            disabled={!previewText}
            className="rounded-lg px-4 py-2 text-sm font-label font-semibold disabled:opacity-40"
            style={{
              backgroundColor: theme.accent,
              color: theme.accentFg,
            }}
          >
            Tải .txt
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
