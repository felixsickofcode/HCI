import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, Navigate } from 'react-router-dom';
import { AudioPlayerCapsule, ManuscriptCard, ReadingText } from '../../components/common';
import { useAuth, useDocument } from '../../context';
import {
  useDisplaySettings, THEMES, FONT_STACKS, LIMITS,
} from '../../context/DisplaySettingsProvider';
import { countWords, readingMinutes } from '../../lib/document';
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
import { FixedReadingRuler } from './FixedReadingRuler';
import { OriginalDocumentView } from './OriginalDocumentView';
import { useWordExplanation } from '../../hooks/useWordExplanation';
import { useSaveSelectedWord } from '../../hooks/useSaveSelectedWord';
import { WordExplanationPopover } from '../../components/reading/WordExplanationPopover';
import type { PopoverCloseReason } from '../../components/reading/WordExplanationPopover';
import { summarizeDocument, toSummarySegments } from '../../lib/summary';
import type { SummaryLength, SummarizeResponse } from '../../lib/summary';
import { ApiError } from '../../lib/api';
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
  { icon: 'library_books', label: 'Thư viện', active: false },
  { icon: 'bar_chart', label: 'Thống kê', active: false },
  { icon: 'settings', label: 'Cài đặt', active: false },
] as const;

type Tab = 'Giao diện' | 'Hỗ trợ đọc' | 'Khác';
type ViewMode = 'original' | 'reading';

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
  const { user } = useAuth();
  const { settings: s, update, reset } = useDisplaySettings();
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 1024);
  const [tab, setTab] = useState<Tab>('Giao diện');
  const [viewSelection, setViewSelection] = useState<{ documentId: string; mode: ViewMode } | null>(null);
  const theme = THEMES[s.theme];
  const hasOriginal = Boolean(doc?.originalFile && (doc.source === 'pdf' || doc.source === 'image'));
  const viewMode = viewSelection && viewSelection.documentId === doc?.id
    ? viewSelection.mode
    : 'reading';
  const showSettingsPanel = viewMode === 'reading' && panelOpen;

  const blocks = useMemo(() => doc?.blocks ?? [], [doc?.blocks]);
  const summarySegments = useMemo(
    () => toSummarySegments(blocks),
    [blocks],
  );

  const [summaryResult, setSummaryResult] =
    useState<SummarizeResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryNeedsLogin, setSummaryNeedsLogin] = useState(false);
  const [summaryMethod, setSummaryMethod] = useState<'extractive' | 'llm'>('extractive');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [summaryView, setSummaryView] = useState(false);
  const [selectedSummaryItemId, setSelectedSummaryItemId] = useState<string | null>(null);
  const [summaryNavigationRevision, setSummaryNavigationRevision] = useState(0);
  const [sourcesItemId, setSourcesItemId] = useState<string | null>(null);
  const [pendingSummarySourceId, setPendingSummarySourceId] = useState<string | null>(null);
  const [openSummaryMenuId, setOpenSummaryMenuId] = useState<string | null>(null);
  const [bookmarkedSummaryIds, setBookmarkedSummaryIds] = useState<string[]>([]);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [summaryCopyError, setSummaryCopyError] = useState('');
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<Array<{ id: string; text: string; included: boolean }>>([]);
  const [previewFontSize, setPreviewFontSize] = useState(16);
  const [previewFormat, setPreviewFormat] = useState<'list' | 'prose'>('list');
  const [previewError, setPreviewError] = useState('');

  const summaryControllerRef = useRef<AbortController | null>(null);
  const summarySequenceRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechController | null>(null);
  const [activeBoundary, setActiveBoundary] = useState<SpeechBoundaryEvent | null>(null);
  const summaryMenuRef = useRef<HTMLDivElement>(null);

  const clearSummary = useCallback(() => {
    summarySequenceRef.current += 1;
    summaryControllerRef.current?.abort();
    summaryControllerRef.current = null;
    setSummaryResult(null);
    setSummaryLoading(false);
    setSummaryError('');
    setSummaryNeedsLogin(false);
    setSummaryView(false);
    setSelectedSummaryItemId(null);
    setSourcesItemId(null);
    setOpenSummaryMenuId(null);
    setBookmarkedSummaryIds([]);
    setCopiedSummaryId(null);
    setSummaryCopyError('');
  }, []);

  const generateSummary = useCallback(async () => {
    if (!doc) {
      setSummaryError('Không tìm thấy tài liệu để tóm tắt.');
      return;
    }

    if (!user) {
      setSummaryNeedsLogin(true);
      setSummaryError('Hãy đăng nhập để sử dụng tính năng tóm tắt.');
      return;
    }

    if (summarySegments.length === 0) {
      setSummaryError('Tài liệu không có đoạn văn phù hợp để tóm tắt.');
      return;
    }

    summarySequenceRef.current += 1;
    const sequence = summarySequenceRef.current;
    summaryControllerRef.current?.abort();

    const controller = new AbortController();
    summaryControllerRef.current = controller;

    setSummaryLoading(true);
    setSummaryError('');
    setSummaryNeedsLogin(false);
    setSummaryResult(null);
    setSelectedSummaryItemId(null);
    speechRef.current?.stop();
    setActiveBoundary(null);

    try {
      const response = await summarizeDocument(
        doc.id,
        summarySegments,
        summaryMethod,
        summaryLength,
        controller.signal,
      );

      if (sequence !== summarySequenceRef.current) return;
      if (response.documentId !== doc.id) {
        throw new Error('Kết quả tóm tắt không thuộc tài liệu hiện tại.');
      }

      setSummaryResult(response);
      setSummaryView(true);
      setSourcesItemId(null);
      mainRef.current?.scrollTo({ top: 0 });
    } catch (cause) {
      if (sequence !== summarySequenceRef.current ||
          controller.signal.aborted) return;

      if (cause instanceof ApiError) {
        if (cause.status === 401) {
          setSummaryNeedsLogin(true);
          setSummaryError('Phiên đăng nhập đã hết hạn.');
        } else if (cause.status === 429) {
          setSummaryError('Server đang giới hạn lượt tóm tắt.');
        } else if (cause.status === 413) {
          setSummaryError('Tài liệu quá dài để tóm tắt.');
        } else if (cause.status === 422 || cause.status === 503) {
          setSummaryError(cause.message);
        } else {
          setSummaryError(cause.message);
        }
      } else {
        setSummaryError(
          cause instanceof Error
            ? cause.message
            : 'Không thể tạo tóm tắt lúc này.',
        );
      }
    } finally {
      if (sequence === summarySequenceRef.current) {
        setSummaryLoading(false);
        summaryControllerRef.current = null;
      }
    }
  }, [doc, summarySegments, summaryMethod, summaryLength, user]);

  const selectSummaryLength = (length: SummaryLength) => {
    setSummaryLength(length);
    if (!summaryResult || summaryResult.method !== 'extractive') return;
    const variant = summaryResult.variants?.find((item) => item.length === length);
    if (!variant) return;
    setSummaryResult((current) => current ? { ...current, items: variant.items } : current);
    setSelectedSummaryItemId(null);
    setSummaryNavigationRevision((revision) => revision + 1);
  };

  useEffect(() => {
    queueMicrotask(clearSummary);
  }, [doc?.id, summarySegments, clearSummary]);
  const { selection: wordSelection, result: wordResult, loading: wordLoading,
    error: wordError, needsLogin: wordNeedsLogin, choose: chooseWord, explain: explainWord, clear: clearWord } = useWordExplanation(doc?.id, blocks);
  const wordSave = useSaveSelectedWord(doc, wordSelection, explainWord);
  const toc = useMemo(() => blocks.filter((block) => block.type === 'heading'), [blocks]);
  const segments: ReadingSegment[] = useMemo(
    () =>
      blocks
        .filter((block) => block.text.trim().length > 0)
        .map((block) => ({
          id: block.id,
          text: block.text,
          kind: block.type === 'quote' ? 'quote' : 'paragraph',
        })),
    [blocks],
  );
  const summaryReadingSegments: ReadingSegment[] = useMemo(
    () => (summaryResult?.items ?? []).map((item) => ({
      id: `summary-${item.id}`,
      text: item.text,
      kind: 'paragraph',
    })),
    [summaryResult],
  );
  const sourcePreview = doc?.blocks.find((block) => block.text.trim())?.text ?? doc?.text ?? '';
  const activeReadingSegments = summaryView ? summaryReadingSegments : segments;

  const selectSummaryItem = (itemId: string) => {
    setSelectedSummaryItemId(itemId);
    setSummaryNavigationRevision((revision) => revision + 1);
    setPanelOpen(true);
    setTab('Khác');
    setSummaryView(true);
  };

  const selectSummaryForSourceBlock = (segmentId: string) => {
    if (!summaryResult) return;
    const item = summaryResult.items.find((candidate) => candidate.sources.includes(segmentId));
    if (!item) return;
    setSelectedSummaryItemId(item.id);
    setSummaryNavigationRevision((revision) => revision + 1);
    setPanelOpen(true);
    setTab('Khác');
  };

  const showSummarySource = (segmentId: string) => {
    if (!doc) return;
    setSourcesItemId(null);
    setSummaryView(false);
    setActiveBoundary(null);
    setViewSelection({ documentId: doc.id, mode: 'reading' });
    setPendingSummarySourceId(segmentId);
  };

  useEffect(() => {
    if (summaryView || !pendingSummarySourceId) return;
    speechRef.current?.stop();
    const frame = window.requestAnimationFrame(() => {
      const source = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-segment-id]') ?? [])]
        .find((element) => element.dataset.segmentId === pendingSummarySourceId);
      source?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingSummarySourceId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [doc?.id, pendingSummarySourceId, summaryView]);

  useEffect(() => {
    if (!summaryView || !selectedSummaryItemId) return;
    const frame = window.requestAnimationFrame(() => {
      const targetId = `summary-${selectedSummaryItemId}`;
      const target = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-segment-id]') ?? [])]
        .find((element) => element.dataset.segmentId === targetId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedSummaryItemId, summaryNavigationRevision, summaryView, summaryResult]);

  useEffect(() => {
    if (!openSummaryMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !summaryMenuRef.current?.contains(event.target)) {
        setOpenSummaryMenuId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenSummaryMenuId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openSummaryMenuId]);

  useEffect(() => {
    if (!sourcesItemId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSourcesItemId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sourcesItemId]);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>(() => isSpeechSupported() ? 'idle' : 'unsupported');
  const [boundaryReliability, setBoundaryReliability] = useState<BoundaryReliability>('unknown');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getSpeechVoices());
  const [voicesLoading, setVoicesLoading] = useState(() => isSpeechSupported() && getSpeechVoices().length === 0);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => pickPreferredVoice(getSpeechVoices())?.voiceURI || '');
  const [rate, setRate] = useState<number>(1);
  const [speechError, setSpeechError] = useState('');
  const [readingExcerpt, setReadingExcerpt] = useState(false);

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
    setReadingExcerpt(false);
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({ segments: activeReadingSegments, rate, voice: selectedVoice });
  };
  const readSummaryItem = (itemId: string) => {
    const segment = summaryReadingSegments.find((item) => item.id === `summary-${itemId}`);
    if (!segment || !isSpeechSupported()) return;
    setOpenSummaryMenuId(null);
    setSpeechError('');
    setReadingExcerpt(true);
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({ segments: [segment], rate, voice: selectedVoice });
  };
  const copySummaryItem = async (itemId: string, text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      setCopiedSummaryId(itemId);
      setSummaryCopyError('');
    } catch {
      setSummaryCopyError('Không thể sao chép nội dung trong trình duyệt này.');
      setCopiedSummaryId(null);
    }
    setOpenSummaryMenuId(null);
  };

  const openSummaryPreview = () => {
    if (!summaryResult) return;
    setPreviewItems(summaryResult.items.map((item) => ({ id: item.id, text: item.text, included: true })));
    setPreviewFormat('list');
    setPreviewError('');
    setSummaryPreviewOpen(true);
  };

  const previewText = previewItems
    .filter((item) => item.included && item.text.trim())
    .map((item) => item.text.trim())
    .join(previewFormat === 'list' ? '\n\n' : ' ');

  const copySummaryPreview = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(previewText);
      setPreviewError('');
    } catch {
      setPreviewError('Không thể sao chép nội dung trong trình duyệt này.');
    }
  };

  const downloadSummaryText = () => {
    if (!previewText) return;
    const blob = new Blob([previewText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${(doc?.title || 'tom-tat').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'tom-tat'}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setPreviewError('');
  };

  useEffect(() => {
    if (!summaryPreviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSummaryPreviewOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [summaryPreviewOpen]);
  const readSelection = () => {
    if (!wordSelection || !isSpeechSupported()) return;
    const block = blocks.find((item) => item.id === wordSelection.segmentId);
    if (!block || block.text.slice(wordSelection.start, wordSelection.end) !== wordSelection.selectedText) return;
    setSpeechError('');
    setReadingExcerpt(true);
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({
      segments: [{
        id: block.id, text: wordSelection.selectedText, sourceOffset: wordSelection.start,
        kind: block.type === 'quote' ? 'quote' : 'paragraph',
      }],
      rate, voice: selectedVoice,
    });
    clearWord();
  };
  const cycleRate = () => {
    const nextRate = SPEECH_SPEEDS[(SPEECH_SPEEDS.indexOf(rate as typeof SPEECH_SPEEDS[number]) + 1) % SPEECH_SPEEDS.length];
    setRate(nextRate);
    if (speechStatus === 'speaking' || speechStatus === 'paused') {
      speechRef.current?.restartFromLastPosition(nextRate, selectedVoice);
    }
  };

  // ----- Thước đọc bám dòng -----
  const closeWord = useCallback((reason: PopoverCloseReason = 'restore-focus') => {
    if (reason === 'restore-focus' && wordSelection) {
      const segment = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-segment-id]') ?? [])]
        .find((element) => element.dataset.segmentId === wordSelection.segmentId);
      const token = [...(segment?.querySelectorAll<HTMLElement>('[data-token-start]') ?? [])]
        .find((element) => Number(element.dataset.tokenEnd) > wordSelection.start);
      token?.focus();
    }
    clearWord();
  }, [clearWord, wordSelection]);
  useEffect(() => { clearWord(); }, [user?.id, clearWord]);
  useEffect(() => {
    const main = mainRef.current;
    main?.addEventListener('scroll', clearWord);
    return () => main?.removeEventListener('scroll', clearWord);
  }, [clearWord]);
  const rulerEnabled = s.focus.enabled && viewMode === 'reading'
    && blocks.some((block) => ['paragraph', 'heading', 'quote', 'listItem'].includes(block.type) && block.text.trim());

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
              type="button" role="switch" aria-label="Thước đọc cố định" aria-checked={s.focus.enabled} data-ruler-switch
              onClick={() => update({ focus: { enabled: !s.focus.enabled } })}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-black/10 hover:border-black/20 text-left"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">view_day</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-on-surface">Thước đọc cố định</span>
                <span className="block text-[11px] text-on-surface-variant mt-0.5">Dùng phím ↑/↓, lăn chuột hoặc vuốt trên văn bản để chuyển từng dòng.</span>
              </span>
              <span className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${s.focus.enabled ? 'bg-primary' : 'bg-black/15'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.focus.enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            {s.focus.enabled && (
              <fieldset className="space-y-2" data-ruler-control>
                <legend className="text-sm font-medium">Số dòng trong thước</legend>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((count) => (
                    <button key={count} type="button" aria-pressed={s.focus.lineCount === count}
                      onClick={() => update({ focus: { lineCount: count } })}
                      className="flex-1 rounded-lg border border-black/15 py-2 text-sm aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:font-semibold"
                    >
                      {count} dòng
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </section>
        )}

        {tab === 'Khác' && (
          <section className="space-y-3" aria-live="polite">
            <div>
              <h3 className="text-xs font-label font-bold uppercase tracking-wide text-on-surface-variant">
                Tóm tắt tài liệu
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
                Chọn cách rút ý chính từ các đoạn văn hiện tại.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Phương pháp tóm tắt">
              <button
                type="button"
                role="radio"
                aria-checked={summaryMethod === 'extractive'}
                onClick={() => { setSummaryMethod('extractive'); clearSummary(); }}
                disabled={summaryLoading}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs ${summaryMethod === 'extractive'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-black/[0.08] text-on-surface-variant'}`}
              >
                <span className="block font-semibold">Đọc ý chính</span>
                <span className="mt-0.5 block">Rút gọn đoạn văn thừa</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={summaryMethod === 'llm'}
                onClick={() => { setSummaryMethod('llm'); clearSummary(); }}
                disabled={summaryLoading}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs ${summaryMethod === 'llm'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-black/[0.08] text-on-surface-variant'}`}
              >
                <span className="block font-semibold">AI tóm tắt</span>
                <span className="mt-0.5 block">Hỗ trợ diễn đạt mạch lạc</span>
              </button>
            </div>

            {summaryNeedsLogin ? (
              <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                <p className="text-sm">Tính năng tóm tắt yêu cầu đăng nhập.</p>
                <Link
                  to="/login"
                  state={{ from: '/reading' }}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-on-primary"
                >
                  Đăng nhập
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={generateSummary}
                disabled={summaryLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-on-primary disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {summaryLoading ? 'progress_activity' : 'summarize'}
                </span>
                {summaryLoading
                  ? 'Đang tóm tắt…'
                  : summaryResult
                    ? 'Tạo lại tóm tắt'
                    : 'Tạo tóm tắt'}
              </button>
            )}

            {summaryError && !summaryNeedsLogin && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                {summaryError}
              </div>
            )}

            {summaryResult?.method === 'extractive' && summaryResult.variants?.length ? (
              <fieldset className="space-y-2 rounded-xl border border-black/10 bg-white/60 p-3">
                <legend className="px-1 text-xs font-semibold text-on-surface">Độ dài tóm tắt</legend>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Độ dài tóm tắt">
                  {([
                    ['short', 'Ngắn'], ['medium', 'Vừa'], ['long', 'Dài'],
                  ] as const).map(([length, label]) => (
                    <button key={length} type="button" role="radio" aria-checked={summaryLength === length}
                      onClick={() => selectSummaryLength(length)}
                      className={`rounded-lg border px-2 py-2 text-sm ${summaryLength === length ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-black/15'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {summaryResult && !summaryView && (
              <button
                type="button"
                onClick={() => { setSummaryView(true); mainRef.current?.scrollTo({ top: 0 }); }}
                className="w-full rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-left text-sm font-medium text-primary hover:bg-primary/10"
              >
                Mở bản tóm tắt đã tạo
              </button>
            )}
            {summaryResult && (
              <div className="space-y-2 rounded-xl border border-black/10 bg-white/60 p-3">
                <p className="text-xs font-semibold text-on-surface">Đi tới ý tóm tắt</p>
                <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto" role="group" aria-label="Chọn block tóm tắt">
                  {summaryResult.items.map((item, index) => {
                    const selected = selectedSummaryItemId === item.id;
                    const bookmarked = bookmarkedSummaryIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={`Đi tới ý ${index + 1}`}
                        aria-pressed={selected}
                        onClick={() => selectSummaryItem(item.id)}
                        className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors ${selected ? 'border-primary bg-primary text-on-primary ring-2 ring-primary/30' : bookmarked ? 'border-red-400 bg-red-100 text-red-900' : 'border-black/15 bg-white hover:border-primary/40 hover:bg-primary/5'}`}
                      >
                        {bookmarked && <span className="material-symbols-outlined text-sm" aria-hidden="true">flag</span>}
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {summaryResult && (
              <button type="button" onClick={openSummaryPreview}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-3 text-sm font-medium text-primary hover:bg-primary/10">
                <span className="material-symbols-outlined text-[18px]">preview</span>
                Xem bản tóm tắt hoàn chỉnh
              </button>
            )}
          </section>
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

          <div className="flex items-center gap-2">
            {summaryResult && !summaryView && viewMode === 'reading' && (
              <button
                type="button"
                onClick={() => { setSummaryView(true); mainRef.current?.scrollTo({ top: 0 }); }}
                className="inline-flex items-center gap-1 rounded-xl border border-primary/20 bg-white/75 px-3 py-2 text-xs font-medium text-primary hover:bg-white"
              >
                <span className="material-symbols-outlined text-[17px]">summarize</span>
                <span className="hidden sm:inline">Quay lại tóm tắt</span>
              </button>
            )}
            <Link to="/vocabulary" className="lg:hidden inline-flex items-center gap-1 text-xs text-primary" aria-label="Từ khó của tôi">
              <span className="material-symbols-outlined" aria-hidden>bookmarks</span>
              <span className="hidden sm:inline">Từ khó của tôi</span>
            </Link>
            {hasOriginal && (
              <div className="flex rounded-xl border border-black/10 bg-white/75 p-1 text-xs font-label" role="group" aria-label="Chế độ xem tài liệu">
                <button
                  type="button"
                  aria-pressed={viewMode === 'original'}
                  onClick={() => {
                    speechRef.current?.stop();
                    setActiveBoundary(null);
                    clearWord();
                    setViewSelection({ documentId: doc.id, mode: 'original' });
                  }}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${viewMode === 'original' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-black/5'}`}
                >
                  Bản gốc
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'reading'}
                  onClick={() => setViewSelection({ documentId: doc.id, mode: 'reading' })}
                  className={`rounded-lg px-2.5 py-1.5 transition-colors ${viewMode === 'reading' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-black/5'}`}
                >
                  Trang đọc
                </button>
              </div>
            )}
            {viewMode === 'reading' && !panelOpen && (
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                aria-expanded={panelOpen}
                aria-label="Mở cài đặt hiển thị"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-label font-medium tracking-wide bg-white/75 border border-black/5 hover:bg-white text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">tune</span>
                <span className="hidden sm:inline">Cài đặt hiển thị</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile/tablet: panel là overlay portal */}
        {showSettingsPanel && createPortal(
          <div className="lg:hidden">
            <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setPanelOpen(false)} />
            <div className="fixed top-0 right-0 h-full z-[70] py-0">{settingsPanel}</div>
          </div>,
          document.body,
        )}

        {/* Hàng chứa vùng đọc (cuộn riêng) + panel desktop (cố định) */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className="relative min-w-0 flex-1">
          <main ref={mainRef} className="relative h-full overflow-y-auto" style={rulerEnabled ? { containerType: 'size', overflowAnchor: 'none' } : undefined}>
            <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center">
              <div className="w-[620px] h-[620px] rounded-full bg-tertiary-fixed/20 blur-[130px] opacity-70" />
            </div>

            {viewMode === 'original' && doc.originalFile ? (
              <OriginalDocumentView
                key={doc.id}
                file={doc.originalFile}
                source={doc.source === 'image' ? 'image' : 'pdf'}
              />
            ) : (
            <div className="flex flex-col items-center px-4 sm:px-6 lg:px-8 py-6">
              <ManuscriptCard>
                <div
                  className="mx-auto"
                  style={{
                    width: `${s.columnWidth}ch`,
                    maxWidth: '100%',
                    fontFamily: FONT_STACKS[s.fontFamily],
                    fontSize: `${s.fontSize}px`,
                  }}
                >
                {summaryView && summaryResult ? (
                  <section aria-label="Tóm tắt tài liệu" className="relative">
                    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <button
                          type="button"
                          onClick={() => { speechRef.current?.stop(); setActiveBoundary(null); setSummaryView(false); setSourcesItemId(null); }}
                          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm font-medium hover:bg-black/5"
                        >
                          <span className="material-symbols-outlined text-base">arrow_back</span>
                          Quay lại tài liệu
                        </button>
                        <div className="text-tertiary font-label text-xs tracking-[0.2em] uppercase font-semibold bg-tertiary-fixed/30 px-3 py-1 rounded-full w-fit">
                          {summaryResult.method === 'llm' ? 'Tóm tắt bằng AI' : 'Đọc ý chính'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { speechRef.current?.stop(); setActiveBoundary(null); setSummaryView(false); setSourcesItemId(null); mainRef.current?.scrollTo({ top: 0 }); }}
                        className="flex max-w-[min(100%,16rem)] items-center gap-3 rounded-xl border border-current/15 bg-white/65 p-2 text-left shadow-sm hover:bg-white"
                        aria-label="Thu nhỏ tài liệu gốc; bấm để quay lại"
                      >
                        <span aria-hidden="true" className="h-16 w-12 shrink-0 overflow-hidden rounded-md border border-current/15 bg-white p-1.5 text-[4px] leading-[1.45] opacity-70">
                          <span className="mb-1 block h-1 w-6 rounded bg-primary/60" />
                          {sourcePreview.slice(0, 240)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[10px] font-label uppercase tracking-wider text-on-surface-variant">Tài liệu gốc</span>
                          <span className="block truncate text-xs font-medium">{doc.title}</span>
                          <span className="block text-[10px] text-primary">Bấm để quay lại</span>
                        </span>
                      </button>
                    </div>

                    <h1 className="mb-4 break-words font-headline text-3xl font-semibold tracking-tight sm:text-4xl" style={{ fontFamily: FONT_STACKS[s.fontFamily] }}>
                      {doc.title}
                    </h1>
                    <p className="mb-10 text-sm text-on-surface-variant">
                      {summaryResult.items.length} ý chính · {countWords(summaryResult.items.map((item) => item.text).join(' ')).toLocaleString('vi-VN')} từ
                    </p>

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
                          ? readingExcerpt ? 'Ý riêng' : `${Math.min(currentSegmentIndex + 1, activeReadingSegments.length)}/${activeReadingSegments.length} ý`
                          : undefined}
                        onPlay={startReading}
                        onPause={() => speechRef.current?.pause()}
                        onResume={() => speechRef.current?.resume()}
                        onStop={() => speechRef.current?.stop()}
                        onRateCycle={cycleRate}
                        onVoiceChange={(voiceURI) => {
                          setSelectedVoiceURI(voiceURI);
                          const voice = voices.find((entry) => entry.voiceURI === voiceURI) ?? null;
                          if (speechStatus === 'speaking' || speechStatus === 'paused') {
                            speechRef.current?.restartFromLastPosition(rate, voice);
                          }
                        }}
                      />
                    </div>

                    <div
                      ref={bodyRef}
                      className="reading-body relative w-full text-left"
                      style={{ fontFamily: FONT_STACKS[s.fontFamily], fontSize: `${s.fontSize}px`, lineHeight: s.lineHeight, letterSpacing: `${s.letterSpacing}em`, backgroundColor: theme.bg, color: theme.fg }}
                    >
                      <div className="space-y-5 font-body break-words" role="list" aria-label="Các ý tóm tắt">
                        {summaryResult.items.map((item) => {
                          let offset = 0;
                          const segmentId = `summary-${item.id}`;
                          const isBookmarked = bookmarkedSummaryIds.includes(item.id);
                          const isSelected = selectedSummaryItemId === item.id;
                          const tokens = item.text.split(/(\s+)/).filter(Boolean).map((token, tokenIndex) => {
                            const start = offset;
                            offset += token.length;
                            if (/^\s+$/.test(token)) return <span key={tokenIndex}>{token}</span>;
                            const active = activeBoundary?.segmentId === segmentId
                              && start < activeBoundary.charIndex + activeBoundary.charLength
                              && offset > activeBoundary.charIndex;
                            return (
                              <span
                                key={tokenIndex}
                                data-token-start={start}
                                data-token-end={offset}
                                aria-current={active ? 'true' : undefined}
                                className={active ? 'rounded-sm bg-tertiary-fixed text-on-tertiary-fixed outline outline-1 outline-tertiary' : undefined}
                              >
                                {token}
                              </span>
                            );
                          });
                          return (
                            <article
                              key={item.id}
                              role="listitem"
                              data-segment-id={segmentId}
                              data-segment-text={item.text}
                              data-block-type="paragraph"
                              aria-current={isSelected ? 'location' : undefined}
                              tabIndex={0}
                              onClick={() => selectSummaryItem(item.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  selectSummaryItem(item.id);
                                }
                              }}
                              className={`relative cursor-pointer rounded-xl border p-4 pr-14 transition-colors ${isSelected ? 'border-primary/50 bg-primary/[0.08] text-on-surface ring-2 ring-primary/30' : isBookmarked ? 'border-red-400 bg-red-100/70 text-red-950 ring-2 ring-red-300' : 'border-current/20'}`}
                            >
                              {isBookmarked && <span className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${isSelected ? 'bg-primary/10 text-primary' : 'bg-red-100 text-red-800'}`}><span className="material-symbols-outlined text-sm" aria-hidden="true">flag</span>Đã đánh dấu để xem lại</span>}
                              <p className="whitespace-pre-line">{tokens}</p>
                              {copiedSummaryId === item.id && <span role="status" className="mt-3 block text-xs text-primary">Đã sao chép ý này.</span>}
                              <div ref={openSummaryMenuId === item.id ? summaryMenuRef : undefined} className="absolute right-2 top-2">
                                <button
                                  type="button"
                                  aria-label="Tùy chọn ý tóm tắt"
                                  aria-haspopup="menu"
                                  aria-expanded={openSummaryMenuId === item.id}
                                  onClick={() => setOpenSummaryMenuId((current) => current === item.id ? null : item.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-black/5"
                                >
                                  <span className="material-symbols-outlined">more_horiz</span>
                                </button>
                                {openSummaryMenuId === item.id && (
                                  <div role="menu" aria-label="Tùy chọn ý tóm tắt" className="absolute right-0 top-10 z-30 w-52 rounded-xl border border-black/10 bg-white p-1.5 text-sm text-[#17294D] shadow-xl">
                                    <button role="menuitem" type="button" disabled={!isSpeechSupported()} onClick={() => readSummaryItem(item.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 disabled:opacity-50"><span className="material-symbols-outlined text-base">volume_up</span>Đọc ý này</button>
                                    <button role="menuitem" type="button" onClick={() => void copySummaryItem(item.id, item.text)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5"><span className="material-symbols-outlined text-base">content_copy</span>Sao chép ý</button>
                                    <button role="menuitem" type="button" onClick={() => { setBookmarkedSummaryIds((current) => isBookmarked ? current.filter((id) => id !== item.id) : [...current, item.id]); setOpenSummaryMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5"><span className="material-symbols-outlined text-base">{isBookmarked ? 'bookmark_remove' : 'bookmark_add'}</span>{isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu để xem lại'}</button>
                                    <button role="menuitem" type="button" onClick={() => { setSourcesItemId(item.id); setOpenSummaryMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5"><span className="material-symbols-outlined text-base">format_list_bulleted</span>Xem nguồn ({item.sources.length})</button>
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      {summaryCopyError && <p role="alert" className="mt-3 text-sm text-red-700">{summaryCopyError}</p>}
                    </div>

                    {sourcesItemId && (() => {
                      const item = summaryResult.items.find((candidate) => candidate.id === sourcesItemId);
                      if (!item) return null;
                      return createPortal(
                        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSourcesItemId(null); }}>
                          <section role="dialog" aria-modal="true" aria-labelledby="summary-sources-title" className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-[#FFFDF8] p-5 text-on-surface shadow-2xl sm:max-w-2xl sm:p-6">
                            <header className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
                              <div>
                                <h2 id="summary-sources-title" className="font-headline text-lg font-semibold">Nguồn hỗ trợ ý này</h2>
                                <p className="mt-2 text-sm text-on-surface-variant">{item.text}</p>
                              </div>
                              <button type="button" aria-label="Đóng nguồn" onClick={() => setSourcesItemId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 hover:bg-black/5">
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </header>
                            <div className="mt-4 space-y-3">
                              {item.sources.map((sourceId, index) => {
                                const sourceBlock = blocks.find((block) => block.id === sourceId);
                                return (
                                  <details key={sourceId} open className="overflow-hidden rounded-xl border border-current/15 bg-white/70">
                                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Đoạn nguồn {index + 1}</summary>
                                    <blockquote className="mx-4 mb-3 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-on-surface-variant whitespace-pre-line">
                                      {sourceBlock?.text ?? 'Không tìm thấy đoạn nguồn trong tài liệu hiện tại.'}
                                    </blockquote>
                                    {sourceBlock && <div className="px-4 pb-3 text-right"><button type="button" onClick={() => showSummarySource(sourceId)} className="rounded-lg border border-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5">Đi tới đoạn trong tài liệu</button></div>}
                                  </details>
                                );
                              })}
                            </div>
                          </section>
                        </div>,
                        document.body,
                      );
                    })()}
                    {summaryPreviewOpen && createPortal(
                      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-3 sm:p-6"
                        onMouseDown={(event) => { if (event.target === event.currentTarget) setSummaryPreviewOpen(false); }}>
                        <section role="dialog" aria-modal="true" aria-labelledby="summary-preview-title"
                          className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#FFFDF8] text-[#17294D] shadow-2xl">
                          <header className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 sm:px-6">
                            <div>
                              <h2 id="summary-preview-title" className="font-headline text-xl font-semibold">Bản tóm tắt hoàn chỉnh</h2>
                              <p className="mt-1 text-sm text-on-surface-variant">Chọn ý cần giữ, chỉnh nội dung và xem trước định dạng xuất.</p>
                            </div>
                            <button type="button" aria-label="Đóng bản xem trước" onClick={() => setSummaryPreviewOpen(false)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-black/5">
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </header>
                          <div className="flex flex-wrap items-end gap-3 border-b border-black/10 bg-black/[0.02] px-5 py-3 sm:px-6">
                            <label className="flex flex-col gap-1 text-xs font-medium">
                              Cách trình bày
                              <select value={previewFormat} onChange={(event) => setPreviewFormat(event.target.value as 'list' | 'prose')}
                                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
                                <option value="list">Mỗi ý một đoạn</option>
                                <option value="prose">Nối thành văn bản liền</option>
                              </select>
                            </label>
                            <label className="flex min-w-36 flex-col gap-1 text-xs font-medium">
                              Cỡ chữ xem trước: {previewFontSize}px
                              <input type="range" min="14" max="24" step="1" value={previewFontSize}
                                onChange={(event) => setPreviewFontSize(Number(event.target.value))} />
                            </label>
                            <p className="ml-auto text-xs text-on-surface-variant">{previewItems.filter((item) => item.included).length}/{previewItems.length} ý được chọn</p>
                          </div>
                          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6" style={{ fontSize: `${previewFontSize}px` }}>
                            {previewItems.length === 0 ? (
                              <p className="text-sm text-on-surface-variant">Không có ý tóm tắt để xem trước.</p>
                            ) : previewFormat === 'list' ? (
                              <ol className="space-y-3">
                                {previewItems.map((item, index) => (
                                  <li key={item.id} className={`rounded-xl border p-3 ${item.included ? 'border-black/10 bg-white' : 'border-black/5 bg-black/[0.03] opacity-60'}`}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <label className="flex items-center gap-2 text-xs font-medium">
                                        <input type="checkbox" checked={item.included}
                                          onChange={(event) => setPreviewItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, included: event.target.checked } : entry))} />
                                        Giữ ý {index + 1}
                                      </label>
                                      <div className="flex gap-1">
                                        <button type="button" aria-label={`Chuyển ý ${index + 1} lên`} disabled={index === 0}
                                          onClick={() => setPreviewItems((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}
                                          className="rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-30">↑</button>
                                        <button type="button" aria-label={`Chuyển ý ${index + 1} xuống`} disabled={index === previewItems.length - 1}
                                          onClick={() => setPreviewItems((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}
                                          className="rounded px-2 py-1 text-sm hover:bg-black/5 disabled:opacity-30">↓</button>
                                      </div>
                                    </div>
                                    <textarea aria-label={`Nội dung ý ${index + 1}`} value={item.text}
                                      onChange={(event) => setPreviewItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry))}
                                      rows={Math.max(2, Math.min(6, Math.ceil(item.text.length / 100)))}
                                      className="w-full resize-y rounded-lg border border-black/10 bg-[#FFFDF8] px-3 py-2 leading-relaxed focus:border-primary focus:outline-none" />
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <div className="space-y-3">
                                {previewItems.map((item, index) => item.included && item.text.trim() ? (
                                  <label key={item.id} className="block">
                                    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                                      <input type="checkbox" checked onChange={() => setPreviewItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, included: false } : entry))} />
                                      Ý {index + 1}
                                    </span>
                                    <textarea aria-label={`Nội dung ý ${index + 1}`} value={item.text}
                                      onChange={(event) => setPreviewItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, text: event.target.value } : entry))}
                                      rows={Math.max(2, Math.min(6, Math.ceil(item.text.length / 100)))}
                                      className="w-full resize-y rounded-lg border border-black/10 bg-white px-3 py-2 leading-relaxed focus:border-primary focus:outline-none" />
                                  </label>
                                ) : null)}
                              </div>
                            )}
                            {previewError && <p role="alert" className="mt-4 text-sm text-red-700">{previewError}</p>}
                          </div>
                          <footer className="flex flex-wrap justify-end gap-2 border-t border-black/10 px-5 py-4 sm:px-6">
                            <button type="button" onClick={() => setSummaryPreviewOpen(false)} className="rounded-lg border border-black/15 px-4 py-2 text-sm">Đóng</button>
                            <button type="button" onClick={() => void copySummaryPreview()} disabled={!previewText}
                              className="rounded-lg border border-primary/25 px-4 py-2 text-sm font-medium text-primary disabled:opacity-40">Sao chép</button>
                            <button type="button" onClick={downloadSummaryText} disabled={!previewText}
                              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-40">Tải .txt</button>
                          </footer>
                        </section>
                      </div>, document.body,
                    )}
                  </section>
                ) : (
                <>
                <div style={rulerEnabled ? { minHeight: '30cqh' } : undefined}>
                {/* Tiêu đề và thông tin bài */}
                <div className="mb-10 text-left">
                  <div className="inline-block text-tertiary font-label text-xs tracking-[0.25em] uppercase font-semibold mb-3.5 bg-tertiary-fixed/30 px-3 py-1 rounded-full select-none">
                    {SOURCE_LABEL[doc.source]}
                  </div>
                  <h1
                    className="font-headline text-3xl sm:text-4xl md:text-[2.65rem] font-semibold tracking-tight leading-[1.3] mb-5 break-words"
                    style={{ fontFamily: FONT_STACKS[s.fontFamily] }}
                  >
                    {doc.title}
                  </h1>

                  <div className="flex flex-wrap items-center justify-start gap-x-5 gap-y-2 text-[13.5px] font-label select-none">
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

                {doc.warnings.length > 0 && (
                  <div
                    role="alert"
                    className="mb-10 px-4 py-3 rounded-lg border border-error/40 text-xs font-label leading-relaxed"
                  >
                    {doc.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
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
                      ? readingExcerpt ? 'Phần đã chọn' : `${Math.min(currentSegmentIndex + 1, activeReadingSegments.length)}/${activeReadingSegments.length} đoạn`
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

                {toc.length > 0 && (
                  <nav aria-label="Mục lục tài liệu" className="mb-10 rounded-xl border border-current/15 p-5">
                    <h2 className="mb-3 font-label text-sm font-semibold">Mục lục</h2>
                    <ol className="space-y-2 font-label text-sm">
                      {toc.map((heading) => (
                        <li key={heading.id} className={heading.headingLevel === 3 ? 'pl-5' : ''}>
                          <a href={`#reader-${heading.id}`} className="hover:underline focus-visible:underline">
                            {heading.text}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                )}

                {/* Nội dung bài đọc: theo cài đặt hiển thị */}
                <p className="mb-3 text-xs font-label text-on-surface-variant">
                  Bôi chọn nội dung trong một đoạn để nghe phần đó. Chọn từ hoặc cụm từ để giải nghĩa hoặc lưu từ. Bàn phím: Tab tới đoạn, Enter vào từ, dùng ←/→ rồi Enter để chọn.
                </p>
                </div>
                <div
                  ref={bodyRef}
                  className="reading-body text-left relative w-full"
                  style={{
                    fontFamily: FONT_STACKS[s.fontFamily],
                    fontSize: `${s.fontSize}px`,
                    lineHeight: s.lineHeight,
                    letterSpacing: `${s.letterSpacing}em`,
                    backgroundColor: theme.bg,
                    color: theme.fg,
                  }}
                >
                  <ReadingText
                    blocks={blocks}
                    activeBoundary={activeBoundary}
                    onWordSelection={chooseWord}
                    onSegmentClick={selectSummaryForSourceBlock}
                    className="font-body break-words"
                    style={{
                      fontFamily: FONT_STACKS[s.fontFamily],
                      fontSize: `${s.fontSize}px`,
                      lineHeight: s.lineHeight,
                      letterSpacing: `${s.letterSpacing}em`,
                    }}
                  />
                  {wordSelection && <WordExplanationPopover
                    selection={wordSelection}
                    result={wordResult}
                    loading={wordLoading}
                    error={wordError}
                    needsLogin={wordNeedsLogin}
                    signedIn={wordSave.signedIn}
                    saveStatus={wordSave.status}
                    saveError={wordSave.error}
                    onExplain={explainWord}
                    onSave={wordSave.save}
                    onRead={readSelection}
                    speechSupported={isSpeechSupported()}
                    onClose={closeWord}
                  />}
                </div>

                <div style={rulerEnabled ? { minHeight: '70cqh' } : undefined}>
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
                </div>
                </>
                )}
                </div>
              </ManuscriptCard>

              <div className="mt-8 text-center text-xs font-label opacity-50 tracking-wider select-none">
                <span>Nhấp chuột phải bất kỳ nơi nào trên văn bản để mở thực đơn hỗ trợ nếu cần</span>
              </div>
            </div>
            )}
          </main>
          {rulerEnabled && (
            <FixedReadingRuler key={`${doc.id}-${summaryView ? 'summary' : 'document'}`} mainRef={mainRef} bodyRef={bodyRef}
              lineCount={s.focus.lineCount} background={theme.bg} opacity={s.focus.dimOpacity}
            />
          )}
          </div>

          {showSettingsPanel && <div className="hidden lg:block shrink-0 h-full py-6 pr-6">{settingsPanel}</div>}
        </div>
      </div>
    </div>
  );
};
