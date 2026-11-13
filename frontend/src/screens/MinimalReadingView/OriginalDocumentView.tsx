import { useEffect, useState } from 'react';

interface OriginalDocumentViewProps {
  file: File;
  source: 'pdf' | 'image';
}

export function OriginalDocumentView({ file, source }: OriginalDocumentViewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => {
      if (active) setObjectUrl(url);
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!objectUrl) {
    return <p className="p-6 text-sm" role="status">Đang mở tệp gốc…</p>;
  }

  return (
    <div className="flex h-full min-h-[480px] flex-col bg-[#e8e8e8]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white px-4 py-3 text-sm text-[#222]">
        <span className="min-w-0 truncate font-medium" title={file.name}>{file.name}</span>
        <a
          href={objectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 font-medium hover:bg-black/5"
        >
          Mở bản gốc ở tab mới
        </a>
      </div>
      {source === 'pdf' ? (
        <iframe
          title={`Bản gốc PDF: ${file.name}`}
          src={objectUrl}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />
      ) : (
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <img
            src={objectUrl}
            alt={`Bản gốc của ${file.name}`}
            className="mx-auto block h-auto max-w-full bg-white shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
