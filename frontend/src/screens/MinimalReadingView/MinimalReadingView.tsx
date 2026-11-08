import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ManuscriptCard, AudioPlayerCapsule, HighlightMark } from '../../components/common';
import { mockReadingManuscript } from '../../mocks';
import {
  useDisplaySettings, THEMES, FONT_STACKS, LIMITS,
} from '../../context/DisplaySettingsProvider';
import type { FontFamily, ThemeName } from '../../lib/api';
import booksIllustration from '../../assets/book_illustration.jpg';

const FONT_LABELS: Record<FontFamily, string> = {
  lexend: 'Lexend',
  opendyslexic: 'OpenDyslexic',
  arial: 'Arial',
  verdana: 'Verdana',
  merriweather: 'Merriweather',
};

const SIDEBAR_ITEMS = [
  { icon: 'auto_stories', label: 'Đọc tài liệu', active: true },
  { icon: 'library_books', label: 'Thư viện', active: false },
  { icon: 'bar_chart', label: 'Thống kê', active: false },
  { icon: 'settings', label: 'Cài đặt', active: false },
] as const;

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'Giao diện', label: 'Giao diện', icon: 'desktop_windows' },
  { key: 'Hỗ trợ đọc', label: 'Hỗ trợ đọc', icon: 'volume_up' },
  { key: 'Khác', label: 'Khác', icon: 'more_horiz' },
];
type Tab = 'Giao diện' | 'Hỗ trợ đọc' | 'Khác';

const Slider = (p: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  onChange: (v: number) => void;
}) => (
  <label className="block">
    <span className="flex justify-between mb-1.5 text-xs font-label text-on-surface-variant">
      <span>{p.label}</span>
      <span className="font-semibold text-on-surface">{p.value}{p.unit}</span>
    </span>
    <input
      type="range" className="w-full accent-primary" min={p.min} max={p.max} step={p.step} value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))}
    />
  </label>
);

export const MinimalReadingView: React.FC = () => {
  const manuscript = mockReadingManuscript;
  const { settings: s, update, reset } = useDisplaySettings();
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('Giao diện');
  const theme = THEMES[s.theme];

  // ----- Thước đọc bám dòng (logic giữ nguyên) -----
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rulerY, setRulerY] = useState(0);
  const lh = s.fontSize * s.lineHeight;

  const clampY = (y: number) => {
    const h = bodyRef.current?.getBoundingClientRect().height ?? 0;
    return Math.min(Math.max(0, y), Math.max(0, h - lh));
  };

  const onBodyMouseMove = (e: React.MouseEvent) => {
    if (!s.focus.enabled || !bodyRef.current) return;
    const top = bodyRef.current.getBoundingClientRect().top;
    setRulerY(clampY(e.clientY - top - lh / 2));
  };

  useEffect(() => {
    if (!s.focus.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setRulerY((y) => clampY(y + dir * lh));
      window.scrollBy({ top: dir * lh });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focus.enabled, lh]);

  const settingsPanel = (
    <aside className="flex flex-col w-[300px] max-w-[90vw] h-full rounded-3xl shadow-sm border border-black/5 bg-[#FFFDF8] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 shrink-0">
        <h2 className="flex items-center gap-2 text-[15px] font-headline font-semibold text-on-surface">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">tune</span>
          Cài đặt hiển thị
        </h2>
        <button
          type="button" onClick={() => setPanelOpen(false)} aria-label="Đóng"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-black/5"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="flex gap-1.5 px-4 pt-4 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-label font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-on-primary shadow-sm' : 'bg-black/[0.03] text-on-surface-variant hover:bg-black/[0.06]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
        {tab === 'Giao diện' && (
          <>
            <section className="space-y-2.5">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">Phông & kiểu chữ</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FONT_LABELS) as FontFamily[]).map((f) => (
                  <button
                    key={f} type="button" onClick={() => update({ fontFamily: f })} aria-pressed={s.fontFamily === f}
                    className={`min-w-0 px-2.5 py-2 rounded-xl text-left border transition-colors ${
                      s.fontFamily === f ? 'border-primary bg-primary/[0.06]' : 'border-black/10 hover:border-black/20'
                    }`}
                    style={{ fontFamily: FONT_STACKS[f] }}
                  >
                    <span className="block text-[13px] leading-tight font-semibold text-on-surface break-words">
                      {FONT_LABELS[f]}
                    </span>
                    {s.fontFamily === f && (
                      <span className="block text-[10px] font-label text-primary mt-0.5 leading-none">✓ Đang dùng</span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">Kích thước chữ</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button" onClick={() => update({ fontSize: Math.max(LIMITS.fontSize[0], s.fontSize - 1) })}
                  className="w-8 h-8 shrink-0 rounded-lg border border-black/10 flex items-center justify-center text-sm font-bold text-on-surface-variant hover:bg-black/5"
                >A-</button>
                <input
                  type="range" className="flex-1 accent-primary" min={LIMITS.fontSize[0]} max={LIMITS.fontSize[1]} step={1}
                  value={s.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })}
                />
                <button
                  type="button" onClick={() => update({ fontSize: Math.min(LIMITS.fontSize[1], s.fontSize + 1) })}
                  className="w-8 h-8 shrink-0 rounded-lg border border-black/10 flex items-center justify-center text-sm font-bold text-on-surface-variant hover:bg-black/5"
                >A+</button>
                <span className="text-xs font-label text-on-surface-variant w-10 text-right shrink-0">{s.fontSize}px</span>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">Khoảng cách</h3>
              <Slider label="Giãn dòng" value={s.lineHeight} min={LIMITS.lineHeight[0]} max={LIMITS.lineHeight[1]} step={0.1} onChange={(v) => update({ lineHeight: v })} />
              <Slider label="Giãn chữ" unit="em" value={s.letterSpacing} min={LIMITS.letterSpacing[0]} max={LIMITS.letterSpacing[1]} step={0.01} onChange={(v) => update({ letterSpacing: v })} />
              <Slider label="Độ rộng cột" unit="ch" value={s.columnWidth} min={LIMITS.columnWidth[0]} max={LIMITS.columnWidth[1]} step={1} onChange={(v) => update({ columnWidth: v })} />
            </section>

            <section className="space-y-2.5">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">Màu sắc & độ tương phản</h3>
              <div className="flex items-center gap-2.5 flex-wrap">
                {(Object.keys(THEMES) as ThemeName[]).map((k) => (
                  <button
                    key={k} type="button" onClick={() => update({ theme: k })} aria-pressed={s.theme === k}
                    title={THEMES[k].label}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${s.theme === k ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-black/10'}`}
                    style={{ backgroundColor: THEMES[k].bg }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant">{THEMES[s.theme].label} — đang áp dụng</p>
            </section>
          </>
        )}

        {tab === 'Hỗ trợ đọc' && (
          <section className="space-y-2.5">
            <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">Tính năng hỗ trợ</h3>

            <button
              type="button" role="switch" aria-checked={s.focus.enabled}
              onClick={() => update({ focus: { enabled: !s.focus.enabled } })}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-black/10 hover:border-black/20 text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">view_day</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-on-surface">Thước đọc bám dòng</span>
                <span className="block text-[11px] text-on-surface-variant mt-0.5">Làm mờ 70% các dòng xung quanh, dùng chuột hoặc phím ↑/↓.</span>
              </span>
              <span className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${s.focus.enabled ? 'bg-primary' : 'bg-black/15'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.focus.enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>

            <div className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-black/5 bg-black/[0.02] text-left opacity-80">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">graphic_eq</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-on-surface">Đọc văn bản (Text-to-Speech)</span>
                <span className="block text-[11px] text-on-surface-variant mt-0.5">Luôn sẵn dùng ở khối phát audio phía trên bài đọc.</span>
              </span>
              <span className="text-[11px] font-label text-on-surface-variant shrink-0">Luôn bật</span>
            </div>
          </section>
        )}

        {tab === 'Khác' && (
          <p className="text-sm text-on-surface-variant">Chưa có tùy chọn bổ sung.</p>
        )}
      </div>

      <div className="px-5 py-4 border-t border-black/5 space-y-3 shrink-0">
        <button type="button" onClick={reset} className="w-full text-xs font-label font-semibold text-on-surface-variant bg-black/[0.04] hover:bg-black/[0.07] rounded-lg py-2.5">
          Đặt lại mặc định
        </button>
        <div className="flex items-start gap-2 text-[11px] leading-snug bg-tertiary-fixed/25 text-on-surface rounded-xl px-3 py-2.5">
          <span className="material-symbols-outlined text-[15px] text-tertiary shrink-0 mt-0.5">lightbulb</span>
          Mẹo nhỏ: Hãy thử tăng khoảng cách dòng và dùng font Lexend để đọc dễ hơn nhé.
        </div>
      </div>
    </aside>
  );

  return (
    <div
      className="font-body antialiased h-screen flex overflow-hidden relative selection:bg-tertiary-fixed selection:text-on-tertiary-fixed"
      style={{ backgroundColor: theme.bg, color: theme.fg }}
    >
      {/* Sidebar — cố định hẳn, không cuộn theo trang */}
      <aside className="hidden lg:flex flex-col w-48 h-screen shrink-0 bg-[#FBF4E8] px-4 py-6 justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-8 px-2 select-none">
            <span className="font-headline text-lg font-semibold text-on-surface">LexiEase</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          </Link>
          <nav className="flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => (
              <div
                key={item.label}
                aria-disabled={!item.active}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-label select-none transition-colors ${
                  item.active
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant/70 cursor-not-allowed'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4">
          <img
            src={booksIllustration}
            alt=""
            className="w-32 h-28 object-contain select-none pointer-events-none"
          />

          <div className="w-full rounded-2xl bg-[#EEF1F8] border border-[#DCE2F0] px-4 py-5 text-center select-none">
            <span
                className="material-symbols-outlined text-[20px] text-tertiary"
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
            favorite
            </span>
            <p className="text-xs font-label text-on-surface-variant mt-2 leading-snug">
            Đọc dễ dàng hơn,<br />tự tin hơn mỗi ngày
            </p>
          </div>
        </div>
      </aside>

      {/* Cột phải: header cố định + (vùng đọc cuộn riêng | panel cố định) */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        <header className="w-full bg-[#FAF7F2]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-surface-container/60 shrink-0">
          <Link to="/" className="inline-flex lg:hidden items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors select-none">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Trở về Trang chủ</span>
          </Link>
          <Link to="/" className="hidden lg:inline-flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors select-none">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Trở về Trang chủ</span>
          </Link>

          {!panelOpen && (
            <button
              type="button" onClick={() => setPanelOpen(true)} aria-expanded={panelOpen}
              className="px-3 py-1.5 rounded-lg text-xs font-label uppercase tracking-wider bg-surface-container-low hover:bg-surface-container text-on-surface"
            >
              Cài đặt hiển thị
            </button>
          )}
        </header>

        {/* Mobile/tablet: panel vẫn là overlay portal (màn nhỏ không đủ chỗ cho cột cố định) */}
        {panelOpen && createPortal(
          <div className="lg:hidden">
            <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setPanelOpen(false)} />
            <div className="fixed top-0 right-0 h-full z-[70] py-0">{settingsPanel}</div>
          </div>,
          document.body,
        )}

        {/* Hàng chứa vùng đọc (cuộn riêng) + panel desktop (cố định) */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main className="flex-1 min-w-0 overflow-y-auto relative">
            <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center">
              <div className="w-[620px] h-[620px] rounded-full bg-tertiary-fixed/20 blur-[130px] opacity-70" />
            </div>

            <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-6">
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
                  <h1
                    className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] font-semibold tracking-tight leading-[1.3] mb-5"
                    style={{ fontFamily: FONT_STACKS[s.fontFamily] }}
                  >
                    {manuscript.title}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-[13.5px] font-label select-none">
                    <span className="font-medium">{manuscript.author}</span>
                    <span className="opacity-50 font-light">/</span>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-tertiary">schedule</span>
                      {manuscript.readingTime}
                    </span>
                    <span className="opacity-50 font-light">/</span>
                    <span className="opacity-80">{manuscript.wordCount}</span>
                  </div>
                </div>

                <div className="mb-14">
                  <AudioPlayerCapsule initialDuration={manuscript.audioDuration} />
                </div>

                <div
                  ref={bodyRef}
                  onMouseMove={onBodyMouseMove}
                  className="reading-body text-left mr-auto relative shrink-0"
                  style={{
                    fontFamily: FONT_STACKS[s.fontFamily],
                    fontSize: `${s.fontSize}px`,
                    lineHeight: s.lineHeight,
                    letterSpacing: `${s.letterSpacing}em`,
                    width: `${s.columnWidth}ch`,
                    maxWidth: '100%',
                    backgroundColor: theme.bg,
                    color: theme.fg,
                  }}
                >
                  {s.focus.enabled && (
                    <>
                      <div aria-hidden className="absolute left-0 right-0 top-0 z-10 pointer-events-none" style={{ height: rulerY, backgroundColor: `${theme.bg}B3` }} />
                      <div aria-hidden className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none" style={{ top: rulerY + lh, backgroundColor: `${theme.bg}B3` }} />
                    </>
                  )}

                  <p className="mb-8 indent-6 sm:indent-8">
                    Khi ánh sáng mặt trời hoàn toàn vụt tắt ở độ sâu vượt quá hai trăm mét, hành tinh của chúng ta không hề biến thành một cõi hoang vu tĩnh mịch. Ngược lại, tầng nước xanh thẳm ấy hé mở một vũ trụ diệu kỳ—nơi hàng triệu tia sáng mềm mại tự thắp lên giữa màn đêm vĩnh cửu của biển khơi. Hiện tượng{' '}
                    <HighlightMark>phát quang sinh học</HighlightMark> (Bioluminescence) không chỉ là tấm áo rực rỡ, mà là ngôn ngữ sinh tồn tối thượng của muôn loài.
                  </p>

                  <p className="mb-10 indent-6 sm:indent-8">
                    Khác biệt với ánh đèn nhân tạo nóng rực, nguồn quang năng dưới đáy đại dương hoàn toàn là một dạng{' '}
                    <HighlightMark>ánh sáng lạnh</HighlightMark>. Chưa đầy hai mươi phần trăm năng lượng bị chuyển hóa thành nhiệt; toàn bộ phần còn lại tỏa ra một sắc xanh lam hoặc lục ngọc thanh khiết. Sở dĩ hai gam màu này ngự trị là bởi chúng sở hữu bước sóng ngắn nhất, cho phép ánh sáng xuyên qua khối nước dầy đặc mà không bị hấp thụ nhanh chóng.
                  </p>

                  <blockquote className="my-12 px-6 sm:px-8 py-5 rounded-lg italic border-l-4 border-current/30">
                    {manuscript.calloutQuote}
                  </blockquote>

                  <p className="mb-10 indent-6 sm:indent-8">
                    Bí mật hóa học của vũ điệu này nằm ở sự kết hợp giữa một hợp chất hữu cơ mang tên{' '}
                    <span className="font-semibold">luciferin</span> và chất xúc tác enzyme{' '}
                    <span className="font-semibold">luciferase</span>. Khi phân tử oxy tiếp xúc với phản ứng này, một chuỗi electron được kích hoạt, giải phóng các photon lấp lánh như bụi sao. Từ loài sứa lược mong manh như pha lê cho đến những bầy tôm sâu thẳm, chúng sử dụng thứ ánh sáng này để ngụy trang bằng phương thức phản chiếu ngược, xua đuổi kẻ săn mồi hoặc tìm kiếm tri kỷ trong cõi mịt mùng.
                  </p>

                  <figure className="my-14 -mx-2 sm:-mx-6 flex flex-col items-center">
                    <div className="w-full h-72 sm:h-96 rounded-xl overflow-hidden shadow-md bg-surface-container">
                      <img
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        src={manuscript.figureImageSrc}
                        alt={manuscript.figureImageAlt}
                      />
                    </div>
                    <figcaption className="mt-4 text-center text-xs sm:text-[13px] font-label tracking-wide px-4 select-none opacity-80">
                      Loài sứa <span className="italic">Aequorea victoria</span> tỏa ánh hào quang lục lam thanh nhã giữa tầng nước trung khơi.
                    </figcaption>
                  </figure>

                  <p className="mb-8 indent-6 sm:indent-8">{manuscript.fourthParagraph}</p>
                  <p className="mb-4 indent-6 sm:indent-8">{manuscript.closingParagraph}</p>
                </div>

                <div className="my-16 flex items-center justify-center gap-3 select-none opacity-60">
                  <span className="w-8 h-[1px] bg-current" />
                  <span className="text-xs font-serif text-tertiary">❦</span>
                  <span className="w-8 h-[1px] bg-current" />
                </div>

                <footer className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-label select-none border-t border-current/20">
                  <button type="button" className="w-full sm:w-auto px-5 py-3 rounded-lg border border-current/30 hover:bg-black/5 flex items-center justify-center sm:justify-start gap-2.5 transition-all text-xs uppercase tracking-wider font-medium">
                    <span className="material-symbols-outlined text-[17px]">arrow_back</span>
                    <span>{manuscript.prevChapter}</span>
                  </button>
                  <div className="text-xs opacity-70 font-mono tracking-wider hidden sm:block">
                    {manuscript.currentChapterIndex}
                  </div>
                  <button type="button" className="w-full sm:w-auto px-5 py-3 rounded-lg border border-current/30 hover:bg-black/5 flex items-center justify-center sm:justify-end gap-2.5 transition-all text-xs uppercase tracking-wider font-semibold">
                    <span>{manuscript.nextChapter}</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </button>
                </footer>
              </ManuscriptCard>

              <div className="mt-8 text-center text-xs font-label opacity-50 tracking-wider select-none">
                <span>Nhấp chuột phải bất kỳ nơi nào trên văn bản để mở thực đơn hỗ trợ nếu cần</span>
              </div>
            </div>
          </main>

          {panelOpen && <div className="hidden lg:block shrink-0 h-full py-6 pr-6">{settingsPanel}</div>}
        </div>
      </div>
    </div>
  );
};