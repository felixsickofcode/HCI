import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ManuscriptCard } from '../../components/common';
import { useDocument } from '../../context';
import { countWords, readingMinutes, toParagraphs } from '../../lib/document';
import type { DocumentSource } from '../../lib/document';

const SOURCE_LABEL: Record<DocumentSource, string> = {
  paste: 'Văn bản dán',
  pdf: 'Tệp PDF',
  image: 'Ảnh chụp',
};

export const MinimalReadingView: React.FC = () => {
  const { document: doc, clearDocument } = useDocument();

  if (!doc) return <Navigate to="/" replace />;

  const paragraphs = toParagraphs(doc.text);
  const words = countWords(doc.text);

  return (
    <div className="bg-paper-texture font-body text-on-surface antialiased min-h-screen relative selection:bg-tertiary-fixed selection:text-on-tertiary-fixed">
      {/* Floating Back Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF7F2]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-surface-container/60">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors select-none"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Trở về Trang chủ</span>
        </Link>
        <div className="flex items-center gap-2 select-none">
          <span className="font-headline text-lg font-semibold text-on-surface">LexiEase</span>
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
        </div>
      </header>

      {/* Main Reading Container */}
      <main className="w-full min-h-screen">
        <div className="flex flex-col w-full items-center py-10 px-4 sm:px-6 lg:px-8">
          {/* Subtle ambient reading illumination */}
          <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center">
            <div className="w-[620px] h-[620px] rounded-full bg-tertiary-fixed/20 blur-[130px] opacity-70" />
          </div>

          {/* Primary Reading Manuscript Page Canvas */}
          <ManuscriptCard>
            {/* Header & Work Title */}
            <div className="mb-10 text-center sm:text-left">
              <div className="inline-block text-tertiary font-label text-xs tracking-[0.25em] uppercase font-semibold mb-3.5 bg-tertiary-fixed/30 px-3 py-1 rounded-full select-none">
                {SOURCE_LABEL[doc.source]}
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] text-on-surface font-semibold tracking-tight leading-[1.3] mb-5 break-words">
                {doc.title}
              </h1>

              {/* Reading Pace Meta */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-on-surface-variant text-[13.5px] font-label select-none">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">
                    schedule
                  </span>
                  Khoảng {readingMinutes(doc.text)} phút đọc
                </span>
                <span className="text-outline-variant font-light">/</span>
                <span className="text-on-surface-variant/80">
                  {words.toLocaleString('vi-VN')} từ
                </span>
                {doc.pageCount ? (
                  <>
                    <span className="text-outline-variant font-light">/</span>
                    <span className="text-on-surface-variant/80">{doc.pageCount} trang</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* OCR notice */}
            {doc.ocrUsed && (
              <p
                role="note"
                className="mb-10 px-4 py-3 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-label leading-relaxed"
              >
                Văn bản này được nhận dạng tự động từ hình ảnh nên có thể còn sai sót về chữ hoặc dấu.
              </p>
            )}

            {/* Core Reading Body */}
            <div className="reading-body font-body text-[17.5px] sm:text-[19px] text-on-surface tracking-[0.035em] leading-[2.1] text-left">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-8 indent-6 sm:indent-8">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Editorial Endmark */}
            <div className="my-16 flex items-center justify-center gap-3 text-outline-variant select-none">
              <span className="w-8 h-[1px] bg-surface-container-highest" />
              <span className="text-xs font-serif text-tertiary">❦</span>
              <span className="w-8 h-[1px] bg-surface-container-highest" />
            </div>

            {/* Footer action */}
            <footer className="pt-6 flex items-center justify-center border-t border-surface-container-low">
              <Link
                to="/"
                onClick={clearDocument}
                className="px-5 py-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary flex items-center gap-2.5 transition-all text-xs uppercase tracking-wider font-medium select-none"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>
                <span>Đọc văn bản khác</span>
              </Link>
            </footer>
          </ManuscriptCard>

          {/* Right-Click Quick Reading Aid Modal Hint */}
          <div className="mt-8 text-center text-xs font-label text-on-surface-variant/50 tracking-wider select-none">
            <span>Nhấp chuột phải bất kỳ nơi nào trên văn bản để mở thực đơn hỗ trợ nếu cần</span>
          </div>
        </div>
      </main>
    </div>
  );
};