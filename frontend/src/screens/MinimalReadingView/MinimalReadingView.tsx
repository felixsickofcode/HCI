import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ManuscriptCard, AudioPlayerCapsule, HighlightMark } from '../../components/common';
import { mockReadingManuscript } from '../../mocks';
import {
  useDisplaySettings, THEMES, FONT_STACKS, LIMITS, DEFAULTS,
} from '../../context/DisplaySettingsProvider';
import type { FontFamily, ThemeName } from '../../lib/api';
import { createPortal } from 'react-dom';

const BLOCK_COUNT = 6; // p0, p1, blockquote, p3, p4, p5

const Slider = (p: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void;
}) => (
  <label className="block text-xs">
    <span className="flex justify-between mb-1">
      <span>{p.label}</span>
      <span>{p.value}{p.unit}</span>
    </span>
    <input
      type="range" className="w-full" min={p.min} max={p.max} step={p.step} value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))}
    />
  </label>
);

export const MinimalReadingView: React.FC = () => {
  const manuscript = mockReadingManuscript;
  const { settings: s, update, reset } = useDisplaySettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const [active, setActive] = useState(0);
  const theme = THEMES[s.theme];

  // Phím ↑/↓ chỉ hoạt động khi Focus Mode bật.
  useEffect(() => {
    if (!s.focus.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      e.preventDefault();
      setActive((i) => {
        const next = Math.min(BLOCK_COUNT - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
        document.querySelector(`[data-block="${next}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.focus.enabled]);

  // Gắn vào từng khối văn bản: làm mờ (opacity-30) khối không được chọn.
  const fp = (i: number, base: string) => ({
    'data-block': i,
    className: `${base} ${s.focus.enabled ? `transition-opacity duration-200 ${active === i ? 'opacity-100' : 'opacity-30'}` : ''}`,
    onMouseEnter: s.focus.enabled ? () => setActive(i) : undefined,
  });

  return (
    <div
      className="font-body antialiased min-h-screen relative selection:bg-tertiary-fixed selection:text-on-tertiary-fixed"
      style={{ backgroundColor: theme.bg, color: theme.fg }}
    >
      {/* Floating Back Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#FAF7F2]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-surface-container/60">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors select-none"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Trở về Trang chủ</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Nút và bảng Hiển thị */}
          <div className="relative">
            <>
            <button
                type = "button"
                onClick={() => setPanelOpen(true)}
                aria-expanded={panelOpen}
                className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-surface-container-low hover:bg-surface-container text-on-surface"
            >
             Hiển thị
            </button>

            {panelOpen && createPortal (
                <>
                <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPanelOpen(false)} />
                <aside
                    className="fixed top-0 right-0 h-full w-[340px] max-w-[90vw] z-50 overflow-y-auto p-5 space-y-6 shadow-2xl border-l-2 border-black/20"
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                    aria-label="Cài đặt hiển thị"
                >
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Cài đặt hiển thị</h2>
                      <button
                        type="button" onClick={() => setPanelOpen(false)} aria-label="Đóng"
                        className="w-10 h-10 rounded-xl border-2 border-current/40 text-lg"
                      >
                      ✕
                      </button>
                      </div>

                      <section className="space-y-3">
                        <h3 className="font-semibold">Phông & cỡ chữ</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(['lexend', 'opendyslexic', 'arial', 'verdana'] as FontFamily[]).map((f) => (
                                <button
                                    key={f} type="button" onClick={() => update({ fontFamily: f })} aria-pressed={s.fontFamily === f}
                                    className={`p-3 rounded-xl text-left border-2 ${s.fontFamily === f ? 'border-current' : 'border-current/30'}`}
                                    style={{ fontFamily: FONT_STACKS[f] }}
                                >
                                    <span className="block font-semibold">{{ lexend: 'Lexend', opendyslexic: 'OpenDyslexic', arial: 'Arial', verdana: 'Verdana' }[f]}</span>
                                    <span className="text-xs opacity-70">{s.fontFamily === f ? '✓ Đang dùng' : 'Chọn'}</span>
                                  </button>
                            ))}
                        </div>
                        <Slider label="Cỡ chữ" unit="px" value={s.fontSize} min={LIMITS.fontSize[0]} max={LIMITS.fontSize[1]} step={1} onChange={(v) => update({ fontSize: v })} />
                      </section>
                      <section className="space-y-3">
                        <h3 className="font-semibold">Giãn cách & độ rộng cột</h3>
                        <Slider label="Giãn dòng" value={s.lineHeight} min={LIMITS.lineHeight[0]} max={LIMITS.lineHeight[1]} step={0.1} onChange={(v) => update({ lineHeight: v })} />
                        <Slider label="Giãn chữ" unit="em" value={s.letterSpacing} min={LIMITS.letterSpacing[0]} max={LIMITS.letterSpacing[1]} step={0.01} onChange={(v) => update({ letterSpacing: v })} />
                        <Slider label="Độ rộng cột" unit="ch" value={s.columnWidth} min={LIMITS.columnWidth[0]} max={LIMITS.columnWidth[1]} step={1} onChange={(v) => update({ columnWidth: v })} />
                      </section>

                      <section className="space-y-3">
                        <h3 className="font-semibold">Màu sắc & công cụ tập trung</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(THEMES) as ThemeName[]).map((k) => (
                                <button
                                    key={k} type="button" onClick={() => update({ theme: k })} aria-pressed={s.theme === k}
                                    className={`p-3 rounded-xl text-left border-2 ${s.theme === k ? 'border-[#111] ring-2 ring-[#111]' : 'border-black/30'}`}
                                    style={{ backgroundColor: THEMES[k].bg, color: THEMES[k].fg }}
                                >
                                    <span className="block text-xl font-bold">Aa</span>
                                    <span className="text-xs font-semibold">{THEMES[k].label}{s.theme === k ? ' ✓' : ''}</span>
                                </button>
                            ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={s.focus.enabled} onChange={(e) => update({ focus: { enabled: e.target.checked } })} />
                            Chế độ tập trung (di chuột hoặc ↑/↓)
                        </label>
                      </section>

                      <button type="button" onClick={reset} className="text-sm underline">Đặt lại mặc định</button>
                    </aside>
                </>,
                document.body
            )}
            </>
          </div>

          <div className="flex items-center gap-2 select-none">
            <span className="font-headline text-lg font-semibold text-on-surface">LexiEase</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          </div>
        </div>
      </header>

      {/* Main Reading Container */}
      <main className="w-full min-h-screen">
        <div className="flex flex-col w-full items-center py-10 px-4 sm:px-6 lg:px-8">
          <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center">
            <div className="w-[620px] h-[620px] rounded-full bg-tertiary-fixed/20 blur-[130px] opacity-70" />
          </div>

          <ManuscriptCard>
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

            <div className="mb-10 text-center sm:text-left">
              <div className="inline-block text-tertiary font-label text-xs tracking-[0.25em] uppercase font-semibold mb-3.5 bg-tertiary-fixed/30 px-3 py-1 rounded-full select-none">
                {manuscript.sectionPart}
              </div>
              <h1 className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] text-on-surface font-semibold tracking-tight leading-[1.3] mb-5">
                {manuscript.title}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-on-surface-variant text-[13.5px] font-label select-none">
                <span className="font-medium text-on-surface">{manuscript.author}</span>
                <span className="text-outline-variant font-light">/</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">schedule</span>
                  {manuscript.readingTime}
                </span>
                <span className="text-outline-variant font-light">/</span>
                <span className="text-on-surface-variant/80">{manuscript.wordCount}</span>
              </div>
            </div>

            <div className="mb-14">
              <AudioPlayerCapsule initialDuration={manuscript.audioDuration} />
            </div>

            {/* Core Reading Body: theo cài đặt hiển thị của người dùng */}
            <div
              className="reading-body text-left mr-auto"
              style={{
                fontFamily: FONT_STACKS[s.fontFamily],
                fontSize: `${s.fontSize}px`,
                lineHeight: s.lineHeight,
                letterSpacing: `${s.letterSpacing}em`,
                maxWidth: `${s.columnWidth}ch`,
                backgroundColor: theme.bg,
                color: theme.fg,
              }}
            >
              <p {...fp(0, 'mb-8 indent-6 sm:indent-8')}>
                Khi ánh sáng mặt trời hoàn toàn vụt tắt ở độ sâu vượt quá hai trăm mét, hành tinh của chúng ta không hề biến thành một cõi hoang vu tĩnh mịch. Ngược lại, tầng nước xanh thẳm ấy hé mở một vũ trụ diệu kỳ—nơi hàng triệu tia sáng mềm mại tự thắp lên giữa màn đêm vĩnh cửu của biển khơi. Hiện tượng{' '}
                <HighlightMark>phát quang sinh học</HighlightMark> (Bioluminescence) không chỉ là tấm áo rực rỡ, mà là ngôn ngữ sinh tồn tối thượng của muôn loài.
              </p>

              <p {...fp(1, 'mb-10 indent-6 sm:indent-8')}>
                Khác biệt với ánh đèn nhân tạo nóng rực, nguồn quang năng dưới đáy đại dương hoàn toàn là một dạng{' '}
                <HighlightMark>ánh sáng lạnh</HighlightMark>. Chưa đầy hai mươi phần trăm năng lượng bị chuyển hóa thành nhiệt; toàn bộ phần còn lại tỏa ra một sắc xanh lam hoặc lục ngọc thanh khiết. Sở dĩ hai gam màu này ngự trị là bởi chúng sở hữu bước sóng ngắn nhất, cho phép ánh sáng xuyên qua khối nước dầy đặc mà không bị hấp thụ nhanh chóng.
              </p>

              <blockquote {...fp(2, 'my-12 px-6 sm:px-8 py-5 bg-surface-container-low rounded-lg italic')}>
                {manuscript.calloutQuote}
              </blockquote>

              <p {...fp(3, 'mb-10 indent-6 sm:indent-8')}>
                Bí mật hóa học của vũ điệu này nằm ở sự kết hợp giữa một hợp chất hữu cơ mang tên{' '}
                <span className="text-primary font-medium">luciferin</span> và chất xúc tác enzyme{' '}
                <span className="text-primary font-medium">luciferase</span>. Khi phân tử oxy tiếp xúc với phản ứng này, một chuỗi electron được kích hoạt, giải phóng các photon lấp lánh như bụi sao. Từ loài sứa lược mong manh như pha lê cho đến những bầy tôm sâu thẳm, chúng sử dụng thứ ánh sáng này để ngụy trang bằng phương thức phản chiếu ngược, xua đuổi kẻ săn mồi hoặc tìm kiếm tri kỷ trong cõi mịt mùng.
              </p>

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

              <p {...fp(4, 'mb-8 indent-6 sm:indent-8')}>{manuscript.fourthParagraph}</p>

              <p {...fp(5, 'mb-4 indent-6 sm:indent-8')}>{manuscript.closingParagraph}</p>
            </div>

            <div className="my-16 flex items-center justify-center gap-3 text-outline-variant select-none">
              <span className="w-8 h-[1px] bg-surface-container-highest" />
              <span className="text-xs font-serif text-tertiary">❦</span>
              <span className="w-8 h-[1px] bg-surface-container-highest" />
            </div>

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

          <div className="mt-8 text-center text-xs font-label text-on-surface-variant/50 tracking-wider select-none">
            <span>Nhấp chuột phải bất kỳ nơi nào trên văn bản để mở thực đơn hỗ trợ nếu cần</span>
          </div>
        </div>
      </main>
    </div>
  );
};