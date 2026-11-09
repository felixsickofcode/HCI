import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ManuscriptCard, AudioPlayerCapsule } from '../../components/common';
import { ReadingText } from '../../components/common/ReadingText';
import { mockReadingManuscript } from '../../mocks';
import {
  SpeechController,
  SPEECH_SPEEDS,
  getSpeechVoices,
  hasVietnameseVoice,
  isSpeechSupported,
  pickPreferredVoice,
  type BoundaryReliability,
  type ReadingSegment,
  type SpeechBoundaryEvent,
  type SpeechStatus,
} from '../../lib/speech';

export const MinimalReadingView: React.FC = () => {
  const manuscript = mockReadingManuscript;
  const supported = useMemo(() => isSpeechSupported(), []);
  const [controller] = useState(() => new SpeechController());

  const segments = useMemo<ReadingSegment[]>(
    () => [
      { id: 'lead-paragraph', text: manuscript.leadParagraph, kind: 'paragraph' },
      { id: 'second-paragraph', text: manuscript.secondParagraph, kind: 'paragraph' },
      { id: 'callout-quote', text: manuscript.calloutQuote, kind: 'quote' },
      { id: 'third-paragraph', text: manuscript.thirdParagraph, kind: 'paragraph' },
      { id: 'fourth-paragraph', text: manuscript.fourthParagraph, kind: 'paragraph' },
      { id: 'closing-paragraph', text: manuscript.closingParagraph, kind: 'paragraph' },
    ],
    [manuscript],
  );

  const staticHighlights = useMemo(
    () => ({
      'lead-paragraph': [{ phrase: 'phát quang sinh học' }],
      'second-paragraph': [{ phrase: 'ánh sáng lạnh' }],
      'third-paragraph': [
        { phrase: 'luciferin', className: 'text-primary font-medium' },
        { phrase: 'luciferase', className: 'text-primary font-medium' },
      ],
    }),
    [],
  );

  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getSpeechVoices());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() =>
    pickPreferredVoice(getSpeechVoices())?.voiceURI ?? '',
  );
  const [rate, setRate] = useState<number>(SPEECH_SPEEDS[1]);
  const [activeBoundary, setActiveBoundary] = useState<SpeechBoundaryEvent | null>(null);
  const [reliability, setReliability] = useState<BoundaryReliability>('unknown');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    controller.attachCallbacks({
      onStatusChange: (nextStatus, message) => {
        setStatus(nextStatus);
        setErrorMessage(nextStatus === 'error' ? message : undefined);
        if (nextStatus === 'stopped' || nextStatus === 'ended' || nextStatus === 'error') {
          setActiveBoundary(null);
          setCurrentSegmentIndex(0);
        }
      },
      onBoundary: (boundary) => {
        setActiveBoundary(boundary);
        setCurrentSegmentIndex(boundary.segmentIndex);
      },
      onVoicesChange: (nextVoices) => {
        setVoices(nextVoices);
        setSelectedVoiceURI((current) => {
          if (current && nextVoices.some((voice) => voice.voiceURI === current)) return current;
          const preferred = pickPreferredVoice(nextVoices);
          return preferred?.voiceURI ?? '';
        });
      },
      onBoundaryReliabilityChange: (nextReliability) => {
        setReliability(nextReliability);
        if (nextReliability === 'unreliable') {
          setActiveBoundary(null);
        }
      },
    });
    return () => {
      controller.destroy();
      controller.detachCallbacks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscript.id]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === selectedVoiceURI) ?? pickPreferredVoice(voices),
    [voices, selectedVoiceURI],
  );

  const handlePlay = () => {
    if (!supported) return;
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
    controller.speak({ segments, startIndex: 0, startOffset: 0, rate, voice: selectedVoice ?? null });
  };

  const handlePause = () => controller.pause();
  const handleResume = () => controller.resume();
  const handleStop = () => {
    controller.stop();
    setActiveBoundary(null);
    setCurrentSegmentIndex(0);
  };

  const handleRateCycle = () => {
    if (!supported) return;
    const nextIndex = (SPEECH_SPEEDS.indexOf(rate as (typeof SPEECH_SPEEDS)[number]) + 1) % SPEECH_SPEEDS.length;
    const nextRate = SPEECH_SPEEDS[nextIndex] ?? 1;
    setRate(nextRate);
    if (statusRef.current === 'speaking' || statusRef.current === 'paused') {
      controller.restartFromLastPosition(nextRate, selectedVoice ?? null);
    }
  };

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    if (!supported) return;
    const nextVoice = voices.find((voice) => voice.voiceURI === voiceURI) ?? null;
    if (statusRef.current === 'speaking' || statusRef.current === 'paused') {
      controller.restartFromLastPosition(rate, nextVoice);
    }
  };

  const progressLabel = useMemo(() => {
    if (!supported || status === 'idle' || status === 'ended' || status === 'stopped') return undefined;
    return `Đoạn ${Math.min(currentSegmentIndex + 1, segments.length)}/${segments.length}`;
  }, [supported, status, currentSegmentIndex, segments.length]);

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
              <AudioPlayerCapsule
                status={status}
                reliability={reliability}
                voices={voices}
                selectedVoiceURI={selectedVoiceURI}
                hasVietnameseVoice={hasVietnameseVoice(voices)}
                rate={rate}
                errorMessage={errorMessage}
                progressLabel={progressLabel}
                onPlay={handlePlay}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onRateCycle={handleRateCycle}
                onVoiceChange={handleVoiceChange}
              />
            </div>

            <ReadingText
              segments={segments}
              activeBoundary={reliability === 'unreliable' ? null : activeBoundary}
              staticHighlights={staticHighlights}
              figureSlot={
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
              }
            />

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
