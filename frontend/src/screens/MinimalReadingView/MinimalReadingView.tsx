import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useReadingAnchor } from './useReadingAnchor';
import './reader-layout.css';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { AudioPlayerCapsule, ManuscriptCard, ReadingText } from '../../components/common';
import type { StaticHighlight } from '../../components/common';
import { useAuth, useDocument } from '../../context';
import {
  useDisplaySettings, THEMES, FONT_STACKS, LIMITS,
} from '../../context/DisplaySettingsProvider';
import { countWords, readingMinutes } from '../../lib/document';
import type { DocumentSource } from '../../lib/document';
import type { FontFamily, ThemeName } from '../../lib/api';
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
import { SummaryPreviewDialog, SummarySourcesDialog } from './SummaryModals';
import { useWordExplanation } from '../../hooks/useWordExplanation';
import { useSaveSelectedWord } from '../../hooks/useSaveSelectedWord';
import { useDocumentSummary } from '../../hooks/useDocumentSummary';
import type { SummaryItem } from '../../lib/summary';
import { WordExplanationPopover } from '../../components/reading/WordExplanationPopover';
import type { PopoverCloseReason } from '../../components/reading/WordExplanationPopover';

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
  { to: '/', icon: 'M2 11 12 3l10 8 M5 9v12h14V9', label: 'Trang chủ' },
  { to: '/reading', icon: 'M12 6Q7 3 2 5v14q5-2 10 1 5-3 10-1V5q-5-2-10 1v14', label: 'Đọc tài liệu' },
  { to: '/vocabulary', icon: 'M6 3h14v14H6z M3 7v14h13 M9 7h8 M9 11h5', label: 'Thư viện từ khó' },
] as const;

const MIRROR_CLASS: Record<string, string> = {
  b: 'reader-mirror-b',
  B: 'reader-mirror-b',
  d: 'reader-mirror-d',
  D: 'reader-mirror-d',
  p: 'reader-mirror-p',
  P: 'reader-mirror-p',
  q: 'reader-mirror-q',
  Q: 'reader-mirror-q',
};

function renderMirrorText(text: string, mirrorLetters: boolean): React.ReactNode {
  if (!mirrorLetters || !/[bBdDpPqQ]/.test(text)) return text;
  const nodes: React.ReactNode[] = [];
  let plain = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const cls = MIRROR_CLASS[ch];
    if (cls) {
      if (plain) {
        nodes.push(plain);
        plain = '';
      }
      nodes.push(<span key={i} className={cls}>{ch}</span>);
    } else {
      plain += ch;
    }
  }
  if (plain) nodes.push(plain);
  return nodes;
}

function SidebarIcon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" className="shrink-0"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const overlayQuery = '(max-width: 767px)';
const isOverlay = () => window.matchMedia(overlayQuery).matches;
function subscribeOverlay(listener: () => void) {
  const query = window.matchMedia(overlayQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

type Tab = 'Giao diện' | 'Hỗ trợ đọc' | 'Tóm tắt';
type ViewMode = 'original' | 'reading';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'Giao diện', label: 'Giao diện', icon: 'desktop_windows' },
  { key: 'Hỗ trợ đọc', label: 'Hỗ trợ đọc', icon: 'volume_up' },
  { key: 'Tóm tắt', label: 'Tóm tắt', icon: 'summarize' },
];

const Slider = (p: {
  label: string; value: number; min: number; max: number; step: number; unit?: string;
  accent?: string; secondaryText?: string; fg?: string;
  onChange: (v: number) => void;
}) => (
  <label className="block">
    <span className="flex justify-between mb-1.5 text-xs font-label" style={{ color: p.secondaryText }}>
      <span>{p.label}</span>
      <span className="font-semibold" style={{ color: p.fg }}>{p.value}{p.unit}</span>
    </span>
    <input
      type="range"
      className="w-full"
      style={{ accentColor: p.accent }}
      min={p.min}
      max={p.max}
      step={p.step}
      value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))}
    />
  </label>
);

export const MinimalReadingView: React.FC = () => {
  const { document: doc, clearDocument } = useDocument();
  const { user } = useAuth();
  const { settings: s, assist, update, updateAssist, reset } = useDisplaySettings();
  const [panelOpen, setPanelOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const narrow = useSyncExternalStore(subscribeOverlay, isOverlay);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const focusAfterToggle = useRef(false);
  const [tab, setTab] = useState<Tab>('Giao diện');
  const [viewSelection, setViewSelection] = useState<{ documentId: string; mode: ViewMode } | null>(null);
  const theme = THEMES[s.theme];
  const hasOriginal = Boolean(doc?.originalFile && (doc.source === 'pdf' || doc.source === 'image'));
  const viewMode = viewSelection && viewSelection.documentId === doc?.id
    ? viewSelection.mode
    : 'reading';
  const showSettingsPanel = viewMode === 'reading' && panelOpen;

  const blocks = useMemo(() => doc?.blocks ?? [], [doc?.blocks]);
  const { selection: wordSelection, result: wordResult, loading: wordLoading,
    error: wordError, needsLogin: wordNeedsLogin, choose: chooseWord, explain: explainWord, clear: clearWord } = useWordExplanation(doc?.id, blocks);
  const wordSave = useSaveSelectedWord(doc, wordSelection, explainWord);

  // FR-08 Tóm tắt hợp nhất: hỗ trợ cả extractive/llm, độ dài ngắn/vừa/dài,
  // chế độ xem tóm tắt riêng, bookmark/copy/nguồn/xuất, tô sáng câu gốc & Nghe ý chính.
  const summary = useDocumentSummary(doc?.id, blocks, user?.id);
  const [summaryView, setSummaryView] = useState(false);
  const [summaryNavigationRevision, setSummaryNavigationRevision] = useState(0);
  const [sourcesItemId, setSourcesItemId] = useState<string | null>(null);
  const [pendingSummarySourceId, setPendingSummarySourceId] = useState<string | null>(null);
  const [openSummaryMenuId, setOpenSummaryMenuId] = useState<string | null>(null);
  const [bookmarkedSummaryIds, setBookmarkedSummaryIds] = useState<string[]>([]);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [summaryCopyError, setSummaryCopyError] = useState('');
  const [summaryPreviewOpen, setSummaryPreviewOpen] = useState(false);
  const summaryMenuRef = useRef<HTMLDivElement>(null);

  const resetSummaryUi = useCallback(() => {
    setSummaryView(false);
    setSourcesItemId(null);
    setPendingSummarySourceId(null);
    setOpenSummaryMenuId(null);
    setBookmarkedSummaryIds([]);
    setCopiedSummaryId(null);
    setSummaryCopyError('');
    setSummaryPreviewOpen(false);
  }, []);

  useEffect(() => resetSummaryUi, [doc?.id, user?.id, resetSummaryUi]);

  const activeSummaryItem = useMemo(
    () => summary.result?.items.find((item) => item.id === summary.activeItemId) ?? null,
    [summary.activeItemId, summary.result],
  );
  const summaryHighlights = useMemo<Record<string, StaticHighlight[]>>(() => {
    if (!activeSummaryItem) return {};
    const map: Record<string, StaticHighlight[]> = {};
    for (const sourceId of activeSummaryItem.sources) {
      map[sourceId] = [{ phrase: activeSummaryItem.text, className: 'reader-summary-sentence' }];
    }
    return map;
  }, [activeSummaryItem]);
  const segmentOrder = useMemo(() => {
    const order = new Map<string, number>();
    summary.segments.forEach((seg, idx) => order.set(seg.id, idx + 1));
    return order;
  }, [summary.segments]);
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
    () => (summary.result?.items ?? []).map((item) => ({
      id: `summary-${item.id}`,
      text: item.text,
      kind: 'paragraph',
    })),
    [summary.result],
  );
  const sourcePreview = doc?.blocks.find((block) => block.text.trim())?.text ?? doc?.text ?? '';
  const showingSummaryView = summaryView && Boolean(summary.result);
  const activeReadingSegments = showingSummaryView ? summaryReadingSegments : segments;

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
  const [readingMode, setReadingMode] = useState<'full' | 'excerpt' | 'summary'>('full');

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
    setReadingMode(showingSummaryView ? 'summary' : 'full');
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({ segments: activeReadingSegments, rate, voice: selectedVoice });
  };
  const readSelection = () => {
    if (!wordSelection || !isSpeechSupported()) return;
    const block = blocks.find((item) => item.id === wordSelection.segmentId);
    if (!block || block.text.slice(wordSelection.start, wordSelection.end) !== wordSelection.selectedText) return;
    setSpeechError('');
    setReadingMode('excerpt');
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
  const readSummary = () => {
    if (!summary.result?.items.length || !isSpeechSupported()) return;
    const targets: ReadingSegment[] = showingSummaryView
      ? summaryReadingSegments
      : summary.result.items.map((item) => {
          const sourceId = item.sources[0];
          const block = blocks.find((b) => b.id === sourceId);
          const offset = block ? block.text.indexOf(item.text) : -1;
          return {
            id: block ? block.id : item.id,
            text: item.text,
            sourceOffset: offset >= 0 ? offset : undefined,
            kind: block?.type === 'quote' ? 'quote' : 'paragraph',
          };
        });
    setSpeechError('');
    setReadingMode('summary');
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    speechRef.current?.speak({ segments: targets, rate, voice: selectedVoice });
  };
  const readSummaryItem = (itemId: string) => {
    const segment = summaryReadingSegments.find((item) => item.id === `summary-${itemId}`);
    if (!segment || !isSpeechSupported()) return;
    setOpenSummaryMenuId(null);
    setSpeechError('');
    setReadingMode('excerpt');
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
  const cycleRate = () => {
    const nextRate = SPEECH_SPEEDS[(SPEECH_SPEEDS.indexOf(rate as typeof SPEECH_SPEEDS[number]) + 1) % SPEECH_SPEEDS.length];
    setRate(nextRate);
    if (speechStatus === 'speaking' || speechStatus === 'paused') {
      speechRef.current?.restartFromLastPosition(nextRate, selectedVoice);
    }
  };

  // Vùng văn bản và thước đọc cố định.
  const mainRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
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
    && (showingSummaryView
      ? Boolean(summary.result?.items.length)
      : blocks.some((block) => ['paragraph', 'heading', 'quote', 'listItem'].includes(block.type) && block.text.trim()));

  const { capture, rememberWord } = useReadingAnchor(mainRef, bodyRef, rulerEnabled);
  const modal = narrow && showSettingsPanel;

  function togglePanel() {
    capture();
    focusAfterToggle.current = true;
    setPanelOpen(open => !open);
  }

  useLayoutEffect(() => {
    if (!focusAfterToggle.current) return;
    focusAfterToggle.current = false;
    (showSettingsPanel ? closeRef : triggerRef).current?.focus({ preventScroll: true });
  }, [showSettingsPanel]);

  useEffect(() => {
    if (!showSettingsPanel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || wordSelection ||
          document.querySelector('[role="dialog"]:not(#reader-display-settings), dialog[open]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        capture();
        focusAfterToggle.current = true;
        setPanelOpen(false);
      }
      if (event.key === 'Tab' && modal) {
        const controls = closeRef.current?.closest('aside')?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]');
        if (!controls?.length) return;
        const edge = event.shiftKey ? controls[0] : controls[controls.length - 1];
        if (document.activeElement === edge) {
          event.preventDefault();
          (event.shiftKey ? controls[controls.length - 1] : controls[0]).focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSettingsPanel, modal, wordSelection, capture]);

  useEffect(() => {
    if (!openSummaryMenuId) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !summaryMenuRef.current?.contains(event.target)) {
        setOpenSummaryMenuId(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpenSummaryMenuId(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openSummaryMenuId]);

  const scrollToSourceSegment = useCallback((sourceId: string) => {
    const main = mainRef.current;
    if (!main) return;
    const segmentEl = [...main.querySelectorAll<HTMLElement>('[data-segment-id]')]
      .find((el) => el.dataset.segmentId === sourceId);
    const markEl = segmentEl?.querySelector<HTMLElement>('mark.reader-summary-sentence') ?? segmentEl;
    if (!markEl) return;
    if (rulerEnabled) {
      const anchor = Math.round(main.clientHeight * 0.3);
      const targetTop = markEl.getBoundingClientRect().top - main.getBoundingClientRect().top;
      main.scrollTop += targetTop - anchor;
    } else {
      markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [rulerEnabled]);

  useEffect(() => {
    if (showingSummaryView || !pendingSummarySourceId) return;
    speechRef.current?.stop();
    const frame = window.requestAnimationFrame(() => {
      scrollToSourceSegment(pendingSummarySourceId);
      setPendingSummarySourceId(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [doc?.id, pendingSummarySourceId, scrollToSourceSegment, showingSummaryView]);

  useEffect(() => {
    if (!showingSummaryView || !summary.activeItemId) return;
    const frame = window.requestAnimationFrame(() => {
      const targetId = `summary-${summary.activeItemId}`;
      const target = [...(mainRef.current?.querySelectorAll<HTMLElement>('[data-segment-id]') ?? [])]
        .find((element) => element.dataset.segmentId === targetId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [summary.activeItemId, summaryNavigationRevision, showingSummaryView, summary.result]);

  function focusSummaryItem(item: SummaryItem, openDedicatedView?: boolean) {
    summary.setActiveItemId(item.id);
    setSummaryNavigationRevision((rev) => rev + 1);
    if (openDedicatedView) {
      setSummaryView(true);
      setSourcesItemId(null);
    }
    if (modal) setPanelOpen(false);
    const willBeInSummaryView = openDedicatedView ?? showingSummaryView;
    if (!willBeInSummaryView && item.sources[0]) {
      window.requestAnimationFrame(() => scrollToSourceSegment(item.sources[0]));
    }
  }

  function selectSummaryForSourceBlock(segmentId: string) {
    if (!summary.result) return;
    const item = summary.result.items.find((candidate) => candidate.sources.includes(segmentId));
    if (!item) return;
    summary.setActiveItemId(item.id);
    setSummaryNavigationRevision((rev) => rev + 1);
    setPanelOpen(true);
    setTab('Tóm tắt');
  }

  function showSummarySource(segmentId: string, itemId?: string) {
    if (!doc) return;
    if (itemId) summary.setActiveItemId(itemId);
    setSourcesItemId(null);
    setSummaryView(false);
    setActiveBoundary(null);
    setViewSelection({ documentId: doc.id, mode: 'reading' });
    setPendingSummarySourceId(segmentId);
  }

  function enterSummaryView() {
    speechRef.current?.stop();
    setActiveBoundary(null);
    clearWord();
    setSummaryView(true);
    setSourcesItemId(null);
    mainRef.current?.scrollTo({ top: 0 });
  }

  function exitSummaryView(scrollTop = false) {
    speechRef.current?.stop();
    setActiveBoundary(null);
    setSummaryView(false);
    setSourcesItemId(null);
    setOpenSummaryMenuId(null);
    if (scrollTop) mainRef.current?.scrollTo({ top: 0 });
  }

  function handleGenerateSummary(force = false) {
    speechRef.current?.stop();
    setActiveBoundary(null);
    setSourcesItemId(null);
    setOpenSummaryMenuId(null);
    setBookmarkedSummaryIds([]);
    setCopiedSummaryId(null);
    setSummaryCopyError('');
    void summary.summarize({ force }).then((res) => {
      if (res?.items[0]) {
        if (showingSummaryView) {
          mainRef.current?.scrollTo({ top: 0 });
        } else {
          focusSummaryItem(res.items[0], false);
        }
      }
    });
  }

  function changeSettings(patch: Parameters<typeof update>[0]) {
    capture();
    update(patch);
  }
  function changeFontSize(delta: number) {
    const [min, max] = LIMITS.fontSize;
    changeSettings({ fontSize: Math.max(min, Math.min(max, s.fontSize + delta)) });
  }

  const readerToolbarTrailing = (
    <div role="group" aria-label="Công cụ đọc" className="flex flex-wrap items-center gap-1.5 font-label text-xs">
      <div
        className="inline-flex items-center rounded-xl overflow-hidden"
        style={{ backgroundColor: theme.controlBg, border: `1px solid ${theme.border}` }}
      >
        <button
          type="button"
          aria-label="Giảm cỡ chữ"
          disabled={s.fontSize <= LIMITS.fontSize[0]}
          onClick={() => changeFontSize(-1)}
          className="px-2.5 py-1.5 font-semibold disabled:opacity-45"
          style={{ color: theme.secondaryText }}
        >
          A−
        </button>
        <span
          className="px-2 py-1.5 font-semibold"
          style={{
            borderLeft: `1px solid ${theme.border}`,
            borderRight: `1px solid ${theme.border}`,
            color: theme.fg,
          }}
        >
          {s.fontSize} px
        </span>
        <button
          type="button"
          aria-label="Tăng cỡ chữ"
          disabled={s.fontSize >= LIMITS.fontSize[1]}
          onClick={() => changeFontSize(1)}
          className="px-2.5 py-1.5 font-semibold disabled:opacity-45"
          style={{ color: theme.secondaryText }}
        >
          A+
        </button>
      </div>

      <button
        type="button"
        role="switch"
        aria-label="Thước đọc"
        aria-checked={s.focus.enabled}
        data-ruler-switch
        onClick={() => update({ focus: { enabled: !s.focus.enabled } })}
        className="reader-surface-btn rounded-xl px-2.5 py-1.5 font-semibold"
      >
        Thước đọc · {s.focus.enabled ? `${s.focus.lineCount} dòng` : 'Tắt'}
      </button>

      <button
        type="button"
        aria-label="Hướng dẫn chọn từ và phím tắt"
        aria-expanded={showHelp}
        title="Hướng dẫn chọn từ và bàn phím"
        onClick={() => setShowHelp((open) => !open)}
        className="reader-surface-btn w-7 h-7 rounded-full flex items-center justify-center font-bold"
      >
        ?
      </button>
    </div>
  );

  const settingsPanel = (
    <aside
      id="reader-display-settings"
      role={modal ? 'dialog' : undefined}
      aria-modal={modal || undefined}
      aria-labelledby="reader-settings-title"
      className="flex flex-col w-[340px] max-w-[92vw] h-full rounded-3xl overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: theme.panelBg,
        color: theme.fg,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.isDark
          ? '0 14px 38px rgba(0, 0, 0, 0.36)'
          : '0 8px 28px rgba(45, 34, 15, 0.06)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <h2 id="reader-settings-title" className="flex items-center gap-2 text-[15px] font-headline font-semibold">
          <span className="material-symbols-outlined text-[20px]" style={{ color: theme.secondaryText }}>tune</span>
          Cài đặt hiển thị
        </h2>
        <button
          type="button"
          ref={closeRef}
          onClick={togglePanel}
          aria-label="Đóng cài đặt"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: theme.surfaceBg, color: theme.secondaryText }}
        >
          <span aria-hidden="true" className="text-xl leading-none">×</span>
        </button>
      </div>

      <div className="flex gap-1.5 px-4 pt-4 shrink-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-label font-semibold transition-colors"
              style={
                active
                  ? { backgroundColor: theme.accent, color: theme.accentFg }
                  : { backgroundColor: theme.surfaceBg, color: theme.secondaryText }
              }
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {tab === 'Giao diện' && (
          <>
            <section className="space-y-2.5">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                Màu sắc (đồng bộ toàn trang)
              </h3>
              <div className="grid grid-cols-5 gap-1">
                {(Object.keys(THEMES) as ThemeName[]).map((k) => {
                  const active = s.theme === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update({ theme: k })}
                      aria-pressed={active}
                      title={THEMES[k].label}
                      aria-label={THEMES[k].label}
                      className="rounded-xl py-2 px-0.5 flex flex-col items-center justify-center gap-0.5 transition-all"
                      style={{
                        backgroundColor: THEMES[k].bg,
                        color: THEMES[k].fg,
                        border: active ? `2px solid ${theme.accent}` : `1.5px solid ${THEMES[k].borderStrong}`,
                        boxShadow: active ? `0 0 0 2px ${theme.accentSoft}` : undefined,
                      }}
                    >
                      <span className="text-sm font-bold leading-none">Aa</span>
                      <span className="text-[9px] font-label font-semibold tracking-tight leading-tight whitespace-nowrap">
                        {THEMES[k].shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] font-label" style={{ color: theme.secondaryText }}>
                {THEMES[s.theme].label} — đang áp dụng
              </p>
            </section>

            <div role="group" aria-labelledby="reader-typography" className="space-y-5">
              <h3 id="reader-typography" className="text-sm font-semibold">Chữ và khoảng cách</h3>
              <section className="space-y-2.5">
                <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                  Phông &amp; kiểu chữ
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FONT_LABELS) as FontFamily[]).map((f) => {
                    const active = s.fontFamily === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => changeSettings({ fontFamily: f })}
                        aria-pressed={active}
                        className="min-w-0 px-2.5 py-2 rounded-xl text-left transition-colors"
                        style={{
                          fontFamily: FONT_STACKS[f],
                          backgroundColor: active ? theme.accentSoft : theme.controlBg,
                          border: active ? `1.5px solid ${theme.accent}` : `1px solid ${theme.border}`,
                          color: theme.fg,
                        }}
                      >
                        <span className="block text-[12px] leading-tight font-semibold break-words">
                          {FONT_LABELS[f]}
                        </span>
                        {active && (
                          <span
                            className="block text-[10px] font-label mt-0.5 leading-none font-semibold"
                            style={{ color: theme.activeFg }}
                          >
                            ✓ Đang dùng
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                  Kích thước chữ
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Giảm cỡ chữ"
                    disabled={s.fontSize <= LIMITS.fontSize[0]}
                    onClick={() => changeFontSize(-1)}
                    className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold disabled:opacity-45"
                    style={{
                      backgroundColor: theme.controlBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.fg,
                    }}
                  >
                    A-
                  </button>
                  <input
                    type="range"
                    className="flex-1"
                    style={{ accentColor: theme.accent }}
                    min={LIMITS.fontSize[0]}
                    max={LIMITS.fontSize[1]}
                    step={1}
                    aria-label="Cỡ chữ"
                    aria-valuetext={s.fontSize + ' pixel'}
                    value={s.fontSize}
                    onChange={(e) => changeSettings({ fontSize: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    aria-label="Tăng cỡ chữ"
                    disabled={s.fontSize >= LIMITS.fontSize[1]}
                    onClick={() => changeFontSize(1)}
                    className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold disabled:opacity-45"
                    style={{
                      backgroundColor: theme.controlBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.fg,
                    }}
                  >
                    A+
                  </button>
                  <span
                    className="text-xs font-label font-semibold w-10 text-right shrink-0"
                    style={{ color: theme.fg }}
                  >
                    {s.fontSize}px
                  </span>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                  Khoảng cách
                </h3>
                <Slider label="Giãn dòng" value={s.lineHeight} min={LIMITS.lineHeight[0]} max={LIMITS.lineHeight[1]} step={0.1} accent={theme.accent} secondaryText={theme.secondaryText} fg={theme.fg} onChange={(v) => changeSettings({ lineHeight: v })} />
                <Slider label="Giãn chữ" unit="em" value={s.letterSpacing} min={LIMITS.letterSpacing[0]} max={LIMITS.letterSpacing[1]} step={0.01} accent={theme.accent} secondaryText={theme.secondaryText} fg={theme.fg} onChange={(v) => changeSettings({ letterSpacing: v })} />
                <Slider label="Giãn khoảng cách từ" unit="em" value={assist.wordSpacing} min={LIMITS.wordSpacing[0]} max={LIMITS.wordSpacing[1]} step={0.02} accent={theme.accent} secondaryText={theme.secondaryText} fg={theme.fg} onChange={(v) => { capture(); updateAssist({ wordSpacing: v }); }} />
                <Slider label="Độ rộng cột" unit="ch" value={s.columnWidth} min={LIMITS.columnWidth[0]} max={LIMITS.columnWidth[1]} step={1} accent={theme.accent} secondaryText={theme.secondaryText} fg={theme.fg} onChange={(v) => changeSettings({ columnWidth: v })} />
              </section>
            </div>
          </>
        )}

        {tab === 'Hỗ trợ đọc' && (
          <div className="space-y-5">
            <section className="space-y-3">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                Dẫn hướng dòng đọc
              </h3>

              <button
                type="button"
                role="switch"
                aria-label="Thước đọc cố định"
                aria-describedby="reader-ruler-help"
                aria-checked={s.focus.enabled}
                data-ruler-switch
                onClick={() => update({ focus: { enabled: !s.focus.enabled } })}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors"
                style={{
                  backgroundColor: theme.controlBg,
                  border: `1px solid ${s.focus.enabled ? theme.accent : theme.border}`,
                }}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: theme.activeFg }}>view_day</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Thước đọc cố định</span>
                  <span id="reader-ruler-help" className="block text-[11px] mt-0.5 leading-relaxed" style={{ color: theme.secondaryText }}>
                    Thước đứng yên. Nhấn ↓ để văn bản cuộn lên một dòng, nhấn ↑ để quay lại hoặc lăn chuột trong vùng chữ.
                  </span>
                </span>
                <span
                  className="relative shrink-0 w-10 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: s.focus.enabled ? theme.accent : theme.borderStrong }}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${s.focus.enabled ? 'left-[18px]' : 'left-0.5'}`}
                    style={{ backgroundColor: theme.accentFg }}
                  />
                </span>
              </button>

              {s.focus.enabled && (
                <>
                  <fieldset className="space-y-2" data-ruler-control>
                    <legend className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                      Số dòng nhìn rõ
                    </legend>
                    <div className="flex gap-2">
                      {([1, 2, 3] as const).map((count) => {
                        const active = s.focus.lineCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            aria-pressed={active}
                            onClick={() => update({ focus: { lineCount: count } })}
                            className="flex-1 rounded-xl py-2 text-sm font-label transition-colors"
                            style={
                              active
                                ? {
                                    backgroundColor: theme.accentSoft,
                                    border: `1.5px solid ${theme.accent}`,
                                    color: theme.activeFg,
                                    fontWeight: 600,
                                  }
                                : {
                                    backgroundColor: theme.controlBg,
                                    border: `1px solid ${theme.border}`,
                                    color: theme.fg,
                                  }
                            }
                          >
                            {count} dòng
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <Slider
                    label="Độ mờ vùng ngoài thước"
                    unit="%"
                    value={Math.round(s.focus.dimOpacity * 100)}
                    min={50}
                    max={80}
                    step={5}
                    accent={theme.accent}
                    secondaryText={theme.secondaryText}
                    fg={theme.fg}
                    onChange={(v) => update({ focus: { dimOpacity: v / 100 } })}
                  />
                </>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-label font-bold uppercase tracking-wide" style={{ color: theme.secondaryText }}>
                Hỗ trợ nhận diện &amp; nhịp đọc
              </h3>

              <button
                type="button"
                role="switch"
                aria-label="Phân biệt chữ dễ nhầm b, d, p, q"
                aria-checked={assist.mirrorLetters}
                onClick={() => updateAssist({ mirrorLetters: !assist.mirrorLetters })}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors"
                style={{
                  backgroundColor: theme.controlBg,
                  border: `1px solid ${assist.mirrorLetters ? theme.accent : theme.border}`,
                }}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: theme.activeFg }}>spellcheck</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Phân biệt chữ dễ nhầm</span>
                  <span className="block text-[11px] mt-0.5 leading-relaxed" style={{ color: theme.secondaryText }}>
                    Tô màu dịu tách biệt 4 ký tự đảo gương kinh điển:
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1.5" aria-hidden="true">
                    <span className="reader-mirror-b px-1.5 py-0.5 text-xs">b</span>
                    <span className="reader-mirror-d px-1.5 py-0.5 text-xs">d</span>
                    <span className="reader-mirror-p px-1.5 py-0.5 text-xs">p</span>
                    <span className="reader-mirror-q px-1.5 py-0.5 text-xs">q</span>
                  </span>
                </span>
                <span
                  className="relative shrink-0 w-10 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: assist.mirrorLetters ? theme.accent : theme.borderStrong }}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${assist.mirrorLetters ? 'left-[18px]' : 'left-0.5'}`}
                    style={{ backgroundColor: theme.accentFg }}
                  />
                </span>
              </button>

              <button
                type="button"
                role="switch"
                aria-label="Thẻ chia đoạn và đánh số"
                aria-checked={assist.paragraphCards}
                onClick={() => { capture(); updateAssist({ paragraphCards: !assist.paragraphCards }); }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-colors"
                style={{
                  backgroundColor: theme.controlBg,
                  border: `1px solid ${assist.paragraphCards ? theme.accent : theme.border}`,
                }}
              >
                <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: theme.activeFg }}>view_agenda</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Thẻ chia đoạn &amp; đánh số</span>
                  <span className="block text-[11px] mt-0.5 leading-relaxed" style={{ color: theme.secondaryText }}>
                    Tách khung nhẹ từng đoạn kèm số 01, 02 chống ngợp chữ khi đọc bài dài.
                  </span>
                </span>
                <span
                  className="relative shrink-0 w-10 h-6 rounded-full transition-colors"
                  style={{ backgroundColor: assist.paragraphCards ? theme.accent : theme.borderStrong }}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${assist.paragraphCards ? 'left-[18px]' : 'left-0.5'}`}
                    style={{ backgroundColor: theme.accentFg }}
                  />
                </span>
              </button>
            </section>
          </div>
        )}

        {tab === 'Tóm tắt' && (
          <section role="region" aria-labelledby="reader-summary-heading" aria-live="polite" className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3
                  id="reader-summary-heading"
                  className="text-xs font-label font-bold uppercase tracking-wide"
                  style={{ color: theme.secondaryText }}
                >
                  Tóm tắt tài liệu
                </h3>
                <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.secondaryText }}>
                  Chọn cách rút ý chính, đối chiếu câu nguồn hoặc mở chế độ đọc tóm tắt riêng.
                </p>
              </div>
              {summary.result && summary.activeItemId && !showingSummaryView && (
                <button
                  type="button"
                  onClick={() => summary.setActiveItemId(null)}
                  className="shrink-0 text-[11px] font-label font-semibold underline-offset-2 hover:underline"
                  style={{ color: theme.activeFg }}
                >
                  Bỏ tô sáng
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Phương pháp tóm tắt">
              {([
                { value: 'extractive', title: 'Đọc ý chính', desc: 'Rút gọn câu cốt lõi' },
                { value: 'llm', title: 'AI tóm tắt', desc: 'Diễn đạt mạch lạc' },
              ] as const).map((option) => {
                const active = summary.method === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={summary.loading}
                    onClick={() => {
                      speechRef.current?.stop();
                      setActiveBoundary(null);
                      resetSummaryUi();
                      summary.setMethod(option.value);
                    }}
                    className="rounded-xl px-3 py-2.5 text-left text-xs transition-colors disabled:opacity-60"
                    style={
                      active
                        ? {
                            backgroundColor: theme.accentSoft,
                            border: `1.5px solid ${theme.accent}`,
                            color: theme.activeFg,
                          }
                        : {
                            backgroundColor: theme.controlBg,
                            border: `1px solid ${theme.border}`,
                            color: theme.fg,
                          }
                    }
                  >
                    <span className="block font-semibold">{option.title}</span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: active ? theme.activeFg : theme.secondaryText }}>
                      {option.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {!user || summary.needsLogin ? (
              <div
                className="rounded-2xl p-3.5 space-y-2.5"
                style={{ backgroundColor: theme.controlBg, border: `1px solid ${theme.border}` }}
              >
                <p className="text-xs leading-relaxed" style={{ color: theme.secondaryText }}>
                  Tính năng tóm tắt tài liệu yêu cầu đăng nhập.
                </p>
                <Link
                  to="/login"
                  state={{ from: '/reading' }}
                  className="inline-flex items-center justify-center w-full rounded-xl px-3.5 py-2.5 text-xs font-label font-semibold transition-opacity hover:opacity-95"
                  style={{ backgroundColor: theme.accent, color: theme.accentFg }}
                >
                  Đăng nhập
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={summary.loading}
                onClick={() => handleGenerateSummary(Boolean(summary.result))}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-label font-semibold transition-opacity disabled:opacity-60"
                style={{ backgroundColor: theme.accent, color: theme.accentFg }}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {summary.loading ? 'progress_activity' : 'auto_awesome'}
                </span>
                <span>
                  {summary.loading
                    ? 'Đang tóm tắt…'
                    : summary.result
                      ? 'Tạo lại tóm tắt'
                      : 'Tạo tóm tắt'}
                </span>
              </button>
            )}

            {summary.error && !summary.needsLogin && (
              <div
                role="alert"
                className="rounded-xl px-3 py-2.5 text-xs font-label font-medium leading-snug"
                style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
              >
                {summary.error}
              </div>
            )}

            {summary.result?.method === 'extractive' && summary.result.variants?.length ? (
              <fieldset
                className="space-y-2 rounded-2xl p-3"
                style={{ backgroundColor: theme.controlBg, border: `1px solid ${theme.border}` }}
              >
                <legend className="px-1 text-xs font-label font-semibold" style={{ color: theme.fg }}>
                  Độ dài tóm tắt
                </legend>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Độ dài tóm tắt">
                  {([
                    ['short', 'Ngắn'],
                    ['medium', 'Vừa'],
                    ['long', 'Dài'],
                  ] as const).map(([len, label]) => {
                    const active = summary.length === len;
                    return (
                      <button
                        key={len}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          summary.selectLength(len);
                          setSummaryNavigationRevision((rev) => rev + 1);
                        }}
                        className="rounded-lg px-2 py-2 text-xs font-label transition-colors"
                        style={
                          active
                            ? {
                                backgroundColor: theme.accentSoft,
                                border: `1.5px solid ${theme.accent}`,
                                color: theme.activeFg,
                                fontWeight: 700,
                              }
                            : {
                                backgroundColor: theme.surfaceBg,
                                border: `1px solid ${theme.border}`,
                                color: theme.fg,
                              }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {summary.result && (
              <div className="space-y-3">
                <div
                  className="rounded-2xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 font-label"
                  style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.border}` }}
                >
                  <span className="text-xs font-semibold" style={{ color: theme.fg }}>
                    {summary.result.items.length} ý chính
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSpeechSupported() && (
                      <button
                        type="button"
                        onClick={readSummary}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-95"
                        style={{ backgroundColor: theme.accent, color: theme.accentFg }}
                      >
                        <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                        <span>Nghe ý chính</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => (showingSummaryView ? exitSummaryView(false) : enterSummaryView())}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-label font-semibold transition-colors"
                    style={{
                      backgroundColor: showingSummaryView ? theme.surfaceBg : theme.accentSoft,
                      border: `1px solid ${showingSummaryView ? theme.border : theme.accent}`,
                      color: showingSummaryView ? theme.fg : theme.activeFg,
                    }}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {showingSummaryView ? 'menu_book' : 'article'}
                    </span>
                    <span>{showingSummaryView ? 'Quay lại tài liệu gốc' : 'Mở bản tóm tắt tập trung'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSummaryPreviewOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-label font-semibold transition-colors"
                    style={{
                      backgroundColor: theme.controlBg,
                      border: `1px solid ${theme.border}`,
                      color: theme.fg,
                    }}
                  >
                    <span className="material-symbols-outlined text-[17px]" style={{ color: theme.activeFg }}>preview</span>
                    <span>Xem &amp; xuất bản hoàn chỉnh</span>
                  </button>
                </div>

                <div
                  className="space-y-2 rounded-2xl p-3"
                  style={{ backgroundColor: theme.controlBg, border: `1px solid ${theme.border}` }}
                >
                  <p className="text-xs font-label font-semibold" style={{ color: theme.fg }}>
                    Đi nhanh tới ý tóm tắt
                  </p>
                  <div className="grid max-h-32 grid-cols-5 gap-1.5 overflow-y-auto" role="group" aria-label="Chọn block tóm tắt">
                    {summary.result.items.map((item, index) => {
                      const selected = summary.activeItemId === item.id;
                      const bookmarked = bookmarkedSummaryIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`Đi tới ý ${index + 1}`}
                          aria-pressed={selected}
                          onClick={() => focusSummaryItem(item)}
                          className="flex h-8 items-center justify-center gap-1 rounded-lg text-xs font-label font-semibold transition-colors"
                          style={
                            selected
                              ? {
                                  backgroundColor: theme.accent,
                                  border: `1.5px solid ${theme.accent}`,
                                  color: theme.accentFg,
                                }
                              : bookmarked
                                ? {
                                    backgroundColor: theme.warningBg,
                                    border: `1.5px solid ${theme.warningBorder}`,
                                    color: theme.warningFg,
                                  }
                                : {
                                    backgroundColor: theme.surfaceBg,
                                    border: `1px solid ${theme.border}`,
                                    color: theme.fg,
                                  }
                          }
                        >
                          {bookmarked && <span className="material-symbols-outlined text-[13px]" aria-hidden="true">flag</span>}
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ol className="space-y-2" aria-label="Danh sách câu cốt lõi">
                  {summary.result.items.map((item, idx) => {
                    const active = summary.activeItemId === item.id;
                    const bookmarked = bookmarkedSummaryIds.includes(item.id);
                    const segNum = segmentOrder.get(item.sources[0]);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => focusSummaryItem(item)}
                          className="w-full text-left rounded-2xl p-3 space-y-1.5 transition-colors"
                          style={{
                            backgroundColor: active ? theme.accentSoft : theme.controlBg,
                            border: active
                              ? `1.5px solid ${theme.accent}`
                              : bookmarked
                                ? `1.5px solid ${theme.warningBorder}`
                                : `1px solid ${theme.border}`,
                            color: theme.fg,
                          }}
                        >
                          <span className="flex items-center justify-between gap-2 font-label text-[11px] font-bold">
                            <span className="inline-flex items-center gap-1" style={{ color: theme.activeFg }}>
                              {bookmarked && (
                                <span
                                  className="material-symbols-outlined text-[13px]"
                                  style={{ color: theme.warningFg }}
                                  aria-label="Đã đánh dấu"
                                >
                                  flag
                                </span>
                              )}
                              Ý chính {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={{ color: active ? theme.activeFg : theme.secondaryText }}>
                              {segNum ? `Đoạn ${segNum}` : 'Nguồn'}{active ? ' ✓' : ' →'}
                            </span>
                          </span>
                          <span className="block text-xs leading-relaxed font-body">
                            {item.text}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        )}
      </div>

      <div
        className="px-5 py-4 space-y-3 shrink-0"
        style={{ borderTop: `1px solid ${theme.border}` }}
      >
        <button
          type="button"
          onClick={() => { capture(); reset(); }}
          className="w-full text-xs font-label font-semibold rounded-xl py-2.5 transition-colors"
          style={{ backgroundColor: theme.surfaceBg, color: theme.fg, border: `1px solid ${theme.border}` }}
        >
          Đặt lại mặc định
        </button>
        <div
          className="flex items-start gap-2 text-[11px] leading-snug rounded-xl px-3 py-2.5"
          style={{ backgroundColor: theme.surfaceBg, color: theme.secondaryText }}
        >
          <span className="material-symbols-outlined text-[15px] shrink-0 mt-0.5" style={{ color: theme.activeFg }}>lightbulb</span>
          Mẹo nhỏ: Hãy thử tăng khoảng cách dòng và dùng font Lexend để đọc dễ hơn nhé.
        </div>
      </div>
    </aside>
  );

  // Phải đặt SAU toàn bộ hook
  if (!doc) return <Navigate to="/" replace />;

  const words = countWords(doc.text);
  const shellVars = {
    backgroundColor: theme.bg,
    color: theme.fg,
    fontFamily: FONT_STACKS[s.fontFamily],
    fontSize: s.fontSize,
    '--reader-bg': theme.bg,
    '--reader-fg': theme.fg,
    '--reader-secondary-text': theme.secondaryText,
    '--reader-sidebar-bg': theme.sidebarBg,
    '--reader-panel-bg': theme.panelBg,
    '--reader-surface-bg': theme.surfaceBg,
    '--reader-control-bg': theme.controlBg,
    '--reader-hover-bg': theme.hoverBg,
    '--reader-active-bg': theme.activeBg,
    '--reader-active-fg': theme.activeFg,
    '--reader-border': theme.border,
    '--reader-border-strong': theme.borderStrong,
    '--reader-accent': theme.accent,
    '--reader-accent-fg': theme.accentFg,
    '--reader-accent-soft': theme.accentSoft,
    '--reader-highlight-bg': theme.highlightBg,
    '--reader-highlight-fg': theme.highlightFg,
    '--reader-highlight-outline': theme.highlightOutline,
    '--reader-warning-bg': theme.warningBg,
    '--reader-warning-fg': theme.warningFg,
    '--reader-warning-border': theme.warningBorder,
    '--reader-error-bg': theme.errorBg,
    '--reader-error-fg': theme.errorFg,
    '--reader-tooltip-bg': theme.tooltipBg,
    '--reader-tooltip-fg': theme.tooltipFg,
    '--reader-brand-badge-bg': theme.brandBadgeBg,
    '--reader-brand-badge-fg': theme.brandBadgeFg,
    '--reader-brand-badge-border': theme.brandBadgeBorder,
    '--reader-brand-dot': theme.brandDot,
    '--reader-mirror-b-fg': theme.isDark ? '#8CC2FF' : '#0E4C96',
    '--reader-mirror-b-bg': theme.isDark ? 'rgba(140, 194, 255, 0.16)' : 'rgba(21, 86, 184, 0.12)',
    '--reader-mirror-d-fg': theme.isDark ? '#7CE3AE' : '#175E38',
    '--reader-mirror-d-bg': theme.isDark ? 'rgba(124, 227, 174, 0.16)' : 'rgba(23, 94, 56, 0.12)',
    '--reader-mirror-p-fg': theme.isDark ? '#D9B3FF' : '#632B94',
    '--reader-mirror-p-bg': theme.isDark ? 'rgba(217, 179, 255, 0.16)' : 'rgba(99, 43, 148, 0.12)',
    '--reader-mirror-q-fg': theme.isDark ? '#FFC085' : '#96450B',
    '--reader-mirror-q-bg': theme.isDark ? 'rgba(255, 192, 133, 0.16)' : 'rgba(150, 69, 11, 0.13)',
  } as React.CSSProperties;

  const viewModeSwitcher = hasOriginal ? (
    <div
      className="inline-flex rounded-xl p-1 text-xs font-label shrink-0"
      role="group"
      aria-label="Chế độ xem tài liệu"
      style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.border}` }}
    >
      <button
        type="button"
        aria-pressed={viewMode === 'original'}
        onClick={() => {
          speechRef.current?.stop();
          setActiveBoundary(null);
          clearWord();
          setSummaryView(false);
          setViewSelection({ documentId: doc.id, mode: 'original' });
        }}
        className="rounded-lg px-2.5 py-1 font-medium transition-colors"
        style={
          viewMode === 'original'
            ? { backgroundColor: theme.accent, color: theme.accentFg }
            : { color: theme.secondaryText }
        }
      >
        Bản gốc
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'reading'}
        onClick={() => setViewSelection({ documentId: doc.id, mode: 'reading' })}
        className="rounded-lg px-2.5 py-1 font-medium transition-colors"
        style={
          viewMode === 'reading'
            ? { backgroundColor: theme.accent, color: theme.accentFg }
            : { color: theme.secondaryText }
        }
      >
        Trang đọc
      </button>
    </div>
  ) : null;

  const activeSourcesItem = sourcesItemId
    ? summary.result?.items.find((candidate) => candidate.id === sourcesItemId) ?? null
    : null;

  return (
    <div
      className="reader-shell antialiased h-screen flex overflow-hidden relative isolate"
      style={shellVars}
    >
      <aside
        data-settings-open={showSettingsPanel}
        inert={modal}
        className="reader-sidebar flex flex-col h-screen shrink-0 px-2 py-6 font-body text-base"
      >
        <div className="px-1">
          <Link to="/" aria-label="LexiEase – Trang chủ" className="reader-brand mb-6 flex items-center gap-2 px-2">
            <span className="reader-brand-long font-headline text-[25px] font-semibold">LexiEase</span>
            <span
              className="reader-brand-dot-long h-2 w-2 rounded-full"
              style={{ backgroundColor: theme.brandDot }}
              aria-hidden="true"
            />
            <span className="reader-brand-badge font-headline" aria-hidden="true">
              L
              <span className="reader-brand-badge-dot" />
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 font-label text-sm" aria-label="Điều hướng chính">
          {SIDEBAR_ITEMS.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end aria-label={label} className="reader-nav-item">
              {({ isActive }) => <>
                <SidebarIcon path={icon} />
                <span className="reader-nav-text">{label}</span>
                {isActive && <span className="reader-active-dot ml-auto h-1.5 w-1.5 rounded-full bg-current" />}
              </>}
            </NavLink>
          ))}
        </nav>

        {viewMode === 'reading' && (
          <div
            className="mt-3 pt-3 font-label text-sm"
            style={{ borderTop: `1px solid ${theme.border}` }}
          >
            <button
              ref={triggerRef}
              type="button"
              className="reader-nav-item"
              aria-label="Cài đặt hiển thị"
              aria-expanded={showSettingsPanel}
              aria-controls={showSettingsPanel ? 'reader-display-settings' : undefined}
              onClick={togglePanel}
            >
              <SidebarIcon path="M3 7h7m4 0h7M3 17h13m4 0h1M10 4v6m6 4v6" />
              <span className="reader-nav-text">Cài đặt hiển thị</span>
            </button>
          </div>
        )}

        <div className="reader-decoration flex-1 min-h-0 flex flex-col gap-3 px-2 pt-4 overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-1 text-center select-none pointer-events-none overflow-hidden">
            <svg
              aria-hidden="true"
              viewBox="0 0 180 156"
              fill="none"
              className="w-full max-w-[158px] max-h-[clamp(96px,20vh,148px)] shrink"
            >
              <path
                d="M40 94C28 64 52 28 94 26C136 24 158 58 148 96C138 134 54 128 40 94Z"
                fill={theme.surfaceBg}
                opacity="0.95"
              />
              <path
                d="M38 106C58 98 76 100 90 112C104 100 122 98 142 106V54C122 46 104 48 90 60C76 48 58 46 38 54V106Z"
                stroke={theme.fg}
                strokeWidth="2"
                strokeLinejoin="round"
                opacity="0.82"
              />
              <path d="M90 60V112" stroke={theme.fg} strokeWidth="1.8" opacity="0.65" />
              <path
                d="M48 68C60 64 72 66 80 71M48 80C60 76 72 78 80 83M48 92C58 89 68 90 76 94"
                stroke={theme.secondaryText}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path
                d="M100 71C108 66 120 64 132 68M100 83C108 78 120 76 132 80"
                stroke={theme.secondaryText}
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.55"
              />
              <path d="M116 49V76L121 71L126 76V50" fill={theme.brandDot} opacity="0.92" />
              <path
                d="M90 124C90 112 96 100 110 92"
                stroke={theme.accent}
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M102 97C108 87 120 84 127 89C120 96 111 100 102 97Z"
                fill={theme.accentSoft}
                stroke={theme.accent}
                strokeWidth="1.4"
              />
              <path
                d="M95 109C84 103 77 107 75 114C84 117 91 115 95 109Z"
                fill={theme.brandDot}
                opacity="0.4"
              />
              <circle cx="52" cy="36" r="2.5" fill={theme.brandDot} />
              <circle cx="136" cy="38" r="2" fill={theme.accent} opacity="0.65" />
            </svg>
            <p
              className="text-[12.5px] font-label font-medium leading-[1.6]"
              style={{ color: theme.secondaryText }}
            >
              Đọc chậm rãi,
              <br />
              tự tin hơn mỗi ngày
            </p>
            <svg viewBox="0 0 70 10" className="w-14 h-2.5 shrink-0 opacity-65" fill="none" aria-hidden="true">
              <path
                d="M2 5 Q10 1 18 5 T34 5 T50 5 T68 5"
                stroke={theme.brandDot}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div
            className="mt-auto shrink-0 rounded-2xl p-3 font-label"
            style={{ backgroundColor: theme.surfaceBg, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-2.5" style={{ color: theme.secondaryText }}>
              <span>Nền dịu mắt</span>
              <span style={{ color: theme.fg }}>{theme.shortLabel}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Đổi nhanh màu nền đọc">
              {(Object.keys(THEMES) as ThemeName[]).map((k) => {
                const active = s.theme === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update({ theme: k })}
                    aria-pressed={active}
                    aria-label={`Đổi nền ${THEMES[k].label}`}
                    title={THEMES[k].label}
                    className="h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-transform active:scale-95"
                    style={{
                      backgroundColor: THEMES[k].bg,
                      color: THEMES[k].fg,
                      border: active ? `2px solid ${theme.accent}` : `1px solid ${THEMES[k].borderStrong}`,
                      boxShadow: active ? `0 0 0 2px ${theme.accentSoft}` : undefined,
                    }}
                  >
                    Aa
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 h-screen flex overflow-hidden font-body text-base">
        {showSettingsPanel && <>
          {modal && <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/30" onClick={togglePanel} />}
          <div className={modal ? 'fixed inset-y-0 right-0 z-50 p-2' : 'order-last shrink-0 h-full py-4 pr-4'}>
            {settingsPanel}
          </div>
        </>}
        <div className="relative min-w-0 flex-1" inert={modal}>
          <main
            ref={mainRef}
            tabIndex={0}
            aria-label="Nội dung tài liệu"
            className="relative h-full overflow-y-auto"
            style={rulerEnabled ? { containerType: 'size', overflowAnchor: 'none' } : undefined}
          >
            {viewMode === 'original' && doc.originalFile ? (
              <>
                {viewModeSwitcher && <div className="px-4 pt-3">{viewModeSwitcher}</div>}
                <OriginalDocumentView
                  key={doc.id}
                  file={doc.originalFile}
                  source={doc.source === 'image' ? 'image' : 'pdf'}
                />
              </>
            ) : (
            <div className="flex flex-col items-center px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
              <ManuscriptCard className="!py-8 sm:!py-10 md:!py-12 rounded-2xl border border-current/[0.12]">
                <div
                  className="mx-auto"
                  style={{
                    width: `${s.columnWidth}ch`,
                    maxWidth: '100%',
                    fontFamily: FONT_STACKS[s.fontFamily],
                    fontSize: `${s.fontSize}px`,
                  }}
                >
                {showingSummaryView && summary.result ? (
                  <section aria-label="Tóm tắt tài liệu" className="relative">
                    <div style={rulerEnabled ? { minHeight: '30cqh' } : undefined}>
                      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <button
                            type="button"
                            onClick={() => exitSummaryView(false)}
                            className="reader-surface-btn mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-label font-semibold"
                          >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Quay lại tài liệu
                          </button>
                          <div
                            className="font-label text-[11px] tracking-[0.2em] uppercase font-semibold px-3 py-1 rounded-full w-fit"
                            style={{ color: theme.badgeText, backgroundColor: theme.badgeBg }}
                          >
                            {summary.result.method === 'llm' ? 'Tóm tắt bằng AI' : 'Đọc ý chính'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => exitSummaryView(true)}
                          className="flex max-w-[min(100%,16rem)] items-center gap-3 rounded-xl p-2 text-left transition-colors"
                          style={{
                            backgroundColor: theme.surfaceBg,
                            border: `1px solid ${theme.border}`,
                            color: theme.fg,
                          }}
                          aria-label="Thu nhỏ tài liệu gốc; bấm để quay lại"
                        >
                          <span
                            aria-hidden="true"
                            className="h-14 w-11 shrink-0 overflow-hidden rounded-md p-1.5 text-[4px] leading-[1.45] opacity-80"
                            style={{
                              backgroundColor: theme.controlBg,
                              border: `1px solid ${theme.border}`,
                              color: theme.secondaryText,
                            }}
                          >
                            <span
                              className="mb-1 block h-1 w-6 rounded"
                              style={{ backgroundColor: theme.accent }}
                            />
                            {sourcePreview.slice(0, 220)}
                          </span>
                          <span className="min-w-0 font-label">
                            <span className="block text-[10px] uppercase tracking-wider" style={{ color: theme.secondaryText }}>
                              Tài liệu gốc
                            </span>
                            <span className="block truncate text-xs font-semibold">{doc.title}</span>
                            <span className="block text-[10px] font-semibold" style={{ color: theme.activeFg }}>
                              Bấm để quay lại
                            </span>
                          </span>
                        </button>
                      </div>

                      <h1
                        className="mb-2 text-2xl sm:text-3xl md:text-[2.2rem] font-bold tracking-tight leading-[1.3] break-words"
                        style={{ fontFamily: FONT_STACKS[s.fontFamily] }}
                      >
                        {doc.title}
                      </h1>
                      <p className="mb-6 text-xs sm:text-sm font-label" style={{ color: theme.secondaryText }}>
                        {summary.result.items.length} ý chính ·{' '}
                        {countWords(summary.result.items.map((item) => item.text).join(' ')).toLocaleString('vi-VN')} từ
                      </p>

                      <div className="mb-6">
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
                            ? readingMode === 'excerpt'
                              ? 'Ý riêng'
                              : `${Math.min(currentSegmentIndex + 1, summaryReadingSegments.length)}/${summaryReadingSegments.length} ý`
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
                          trailing={readerToolbarTrailing}
                        />

                        {showHelp && (
                          <p
                            className="mt-2 rounded-xl px-3.5 py-2.5 text-xs font-label leading-relaxed"
                            style={{
                              backgroundColor: theme.surfaceBg,
                              border: `1px solid ${theme.border}`,
                              color: theme.secondaryText,
                            }}
                          >
                            Bấm vào từng ý tóm tắt để chọn hoặc mở nút ⋯ để nghe riêng ý đó, sao chép, đánh dấu xem lại hoặc nhảy về đoạn nguồn trong tài liệu gốc.
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      ref={bodyRef}
                      onFocusCapture={e => rememberWord(e.target)}
                      onPointerDownCapture={e => rememberWord(e.target)}
                      className="reading-body relative w-full text-left"
                      style={{
                        fontFamily: FONT_STACKS[s.fontFamily],
                        fontSize: `${s.fontSize}px`,
                        lineHeight: s.lineHeight,
                        letterSpacing: `${s.letterSpacing}em`,
                        wordSpacing: `${assist.wordSpacing}em`,
                        backgroundColor: theme.bg,
                        color: theme.fg,
                      }}
                    >
                      <div className="space-y-4 font-body break-words" role="list" aria-label="Các ý tóm tắt">
                        {summary.result.items.map((item, idx) => {
                          let offset = 0;
                          const segmentId = `summary-${item.id}`;
                          const isBookmarked = bookmarkedSummaryIds.includes(item.id);
                          const isSelected = summary.activeItemId === item.id;
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
                                className={active ? 'reader-word-active px-0.5' : undefined}
                              >
                                {active ? token : renderMirrorText(token, assist.mirrorLetters)}
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
                              onClick={() => focusSummaryItem(item, true)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  focusSummaryItem(item, true);
                                }
                              }}
                              className="relative cursor-pointer rounded-2xl p-4 sm:p-5 pr-14 transition-colors"
                              style={{
                                backgroundColor: isSelected
                                  ? theme.accentSoft
                                  : isBookmarked
                                    ? theme.warningBg
                                    : theme.surfaceBg,
                                border: isSelected
                                  ? `1.5px solid ${theme.accent}`
                                  : isBookmarked
                                    ? `1.5px solid ${theme.warningBorder}`
                                    : `1px solid ${theme.border}`,
                                color: isBookmarked && !isSelected ? theme.warningFg : theme.fg,
                              }}
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2 font-label text-xs">
                                <span
                                  className="rounded-md px-2 py-0.5 font-bold"
                                  style={{ backgroundColor: theme.controlBg, color: theme.activeFg }}
                                >
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                {isBookmarked && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                    style={{
                                      backgroundColor: theme.warningBg,
                                      border: `1px solid ${theme.warningBorder}`,
                                      color: theme.warningFg,
                                    }}
                                  >
                                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">flag</span>
                                    Đã đánh dấu để xem lại
                                  </span>
                                )}
                              </div>
                              <p className="whitespace-pre-line">{tokens}</p>
                              {copiedSummaryId === item.id && (
                                <span role="status" className="mt-2.5 block text-xs font-label font-semibold" style={{ color: theme.activeFg }}>
                                  Đã sao chép ý này.
                                </span>
                              )}

                              <div
                                ref={openSummaryMenuId === item.id ? summaryMenuRef : undefined}
                                className="absolute right-2.5 top-2.5"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  aria-label="Tùy chọn ý tóm tắt"
                                  aria-haspopup="menu"
                                  aria-expanded={openSummaryMenuId === item.id}
                                  onClick={() => setOpenSummaryMenuId((current) => current === item.id ? null : item.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                                  style={{ backgroundColor: theme.controlBg, color: theme.secondaryText }}
                                >
                                  <span className="material-symbols-outlined">more_horiz</span>
                                </button>
                                {openSummaryMenuId === item.id && (
                                  <div
                                    role="menu"
                                    aria-label="Tùy chọn ý tóm tắt"
                                    className="absolute right-0 top-10 z-30 w-56 rounded-xl p-1.5 text-sm font-label shadow-xl"
                                    style={{
                                      backgroundColor: theme.panelBg,
                                      border: `1px solid ${theme.border}`,
                                      color: theme.fg,
                                    }}
                                  >
                                    <button
                                      role="menuitem"
                                      type="button"
                                      disabled={!isSpeechSupported()}
                                      onClick={() => readSummaryItem(item.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors disabled:opacity-50"
                                      style={{ color: theme.fg }}
                                    >
                                      <span className="material-symbols-outlined text-base" style={{ color: theme.activeFg }}>volume_up</span>
                                      Đọc ý này
                                    </button>
                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => void copySummaryItem(item.id, item.text)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                                      style={{ color: theme.fg }}
                                    >
                                      <span className="material-symbols-outlined text-base" style={{ color: theme.activeFg }}>content_copy</span>
                                      Sao chép ý
                                    </button>
                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setBookmarkedSummaryIds((current) => (
                                          isBookmarked
                                            ? current.filter((id) => id !== item.id)
                                            : [...current, item.id]
                                        ));
                                        setOpenSummaryMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                                      style={{ color: theme.fg }}
                                    >
                                      <span className="material-symbols-outlined text-base" style={{ color: theme.activeFg }}>
                                        {isBookmarked ? 'bookmark_remove' : 'bookmark_add'}
                                      </span>
                                      {isBookmarked ? 'Bỏ đánh dấu' : 'Đánh dấu để xem lại'}
                                    </button>
                                    <button
                                      role="menuitem"
                                      type="button"
                                      onClick={() => {
                                        setSourcesItemId(item.id);
                                        setOpenSummaryMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                                      style={{ color: theme.fg }}
                                    >
                                      <span className="material-symbols-outlined text-base" style={{ color: theme.activeFg }}>format_list_bulleted</span>
                                      Xem nguồn ({item.sources.length})
                                    </button>
                                  </div>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      {summaryCopyError && (
                        <p
                          role="alert"
                          className="mt-3 rounded-xl px-3 py-2 text-sm font-label"
                          style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
                        >
                          {summaryCopyError}
                        </p>
                      )}
                    </div>

                    <div style={rulerEnabled ? { minHeight: '70cqh' } : undefined} />
                  </section>
                ) : (
                <>
                <div style={rulerEnabled ? { minHeight: '30cqh' } : undefined}>
                  {/* Tiêu đề và thông tin bài */}
                  <div className="mb-5 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 select-none">
                        <span
                          style={{ color: theme.badgeText, backgroundColor: theme.badgeBg }}
                          className="inline-block font-label text-[11px] tracking-[0.2em] uppercase font-semibold px-3 py-1 rounded-full"
                        >
                          {SOURCE_LABEL[doc.source]}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-label" style={{ color: theme.secondaryText }}>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                            Khoảng {readingMinutes(doc.text)} phút đọc
                          </span>
                          <span aria-hidden="true" className="opacity-50">/</span>
                          <span>{words.toLocaleString('vi-VN')} từ</span>
                          {doc.pageCount ? (
                            <>
                              <span aria-hidden="true" className="opacity-50">/</span>
                              <span>{doc.pageCount} trang</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {summary.result && (
                          <button
                            type="button"
                            onClick={enterSummaryView}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-label font-semibold transition-colors"
                            style={{
                              backgroundColor: theme.accentSoft,
                              border: `1px solid ${theme.accent}`,
                              color: theme.activeFg,
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">summarize</span>
                            <span>Quay lại tóm tắt</span>
                          </button>
                        )}
                        {viewModeSwitcher}
                      </div>
                    </div>

                    <h1
                      className="text-2xl sm:text-3xl md:text-[2.2rem] font-bold tracking-tight leading-[1.3] break-words"
                      style={{ fontFamily: FONT_STACKS[s.fontFamily] }}
                    >
                      {doc.title}
                    </h1>
                  </div>

                  {/* Ghi chú OCR & Cảnh báo */}
                  {doc.ocrUsed && (
                    <p
                      role="note"
                      className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-label leading-relaxed"
                      style={{
                        backgroundColor: theme.surfaceBg,
                        border: `1px solid ${theme.border}`,
                        color: theme.secondaryText,
                      }}
                    >
                      Văn bản này được nhận dạng tự động từ hình ảnh nên có thể còn sai sót về chữ hoặc dấu.
                    </p>
                  )}

                  {doc.warnings.length > 0 && (
                    <div
                      role="alert"
                      className="mb-4 px-3.5 py-2.5 rounded-xl text-xs font-label leading-relaxed"
                      style={{ backgroundColor: theme.errorBg, color: theme.errorFg }}
                    >
                      {doc.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  )}

                  {/* Dải công cụ hợp nhất 1 dòng: Audio + Cỡ chữ + Thước đọc + Mẹo */}
                  <div className="mb-6">
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
                        ? readingMode === 'excerpt'
                          ? 'Phần đã chọn'
                          : readingMode === 'summary' && summary.result
                            ? `Ý chính ${Math.min(currentSegmentIndex + 1, summary.result.items.length)}/${summary.result.items.length}`
                            : `${Math.min(currentSegmentIndex + 1, segments.length)}/${segments.length} đoạn`
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
                      trailing={readerToolbarTrailing}
                    />

                    {showHelp && (
                      <p
                        className="mt-2 rounded-xl px-3.5 py-2.5 text-xs font-label leading-relaxed"
                        style={{
                          backgroundColor: theme.surfaceBg,
                          border: `1px solid ${theme.border}`,
                          color: theme.secondaryText,
                        }}
                      >
                        Bôi chọn nội dung trong một đoạn để nghe phần đó. Chọn từ hoặc cụm từ để giải nghĩa hoặc lưu từ. Bàn phím: Tab tới đoạn, Enter vào từ, dùng ←/→ rồi Enter để chọn.
                      </p>
                    )}
                  </div>
                </div>

                <div
                  ref={bodyRef}
                  onFocusCapture={e => rememberWord(e.target)}
                  onPointerDownCapture={e => rememberWord(e.target)}
                  className="reading-body text-left relative w-full"
                  style={{
                    fontFamily: FONT_STACKS[s.fontFamily],
                    fontSize: `${s.fontSize}px`,
                    lineHeight: s.lineHeight,
                    letterSpacing: `${s.letterSpacing}em`,
                    wordSpacing: `${assist.wordSpacing}em`,
                    backgroundColor: theme.bg,
                    color: theme.fg,
                  }}
                >
                  <ReadingText
                    blocks={blocks}
                    activeBoundary={activeBoundary}
                    staticHighlights={summaryHighlights}
                    highlightedBlockIds={activeSummaryItem?.sources}
                    onWordSelection={chooseWord}
                    onSegmentClick={selectSummaryForSourceBlock}
                    mirrorLetters={assist.mirrorLetters}
                    paragraphCards={assist.paragraphCards}
                    className="font-body break-words"
                    style={{
                      fontFamily: FONT_STACKS[s.fontFamily],
                      fontSize: `${s.fontSize}px`,
                      lineHeight: s.lineHeight,
                      letterSpacing: `${s.letterSpacing}em`,
                      wordSpacing: `${assist.wordSpacing}em`,
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
                    theme={theme}
                  />}
                </div>

                <div style={rulerEnabled ? { minHeight: '70cqh' } : undefined}>
                  <div className="my-14 flex items-center justify-center gap-3 select-none opacity-60">
                    <span className="w-8 h-[1px] bg-current" />
                    <span className="text-xs font-serif" style={{ color: theme.brandDot }}>❦</span>
                    <span className="w-8 h-[1px] bg-current" />
                  </div>

                  <footer className="pt-6 flex items-center justify-center" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <Link
                      to="/"
                      onClick={clearDocument}
                      className="reader-surface-btn px-5 py-3 rounded-xl flex items-center gap-2.5 text-xs uppercase tracking-wider font-semibold select-none"
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
            </div>
            )}
          </main>
          {rulerEnabled && (
            <FixedReadingRuler
              key={`${doc.id}-${showingSummaryView ? 'summary' : 'document'}`}
              mainRef={mainRef}
              bodyRef={bodyRef}
              lineCount={s.focus.lineCount}
              background={theme.bg}
              opacity={s.focus.dimOpacity}
              accent={theme.accent}
              accentFg={theme.accentFg}
              surfaceBg={theme.surfaceBg}
              controlBg={theme.controlBg}
              border={theme.border}
              fg={theme.fg}
            />
          )}
        </div>
      </div>

      {activeSourcesItem && (
        <SummarySourcesDialog
          item={activeSourcesItem}
          blocks={blocks}
          theme={theme}
          onClose={() => setSourcesItemId(null)}
          onGoToSource={(sourceId) => showSummarySource(sourceId, activeSourcesItem.id)}
        />
      )}

      {summaryPreviewOpen && summary.result && (
        <SummaryPreviewDialog
          items={summary.result.items}
          documentTitle={doc.title}
          theme={theme}
          onClose={() => setSummaryPreviewOpen(false)}
        />
      )}
    </div>
  );
};
