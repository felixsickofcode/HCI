import { useState, type ReactNode } from 'react';
import type { ReadingBlock } from '../../lib/document';

export function SnapshotFigure({ block, textContent }: { block: ReadingBlock; textContent: ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const label = `${block.snapshotKind === 'table' ? 'Bảng' : 'Hình'}${block.pageNumber ? ` · Trang ${block.pageNumber}` : ''}`;
  return (
    <figure className="my-8 min-w-0 overflow-hidden rounded-xl border border-current/20" aria-label={label}>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-current/15 px-4 py-2 text-sm" style={{ letterSpacing: 'normal' }}>
        <span>{block.caption || label}</span>
        <div className="flex items-center gap-2" role="group" aria-label={`Thu phóng ${label.toLowerCase()}`}>
          <button type="button" aria-label={`Thu nhỏ ${label.toLowerCase()}`} disabled={zoom === 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="h-9 w-9 rounded border border-current/20 disabled:opacity-30">−</button>
          <output className="w-12 text-center tabular-nums" aria-live="polite">{zoom * 100}%</output>
          <button type="button" aria-label={`Phóng to ${label.toLowerCase()}`} disabled={zoom === 3} onClick={() => setZoom(Math.min(3, zoom + 0.5))} className="h-9 w-9 rounded border border-current/20 disabled:opacity-30">+</button>
        </div>
      </figcaption>
      <div className="max-w-full overflow-auto bg-white" tabIndex={0} role="region" aria-label={`${label}, có thể cuộn khi phóng to`}>
        <img src={block.imageSrc} width={block.imageWidth} height={block.imageHeight} alt={`${label} giữ bố cục bản gốc`} loading="lazy" decoding="async" style={{ width: `${zoom * 100}%`, maxWidth: 'none', height: 'auto' }} />
      </div>
      {block.text.trim() && (
        <details className="border-t border-current/15 px-4 py-3">
          <summary className="cursor-pointer text-sm" style={{ letterSpacing: 'normal' }}>Văn bản để đọc và sao chép</summary>
          <div className="mt-3 whitespace-pre-wrap break-words text-[0.9em]">{textContent}</div>
        </details>
      )}
    </figure>
  );
}
