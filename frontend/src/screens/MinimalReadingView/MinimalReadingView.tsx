import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SaveVocabularyDialog } from '../../components/vocabulary/SaveVocabularyDialog';
import { readVocabularySelection } from '../../lib/vocabulary-selection';
import type { VocabularyDraft } from '../../lib/vocabulary';
import { Link, Navigate } from 'react-router-dom';
import { AudioPlayerCapsule, ManuscriptCard, ReadingText } from '../../components/common';
import { useDocument } from '../../context';
import {
  useDisplaySettings, THEMES, FONT_STACKS, LIMITS,
} from '../../context/DisplaySettingsProvider';
import { countWords, readingMinutes, toParagraphs } from '../../lib/document';
import type { DocumentSource } from '../../lib/document';
import type { FontFamily, ThemeName } from '../../lib/api';
import booksIllustration from '../../assets/book_illustration.jpg';
import {
  getSpeechVoices,
  hasVietnameseVoice,
  isSpeechSupported,
  pickPreferredVoice,
  SPEECH_SPEEDS,
  SpeechController,
} from '../../lib/speech';
import type { BoundaryReliability, ReadingSegment, SpeechBoundaryEvent, SpeechStatus } from '../../lib/speech';

const SOURCE_LABEL: Record<DocumentSource, string> = {
  paste: 'Văn bản dán',
  pdf: 'Tệp PDF',
  image: 'Ảnh chụp',
};

const FONT_LABELS: Record<FontFamily, string> = {
  lexend: 'Lexend',
  arial: 'Arial',
  verdana: 'Verdana',
  merriweather: 'Merriweather',
  opendyslexic: 'OpenDyslexic',
};

const SIDEBAR_ITEMS = [
  { icon: 'auto_stories', label: 'Đọc tài liệu', active: true },
  { icon: 'bar_chart', label: 'Thống kê', active: false },
  { icon: 'settings', label: 'Cài đặt', active: false },
] as const;

type Tab = 'Giao diện' | 'Hỗ trợ đọc' | 'Khác';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'Giao diện', label: 'Giao diện', icon: 'desktop_windows' },
  { key: 'Hỗ trợ đọc', label: 'Hỗ trợ đọc', icon: 'volume_up' },
  { key: 'Khác', label: 'Khác', icon: 'more_horiz' },
];

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
  const { document: doc, clearDocument } = useDocument();
  const { settings: s, update, reset } = useDisplaySettings();
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);
  const [tab, setTab] = useState<Tab>('Giao diện');
  const theme = THEMES[s.theme];

  const paragraphs = doc ? toParagraphs(doc.text) : [];
  const segments: ReadingSegment[] = paragraphs.map((text, index) => ({
    id: `paragraph-${index}`,
    text,
    kind: 'paragraph',
  }));
  const speechRef = useRef<SpeechController | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>(() => isSpeechSupported() ? 'idle' : 'unsupported');
  const [boundaryReliability, setBoundaryReliability] = useState<BoundaryReliability>('unknown');
  const [activeBoundary, setActiveBoundary] = useState<SpeechBoundaryEvent | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getSpeechVoices());
  const [voicesLoading, setVoicesLoading] = useState(() => isSpeechSupported() && getSpeechVoices().length === 0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => pickPreferredVoice(getSpeechVoices())?.voiceURI || '');
  const [rate, setRate] = useState<number>(1);
  const [speechError, setSpeechError] = useState('');
  const [wordDraft, setWordDraft] = useState<VocabularyDraft | null>(null);
  const [selectionError, setSelectionError] = useState('');
  const closeWordDialog = useCallback(() => setWordDraft(null), []);

  useEffect(() => {
    const controller = new SpeechController();
    speechRef.current = controller;
    controller.attachCallbacks({
      onStatusChange: (nextStatus, message) => {
        setSpeechStatus(nextStatus);
        setSpeechError(message ?? '');
        if (nextStatus === 'ended' || nextStatus === 'stopped' || nextStatus === 'error') {
          setActiveBoundary(null);
        }
      },
      onBoundary: (boundary) => {
        setActiveBoundary(boundary);
        setCurrentSegmentIndex(boundary.segmentIndex);
      },
      onVoicesChange: (nextVoices) => {
        setVoices(nextVoices);
        setVoicesLoading(false);
        setSelectedVoiceURI((current) => current || pickPreferredVoice(nextVoices)?.voiceURI || '');
      },
      onBoundaryReliabilityChange: (nextReliability) => {
        setBoundaryReliability(nextReliability);
        if (nextReliability === 'unreliable') setActiveBoundary(null);
      },
    });
    const voicesLoadingTimeout = window.setTimeout(() => setVoicesLoading(false), 5000);
    return () => {
      window.clearTimeout(voicesLoadingTimeout);
      controller.detachCallbacks();
      controller.destroy();
      speechRef.current = null;
    };
  }, [doc?.id]);

  const selectedVoice = voices.find((voice) => voice.voiceURI === selectedVoiceURI) ?? pickPreferredVoice(voices);
  const startReading = () => {
    setSpeechError('');
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({ segments, rate, voice: selectedVoice });
  };
  const cycleRate = () => {
    const nextRate = SPEECH_SPEEDS[(SPEECH_SPEEDS.indexOf(rate as typeof SPEECH_SPEEDS[number]) + 1) % SPEECH_SPEEDS.length];
    setRate(nextRate);
    if (speechStatus === 'speaking' || speechStatus === 'paused') {
      speechRef.current?.restartFromLastPosition(nextRate, selectedVoice);
    }
  };

  // ----- Thước đọc bám dòng -----
  const mainRef = useRef<HTMLElement>(null);
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
      if (document.querySelector('dialog[open]') || ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setRulerY((y) => clampY(y + dir * lh));
      mainRef.current?.scrollBy({ top: dir * lh });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.focus.enabled, lh]);

  const saveSelectedWord = () => {
    if (!bodyRef.current || !doc) return;
    try {
      const draft = readVocabularySelection(bodyRef.current, doc);
      if (!draft) { setSelectionError('Hãy bôi chọn một từ hoặc cụm từ trong bài trước khi lưu.'); return; }
      setSelectionError('');
      setWordDraft(draft);
    } catch (error) { setSelectionError((error as Error).message); }
  };

  const settingsPanel = (
    <aside className="flex flex-col w-[340px] max-w-[92vw] h-full rounded-3xl shadow-sm border border-black/5 bg-[#FFFDF8] overflow-hidden">
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
                    <span className="block text-[12px] leading-tight font-semibold text-on-surface break-words">
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

  // Phải đặt SAU toàn bộ hook
  if (!doc) return <Navigate to="/" replace />;

  const words = countWords(doc.text);

  return (
    <div
      className="font-body antialiased h-screen flex overflow-hidden relative isolate selection:bg-tertiary-fixed selection:text-on-tertiary-fixed"
      style={{ backgroundColor: theme.bg, color: theme.fg }}
    >
      {wordDraft && wordDraft.sourceDocumentId === doc.id && <SaveVocabularyDialog draft={wordDraft} onClose={closeWordDialog} />}
      {/* Sidebar thương hiệu và điều hướng (chỉ desktop) */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 h-screen shrink-0 bg-[#FCF8F1] border-r border-[#EDE5DA] px-4 py-6 overflow-hidden">
        <div className="shrink-0">
          <Link to="/" className="flex items-center gap-2 px-2 mb-9 select-none">
            <span className="font-headline text-[25px] font-semibold tracking-tight text-[#17294D]">
              LexiEase
            </span>
            <span className="w-2 h-2 rounded-full bg-[#A18A25]" />
          </Link>
        </div>

        <nav className="flex flex-col gap-2 shrink-0" aria-label="Điều hướng chính">
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.label}
              aria-disabled={!item.active}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-label select-none transition-all duration-200 ${
                item.active
                  ? 'bg-[#E9EDF7] text-[#1556B8] font-semibold shadow-sm'
                  : 'text-[#63718A]/85 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[21px]">{item.icon}</span>
              <span>{item.label}</span>
              {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1556B8]" />}
            </div>
          ))}
          <Link to="/vocabulary" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[#344767] hover:bg-[#E9EDF7]">
            <span className="material-symbols-outlined text-[21px]" aria-hidden>bookmarks</span>
            Từ khó của tôi
          </Link>
        </nav>

        <div className="flex-1 min-h-0 flex flex-col justify-end gap-4 pt-5">
          <div className="flex-1 min-h-[120px] flex items-center justify-center overflow-hidden relative">
            <div className="absolute w-40 h-40 rounded-full bg-[#F2EBDD]/80 blur-2xl" />
            <img
              src={booksIllustration}
              alt="Minh họa sách và chiếc lá của LexiEase"
              className="relative z-10 w-full max-w-[195px] h-[clamp(150px,25vh,220px)] object-contain select-none pointer-events-none"
              draggable={false}
            />
          </div>

          <div className="shrink-0 w-full rounded-[24px] bg-[#F0EEF3] border border-white/80 px-4 py-5 text-center shadow-[0_8px_25px_rgba(47,59,91,0.04)] select-none">
            <span
              className="material-symbols-outlined text-[22px] text-[#596C91]"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              favorite
            </span>
            <p className="text-[13px] font-label font-medium text-[#344767] mt-2 leading-[1.8]">
              Đọc dễ dàng hơn,
              <br />
              tự tin hơn mỗi ngày
            </p>
            <svg viewBox="0 0 90 12" className="w-16 h-3 mx-auto mt-3" fill="none" aria-hidden="true">
              <path d="M2 7 Q12 1 22 7 T42 7 T62 7 T82 7" stroke="#AAB6D0" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Cột phải: header cố định + (vùng đọc cuộn riêng | panel cố định) */}
      <div className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden">
        <header className="w-full bg-[#FAF7F2]/85 backdrop-blur-md px-5 sm:px-6 py-4 flex items-center justify-between gap-4 border-b border-surface-container/60 shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors select-none"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Trở về trang chủ</span>
          </Link>

          <Link to="/vocabulary" className="lg:hidden inline-flex items-center gap-1 text-xs text-primary" aria-label="Từ khó của tôi">
            <span className="material-symbols-outlined" aria-hidden>bookmarks</span>
            <span className="hidden sm:inline">Từ khó của tôi</span>
          </Link>
          {!panelOpen && (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-expanded={panelOpen}
              aria-label="Mở cài đặt hiển thị"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-label font-medium tracking-wide bg-white/75 border border-black/5 hover:bg-white text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">tune</span>
              Cài đặt hiển thị
            </button>
          )}
        </header>

        {/* Mobile/tablet: panel là overlay portal */}
        {panelOpen && createPortal(
          <div className="lg:hidden">
            <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setPanelOpen(false)} />
            <div className="fixed top-0 right-0 h-full z-[70] py-0">{settingsPanel}</div>
          </div>,
          document.body,
        )}

        {/* Hàng chứa vùng đọc (cuộn riêng) + panel desktop (cố định) */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto relative">
            <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center">
              <div className="w-[620px] h-[620px] rounded-full bg-tertiary-fixed/20 blur-[130px] opacity-70" />
            </div>

            <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-6">
              <ManuscriptCard>
                {/* Tiêu đề và thông tin bài */}
                <div className="mb-10 text-center sm:text-left">
                  <div className="inline-block text-tertiary font-label text-xs tracking-[0.25em] uppercase font-semibold mb-3.5 bg-tertiary-fixed/30 px-3 py-1 rounded-full select-none">
                    {SOURCE_LABEL[doc.source]}
                  </div>
                  <h1
                    className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] font-semibold tracking-tight leading-[1.3] mb-5 break-words"
                    style={{ fontFamily: FONT_STACKS[s.fontFamily] }}
                  >
                    {doc.title}
                  </h1>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-[13.5px] font-label select-none">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-tertiary">schedule</span>
                      Khoảng {readingMinutes(doc.text)} phút đọc
                    </span>
                    <span className="opacity-50 font-light">/</span>
                    <span className="opacity-80">{words.toLocaleString('vi-VN')} từ</span>
                    {doc.pageCount ? (
                      <>
                        <span className="opacity-50 font-light">/</span>
                        <span className="opacity-80">{doc.pageCount} trang</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Ghi chú OCR */}
                {doc.ocrUsed && (
                  <p
                    role="note"
                    className="mb-10 px-4 py-3 rounded-lg border border-current/20 text-xs font-label leading-relaxed opacity-90"
                  >
                    Văn bản này được nhận dạng tự động từ hình ảnh nên có thể còn sai sót về chữ hoặc dấu.
                  </p>
                )}

                <div className="mb-10 rounded-2xl bg-[#F3F5FA]/80 p-2 sm:p-2.5">
                  <AudioPlayerCapsule
                    status={speechStatus}
                    reliability={boundaryReliability}
                    voices={voices}
                    selectedVoiceURI={selectedVoiceURI}
                    hasVietnameseVoice={hasVietnameseVoice(voices)}
                    voicesLoading={voicesLoading}
                    rate={rate}
                    errorMessage={speechError}
                    progressLabel={speechStatus === 'speaking' || speechStatus === 'paused'
                      ? `${Math.min(currentSegmentIndex + 1, segments.length)}/${segments.length} đoạn`
                      : undefined}
                    onPlay={startReading}
                    onPause={() => speechRef.current?.pause()}
                    onResume={() => speechRef.current?.resume()}
                    onStop={() => speechRef.current?.stop()}
                    onRateCycle={cycleRate}
                    onVoiceChange={(voiceURI) => {
                      setSelectedVoiceURI(voiceURI);
                      const voice = voices.find((item) => item.voiceURI === voiceURI) ?? null;
                      if (speechStatus === 'speaking' || speechStatus === 'paused') {
                        speechRef.current?.restartFromLastPosition(rate, voice);
                      }
                    }}
                  />
                </div>

                <div className="sticky top-3 z-20 mb-6 rounded-xl border border-current/10 p-3 text-sm shadow-sm" style={{ backgroundColor: theme.bg, color: theme.fg }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p>Bôi chọn từ/cụm từ muốn ôn lại, rồi bấm lưu.</p>
                    <button type="button" onPointerDown={e => e.preventDefault()} onClick={saveSelectedWord}
                      className="rounded-full bg-primary px-4 py-2 text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                      Lưu từ đã chọn
                    </button>
                  </div>
                  {selectionError && <p role="alert" className="mt-2 text-error">{selectionError}</p>}
                </div>
                {/* Nội dung bài đọc: theo cài đặt hiển thị */}
                <div
                  ref={bodyRef}
                  tabIndex={0}
                  aria-label="Nội dung bài đọc"
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
                      <div
                        aria-hidden
                        className="absolute left-0 right-0 top-0 z-10 pointer-events-none"
                        style={{ height: rulerY, backgroundColor: `${theme.bg}B3` }}
                      />
                      <div
                        aria-hidden
                        className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none"
                        style={{ top: rulerY + lh, backgroundColor: `${theme.bg}B3` }}
                      />
                    </>
                  )}

                  <ReadingText
                    segments={segments}
                    activeBoundary={activeBoundary}
                    className="font-body text-on-surface break-words"
                    style={{
                      fontFamily: FONT_STACKS[s.fontFamily],
                      fontSize: `${s.fontSize}px`,
                      lineHeight: s.lineHeight,
                      letterSpacing: `${s.letterSpacing}em`,
                    }}
                  />
                </div>

                <div className="my-16 flex items-center justify-center gap-3 select-none opacity-60">
                  <span className="w-8 h-[1px] bg-current" />
                  <span className="text-xs font-serif text-tertiary">❦</span>
                  <span className="w-8 h-[1px] bg-current" />
                </div>

                <footer className="pt-6 flex items-center justify-center border-t border-current/20">
                  <Link
                    to="/"
                    onClick={clearDocument}
                    className="px-5 py-3 rounded-lg border border-current/30 hover:bg-black/5 flex items-center gap-2.5 transition-all text-xs uppercase tracking-wider font-medium select-none"
                  >
                    <span className="material-symbols-outlined text-[17px]">add</span>
                    <span>Đọc văn bản khác</span>
                  </Link>
                </footer>
              </ManuscriptCard>

              <div className="mt-8 text-center text-xs font-label opacity-50 tracking-wider select-none">
                <span>Bôi chọn từ hoặc cụm từ trong bài, rồi dùng nút “Lưu từ đã chọn” để ôn lại sau.</span>
              </div>
            </div>
          </main>

          {panelOpen && <div className="hidden lg:block shrink-0 h-full py-6 pr-6">{settingsPanel}</div>}
        </div>
      </div>
    </div>
  );
};
