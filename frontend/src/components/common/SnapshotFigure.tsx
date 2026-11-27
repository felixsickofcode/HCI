import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ReadingBlock } from '../../lib/document';
import { ReadingTable } from './ReadingTable';

export function SnapshotFigure({ block, textContent }: { block: ReadingBlock; textContent: ReactNode }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const label = `${block.snapshotKind === 'table' ? 'Bảng' : 'Hình'}${block.pageNumber ? ` · Trang ${block.pageNumber}` : ''}`;
  const rows = block.rows?.length ? block.rows : undefined;

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen]);

  return (
    <figure className="my-8 min-w-0 overflow-hidden rounded-xl border border-current/20" aria-label={label}>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-current/15 px-4 py-2 text-sm" style={{ letterSpacing: 'normal' }}>
        <span>{block.caption || label}</span>
        <button
          type="button"
          aria-label={`Phóng to ${label.toLowerCase()}`}
          onClick={() => setLightboxOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded border border-current/20 px-3 disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">zoom_in</span>
          Phóng to
        </button>
      </figcaption>
      <div className="max-w-full overflow-auto bg-white" tabIndex={0} role="region" aria-label={label}>
        <img src={block.imageSrc} width={block.imageWidth} height={block.imageHeight} alt={`${label} giữ bố cục bản gốc`} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto' }} />
      </div>
      {rows ? (
        <details className="border-t border-current/15 px-4 py-3">
          <summary className="cursor-pointer text-sm" style={{ letterSpacing: 'normal' }}>Bảng dữ liệu để đọc và sao chép</summary>
          <div className="mt-3 text-[0.9em]">
            <ReadingTable rows={rows} label={block.caption || label} caption={block.caption} tableClassName="text-[1em]" />
          </div>
        </details>
      ) : block.text.trim() && (
        <details className="border-t border-current/15 px-4 py-3">
          <summary className="cursor-pointer text-sm" style={{ letterSpacing: 'normal' }}>Văn bản để đọc và sao chép</summary>
          <div className="mt-3 whitespace-pre-wrap break-words text-[0.9em]">{textContent}</div>
        </details>
      )}
      {lightboxOpen && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
          <button
            type="button"
            aria-label="Đóng ảnh phóng to"
            className="absolute inset-0 cursor-default bg-black/70"
            onClick={() => setLightboxOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} — cửa sổ phóng to`}
            className="relative z-10 flex max-h-[92vh] w-[min(96vw,72rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 text-sm text-gray-900">
              <span className="min-w-0 flex-1 break-words">{block.caption || label}</span>
              <div className="flex shrink-0 items-center gap-2" role="group" aria-label={`Thu phóng ${label.toLowerCase()}`}>
                <button type="button" aria-label="Thu nhỏ ảnh" disabled={zoom === 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="h-9 w-9 rounded border border-black/15 disabled:opacity-30">−</button>
                <output className="w-12 text-center tabular-nums" aria-live="polite">{zoom * 100}%</output>
                <button type="button" aria-label="Phóng ảnh lớn hơn" disabled={zoom === 3} onClick={() => setZoom(Math.min(3, zoom + 0.5))} className="h-9 w-9 rounded border border-black/15 disabled:opacity-30">+</button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Đóng cửa sổ phóng to"
                  onClick={() => setLightboxOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded border border-black/15 text-gray-700 hover:bg-black/5"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-auto bg-white p-4" tabIndex={0} role="region" aria-label={`${label}, có thể cuộn khi phóng to`}>
              <img src={block.imageSrc} width={block.imageWidth} height={block.imageHeight} alt={`${label} giữ bố cục bản gốc`} decoding="async" style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto' }} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </figure>
  );
}
