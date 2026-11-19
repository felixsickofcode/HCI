import { useEffect, useState } from 'react';
import { ReadingText } from '../../components/common/ReadingText';
import { buildFileDocument, type ReadingDocument } from '../../lib/document';

function parseNormalized(json: unknown, sourceFile: File): ReadingDocument {
  if (!json || typeof json !== 'object') throw new Error('JSON không phải object.');
  const data = json as Record<string, unknown>;
  if (data.source !== 'pdf' || typeof data.text !== 'string' ||
      typeof data.ocrUsed !== 'boolean' || !Array.isArray(data.blocks) ||
      (data.pageCount !== null && typeof data.pageCount !== 'number')) {
    throw new Error('JSON không đúng hợp đồng normalized PDF.');
  }
  return buildFileDocument(sourceFile, data as unknown as Parameters<typeof buildFileDocument>[1]);
}

/** Local-only review route. JSON and PDF stay in the browser session. */
export function PdfReview() {
  const [document, setDocument] = useState<ReadingDocument | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(20);
  const [columnWidth, setColumnWidth] = useState(68);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (originalUrl) return () => URL.revokeObjectURL(originalUrl);
  }, [originalUrl]);

  const loadOriginal = (file: File | null) => {
    setOriginal(file);
    setOriginalUrl(file ? URL.createObjectURL(file) : null);
  };

  const loadJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const sourceFile = original ?? new File([], 'review.pdf', { type: 'application/pdf' });
      setDocument(parseNormalized(parsed, sourceFile));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không mở được JSON.');
      setDocument(null);
    }
  };

  return (
    <main className={dark ? 'min-h-screen bg-[#171b20] text-[#f1eee8]' : 'min-h-screen bg-[#faf7f2] text-[#1b1c1d]'}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <h1 className="text-xl font-semibold">PDF parser review · local dev</h1>
        <p className="mt-2 text-sm opacity-75">Chọn normalized.json của một run và PDF gốc để đối chiếu. Tệp chỉ được đọc trong tab này.</p>
        <div className="mt-5 flex flex-wrap items-end gap-4 rounded-xl border border-current/20 p-4 text-sm">
          <label className="flex flex-col gap-1">Normalized JSON
            <input type="file" accept="application/json,.json" onChange={(event) => void loadJson(event.target.files?.[0])} />
          </label>
          <label className="flex flex-col gap-1">PDF gốc
            <input type="file" accept="application/pdf,.pdf" onChange={(event) => loadOriginal(event.target.files?.[0] ?? null)} />
          </label>
          <label className="flex flex-col gap-1">Cỡ chữ: {fontSize}px
            <input type="range" min="16" max="32" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
          </label>
          <label className="flex flex-col gap-1">Cột: {columnWidth}ch
            <input type="range" min="45" max="75" value={columnWidth} onChange={(event) => setColumnWidth(Number(event.target.value))} />
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} />Nền tối</label>
        </div>
        {error && <p role="alert" className="mt-4 text-red-600">{error}</p>}
        {document ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section aria-label="Trang đọc" className="min-w-0 rounded-xl border border-current/15 p-4 sm:p-6">
              <div className="mx-auto min-w-0" style={{ maxWidth: `${columnWidth}ch` }}>
                <h2 className="mb-6 text-lg font-semibold">{document.title}</h2>
                <p className="mb-5 text-xs opacity-70">{document.blocks.length} blocks · {document.pageCount ?? '?'} trang</p>
                <ReadingText blocks={document.blocks} activeBoundary={null} style={{ fontFamily: '"Noto Serif", serif', fontSize, lineHeight: 1.8, letterSpacing: '0.02em', overflowWrap: 'anywhere' }} />
              </div>
            </section>
            <section aria-label="Bản gốc" className="min-w-0 rounded-xl border border-current/15 p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Bản gốc</h2>
              {originalUrl ? <iframe title="PDF gốc" src={originalUrl} className="h-[75vh] w-full bg-white" /> : <p className="text-sm opacity-70">Chọn PDF gốc để đối chiếu.</p>}
            </section>
          </div>
        ) : <p className="mt-8 text-sm opacity-70">Chưa có normalized JSON.</p>}
      </div>
    </main>
  );
}
