import React from 'react';
import { Link } from 'react-router-dom';
import {
  ManuscriptCard,
  AudioPlayerCapsule,
  HighlightMark,
} from '../../components/common';
import { mockReadingManuscript } from '../../mocks';

export const MinimalReadingView: React.FC = () => {
  const manuscript = mockReadingManuscript;

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
            {/* Top Quiet Archival Folio Ribbon */}
            <header className="flex items-center justify-between text-on-surface-variant/70 text-xs font-label tracking-[0.2em] uppercase mb-12 sm:mb-16 select-none">
              <span className="flex items-center gap-2 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary" />
                {manuscript.folioSeries}
              </span>
              <div className="flex items-center gap-4">
                <span>{manuscript.folioVolume}</span>
                <span className="text-outline-variant">•</span>
                <span>{manuscript.folioPage}</span>
              </div>
            </header>

            {/* Header & Work Title */}
            <div className="mb-10 text-center sm:text-left">
              <div className="inline-block text-tertiary font-label text-xs tracking-[0.25em] uppercase font-semibold mb-3.5 bg-tertiary-fixed/30 px-3 py-1 rounded-full select-none">
                {manuscript.sectionPart}
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] text-on-surface font-semibold tracking-tight leading-[1.3] mb-5">
                {manuscript.title}
              </h1>

              {/* Byline & Reading Pace Meta */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-on-surface-variant text-[13.5px] font-label select-none">
                <span className="font-medium text-on-surface">{manuscript.author}</span>
                <span className="text-outline-variant font-light">/</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">
                    schedule
                  </span>
                  {manuscript.readingTime}
                </span>
                <span className="text-outline-variant font-light">/</span>
                <span className="text-on-surface-variant/80">{manuscript.wordCount}</span>
              </div>
            </div>

            {/* Minimalist AI Audio Reader Capsule */}
            <div className="mb-14">
              <AudioPlayerCapsule initialDuration={manuscript.audioDuration} />
            </div>

            {/* Core Reading Body: Formatted with High-Readability & Dyslexia Ergonomics */}
            <div className="reading-body font-body text-[17.5px] sm:text-[19px] text-on-surface tracking-[0.035em] leading-[2.1] text-left">
              {/* Lead Paragraph with subtle drop-in tone */}
              <p className="mb-8 indent-6 sm:indent-8">
                Khi ánh sáng mặt trời hoàn toàn vụt tắt ở độ sâu vượt quá hai trăm mét, hành tinh của chúng ta không hề biến thành một cõi hoang vu tĩnh mịch. Ngược lại, tầng nước xanh thẳm ấy hé mở một vũ trụ diệu kỳ—nơi hàng triệu tia sáng mềm mại tự thắp lên giữa màn đêm vĩnh cửu của biển khơi. Hiện tượng{' '}
                <HighlightMark>phát quang sinh học</HighlightMark> (Bioluminescence) không chỉ là tấm áo rực rỡ, mà là ngôn ngữ sinh tồn tối thượng của muôn loài.
              </p>

              <p className="mb-10 indent-6 sm:indent-8">
                Khác biệt với ánh đèn nhân tạo nóng rực, nguồn quang năng dưới đáy đại dương hoàn toàn là một dạng{' '}
                <HighlightMark>ánh sáng lạnh</HighlightMark>. Chưa đầy hai mươi phần trăm năng lượng bị chuyển hóa thành nhiệt; toàn bộ phần còn lại tỏa ra một sắc xanh lam hoặc lục ngọc thanh khiết. Sở dĩ hai gam màu này ngự trị là bởi chúng sở hữu bước sóng ngắn nhất, cho phép ánh sáng xuyên qua khối nước dầy đặc mà không bị hấp thụ nhanh chóng.
              </p>

              {/* Poetic Callout Passage */}
              <blockquote className="my-12 px-6 sm:px-8 py-5 bg-surface-container-low rounded-lg text-on-surface-variant font-headline italic text-lg sm:text-[1.3rem] leading-[1.9]">
                {manuscript.calloutQuote}
              </blockquote>

              <p className="mb-10 indent-6 sm:indent-8">
                Bí mật hóa học của vũ điệu này nằm ở sự kết hợp giữa một hợp chất hữu cơ mang tên{' '}
                <span className="text-primary font-medium">luciferin</span> và chất xúc tác enzyme{' '}
                <span className="text-primary font-medium">luciferase</span>. Khi phân tử oxy tiếp xúc với phản ứng này, một chuỗi electron được kích hoạt, giải phóng các photon lấp lánh như bụi sao. Từ loài sứa lược mong manh như pha lê cho đến những bầy tôm sâu thẳm, chúng sử dụng thứ ánh sáng này để ngụy trang bằng phương thức phản chiếu ngược, xua đuổi kẻ săn mồi hoặc tìm kiếm tri kỷ trong cõi mịt mùng.
              </p>

              {/* Organic Inline Visual Vignette */}
              <figure className="my-14 -mx-2 sm:-mx-6 flex flex-col items-center">
                <div className="w-full h-72 sm:h-96 rounded-xl overflow-hidden shadow-md bg-surface-container">
                  <img
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    src={manuscript.figureImageSrc}
                    alt={manuscript.figureImageAlt}
                  />
                </div>
                <figcaption className="mt-4 text-center text-xs sm:text-[13px] font-label text-on-surface-variant tracking-wide px-4 select-none">
                  Loài sứa <span className="italic font-serif">Aequorea victoria</span> tỏa ánh hào quang lục lam thanh nhã giữa tầng nước trung khơi.
                </figcaption>
              </figure>

              <p className="mb-8 indent-6 sm:indent-8">
                {manuscript.fourthParagraph}
              </p>

              <p className="mb-4 indent-6 sm:indent-8">
                {manuscript.closingParagraph}
              </p>
            </div>

            {/* Editorial Endmark */}
            <div className="my-16 flex items-center justify-center gap-3 text-outline-variant select-none">
              <span className="w-8 h-[1px] bg-surface-container-highest" />
              <span className="text-xs font-serif text-tertiary">❦</span>
              <span className="w-8 h-[1px] bg-surface-container-highest" />
            </div>

            {/* Quiet Chapter Navigation */}
            <footer className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-label select-none border-t border-surface-container-low">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center sm:justify-start gap-2.5 transition-all text-xs uppercase tracking-wider font-medium"
              >
                <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                <span>{manuscript.prevChapter}</span>
              </button>

              <div className="text-xs text-on-surface-variant/70 font-mono tracking-wider hidden sm:block">
                {manuscript.currentChapterIndex}
              </div>

              <button
                type="button"
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface hover:text-primary flex items-center justify-center sm:justify-end gap-2.5 transition-all text-xs uppercase tracking-wider font-semibold"
              >
                <span>{manuscript.nextChapter}</span>
                <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
              </button>
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
