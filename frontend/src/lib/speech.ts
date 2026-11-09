export interface ReadingSegment {
  id: string;
  text: string;
  kind: 'paragraph' | 'quote';
}

export type SpeechStatus =
  | 'idle'
  | 'speaking'
  | 'paused'
  | 'stopped'
  | 'ended'
  | 'unsupported'
  | 'error';

export type BoundaryReliability = 'unknown' | 'reliable' | 'unreliable';

export interface SpeechBoundaryEvent {
  segmentId: string;
  segmentIndex: number;
  charIndex: number;
  charLength: number;
}

export interface SpeechCallbacks {
  onStatusChange?: (status: SpeechStatus, message?: string) => void;
  onBoundary?: (boundary: SpeechBoundaryEvent) => void;
  onVoicesChange?: (voices: SpeechSynthesisVoice[]) => void;
  onBoundaryReliabilityChange?: (reliability: BoundaryReliability) => void;
}

export const SPEECH_SPEEDS = [0.8, 1.0, 1.2, 1.5] as const;
export const SPEECH_LANGUAGE = 'vi-VN';

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function getSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  return sortVoices(voices);
}

export function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const rank = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase();
    if (lang === 'vi-vn') return 0;
    if (lang.startsWith('vi')) return 1;
    if (voice.default) return 2;
    return 3;
  };
  return [...voices].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'vi'));
}

export function pickPreferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const sorted = sortVoices(voices);
  return sorted[0] ?? null;
}

export function hasVietnameseVoice(voices: SpeechSynthesisVoice[]): boolean {
  return voices.some((voice) => voice.lang.toLowerCase().startsWith('vi'));
}

export class SpeechController {
  private status: SpeechStatus = 'idle';
  private reliability: BoundaryReliability = 'unknown';
  private segments: ReadingSegment[] = [];
  private segmentIndex = 0;
  private rate = 1;
  private voice: SpeechSynthesisVoice | null = null;
  private callbacks: SpeechCallbacks = {};
  private manualStop = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private lastBoundary: SpeechBoundaryEvent | null = null;
  private reliableBoundarySeen = false;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private voicesHandler: (() => void) | null = null;
  private voicesRetryTimer: ReturnType<typeof setInterval> | null = null;

  attachCallbacks(callbacks: SpeechCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (isSpeechSupported()) {
      const publishVoices = () => {
        const voices = getSpeechVoices();
        this.callbacks.onVoicesChange?.(voices);
        return voices;
      };

      // Some browsers populate voices before firing `voiceschanged`.
      // Publish the current list immediately, then retry briefly while the
      // browser finishes loading its speech services.
      const initialVoices = publishVoices();
      if (initialVoices.length === 0) {
        let attempts = 0;
        this.voicesRetryTimer = setInterval(() => {
          attempts += 1;
          const voices = publishVoices();
          if (voices.length > 0 || attempts >= 20) {
            this.clearVoicesRetryTimer();
          }
        }, 250);
      }
      this.voicesHandler = () => {
        publishVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', this.voicesHandler);
    }
  }

  detachCallbacks() {
    this.clearVoicesRetryTimer();
    if (this.voicesHandler && isSpeechSupported()) {
      window.speechSynthesis.removeEventListener('voiceschanged', this.voicesHandler);
    }
    this.voicesHandler = null;
    this.callbacks = {};
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  getBoundaryReliability(): BoundaryReliability {
    return this.reliability;
  }

  getLastBoundary(): SpeechBoundaryEvent | null {
    return this.lastBoundary;
  }

  getCurrentSegmentIndex(): number {
    return this.segmentIndex;
  }

  speak(options: {
    segments: ReadingSegment[];
    startIndex?: number;
    startOffset?: number;
    rate: number;
    voice: SpeechSynthesisVoice | null;
  }) {
    if (!isSpeechSupported()) {
      this.setStatus('unsupported', 'Trình duyệt không hỗ trợ Web Speech API (speechSynthesis).');
      return;
    }
    const cleanSegments = options.segments.filter((segment) => segment.text.trim().length > 0);
    if (cleanSegments.length === 0) {
      this.setStatus('error', 'Không có nội dung để đọc.');
      return;
    }
    this.cancelUtterances();
    this.segments = cleanSegments;
    this.segmentIndex = Math.min(
      Math.max(options.startIndex ?? 0, 0),
      cleanSegments.length - 1,
    );
    this.rate = options.rate;
    this.voice = options.voice;
    this.manualStop = false;
    this.reliableBoundarySeen = false;
    this.lastBoundary = null;
    this.speakCurrentSegment(options.startOffset ?? 0);
  }

  pause() {
    if (!isSpeechSupported()) return;
    if (this.status !== 'speaking') return;
    window.speechSynthesis.pause();
    this.setStatus('paused');
  }

  resume() {
    if (!isSpeechSupported()) return;
    if (this.status !== 'paused') return;
    window.speechSynthesis.resume();
    this.setStatus('speaking');
  }

  stop() {
    if (!isSpeechSupported()) return;
    this.manualStop = true;
    this.clearKeepAlive();
    this.clearFallbackTimer();
    window.speechSynthesis.cancel();
    this.setStatus('stopped');
  }

  destroy() {
    this.stop();
    this.clearKeepAlive();
    this.clearFallbackTimer();
  }

  restartFromLastPosition(rate: number, voice: SpeechSynthesisVoice | null) {
    if (this.segments.length === 0) return;
    const fallbackIndex = this.segmentIndex;
    const fallbackOffset =
      this.lastBoundary && this.lastBoundary.segmentIndex === this.segmentIndex
        ? Math.max(0, this.lastBoundary.charIndex)
        : 0;
    this.speak({
      segments: this.segments,
      startIndex: fallbackIndex,
      startOffset: fallbackOffset,
      rate,
      voice,
    });
  }

  private speakCurrentSegment(startOffset = 0) {
    if (!isSpeechSupported()) return;
    const segment = this.segments[this.segmentIndex];
    if (!segment) {
      this.handleFinished();
      return;
    }
    const safeOffset = Math.min(Math.max(startOffset, 0), Math.max(segment.text.length - 1, 0));
    const text = segment.text.slice(safeOffset);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANGUAGE;
    utterance.rate = this.rate;
    if (this.voice) utterance.voice = this.voice;
    let utteranceEnded = false;
    const markEnded = () => {
      utteranceEnded = true;
    };

    const segmentIndexAtStart = this.segmentIndex;
    const segmentIdAtStart = segment.id;

    utterance.onstart = () => {
      this.setStatus('speaking');
      this.startKeepAlive();
      this.scheduleFallbackCheck(() => utteranceEnded);
    };

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      const charIndex = event.charIndex + safeOffset;
      const charLength = event.charLength ?? 0;
      const eventName = (event as SpeechSynthesisEvent & { name?: unknown }).name;
      const isWordBoundary =
        eventName === 'word' || (typeof charLength === 'number' && charLength > 1);
      if (isWordBoundary && charLength > 0) {
        this.reliableBoundarySeen = true;
        if (this.reliability !== 'reliable') {
          this.setReliability('reliable');
        }
        const boundary: SpeechBoundaryEvent = {
          segmentId: segmentIdAtStart,
          segmentIndex: segmentIndexAtStart,
          charIndex,
          charLength,
        };
        this.lastBoundary = boundary;
        this.callbacks.onBoundary?.(boundary);
      } else if (this.reliability === 'unknown') {
        this.setReliability('unreliable');
      }
    };

    utterance.onpause = () => {
      if (!this.manualStop) this.setStatus('paused');
    };

    utterance.onresume = () => {
      if (!this.manualStop) this.setStatus('speaking');
    };

    utterance.onend = () => {
      markEnded();
      this.clearKeepAlive();
      this.clearFallbackTimer();
      if (this.manualStop) return;
      this.advanceToNextSegment();
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      markEnded();
      this.clearKeepAlive();
      this.clearFallbackTimer();
      if (this.manualStop || event.error === 'canceled' || event.error === 'interrupted') return;
      const messages: Record<string, string> = {
        'audio-capture': 'Không thể ghi âm giọng đọc.',
        'audio-unavailable': 'Âm thanh giọng đọc không khả dụng.',
        'network': 'Lỗi mạng khi đọc giọng.',
        'not-allowed': 'Trình duyệt không cho phép đọc giọng.',
        'service-not-allowed': 'Dịch vụ giọng đọc không được phép.',
        'speech-synthesis-not-supported': 'Trình duyệt không hỗ trợ tổng hợp giọng nói.',
        'syntax-undefined': 'Văn bản đọc không hợp lệ.',
        'text-too-long': 'Đoạn văn quá dài để đọc.',
        'invalid-voice': 'Giọng đọc đã chọn không hợp lệ.',
        language_unavailable: 'Ngôn ngữ vi-VN không khả dụng.',
        'voice-unavailable': 'Giọng đọc không khả dụng.',
      };
      this.setStatus('error', messages[event.error] ?? `Lỗi giọng đọc: ${event.error}`);
    };

    window.speechSynthesis.speak(utterance);
  }

  private advanceToNextSegment() {
    if (this.segmentIndex + 1 < this.segments.length) {
      this.segmentIndex += 1;
      this.speakCurrentSegment(0);
    } else {
      this.handleFinished();
    }
  }

  private handleFinished() {
    this.lastBoundary = null;
    this.segmentIndex = 0;
    this.clearKeepAlive();
    this.clearFallbackTimer();
    this.setStatus('ended');
  }

  private scheduleFallbackCheck(isEnded: () => boolean) {
    this.clearFallbackTimer();
    this.fallbackTimer = setTimeout(() => {
      if (isEnded()) return;
      if (!this.reliableBoundarySeen && this.reliability === 'unknown') {
        this.setReliability('unreliable');
      }
    }, 6000);
    if (typeof this.fallbackTimer === 'object' && 'unref' in this.fallbackTimer) {
      (this.fallbackTimer as { unref: () => void }).unref();
    }
  }

  private startKeepAlive() {
    this.clearKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (!isSpeechSupported()) return;
      if (this.status === 'speaking' && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        // Chrome can stall on long utterances; a periodic resume keeps playback alive.
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private clearKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private clearFallbackTimer() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private clearVoicesRetryTimer() {
    if (this.voicesRetryTimer) {
      clearInterval(this.voicesRetryTimer);
      this.voicesRetryTimer = null;
    }
  }

  private cancelUtterances() {
    if (!isSpeechSupported()) return;
    this.manualStop = false;
    this.clearKeepAlive();
    this.clearFallbackTimer();
    window.speechSynthesis.cancel();
  }

  private setStatus(status: SpeechStatus, message?: string) {
    this.status = status;
    this.callbacks.onStatusChange?.(status, message);
  }

  private setReliability(reliability: BoundaryReliability) {
    this.reliability = reliability;
    this.callbacks.onBoundaryReliabilityChange?.(reliability);
  }
}
