import { fetchSpeech } from './tts';
import type { SpeechAudio, SpeechMark } from './tts';
import type {
  BoundaryReliability,
  ReadingSegment,
  SpeechBoundaryEvent,
  SpeechCallbacks,
  SpeechStatus,
} from './speech';

export class ServerSpeechError extends Error {
  constructor(message = 'Không lấy được giọng đọc từ máy chủ') {
    super(message);
    this.name = 'ServerSpeechError';
  }
}

interface SpeakOptions {
  voice?: string;
  segments: ReadingSegment[];
  startIndex?: number;
  rate: number;
  startOffset?: number;
}

/**
 * Đọc thành tiếng bằng audio của máy chủ (`POST /tts/speech`).
 * Cùng giao diện với `SpeechController` để trang đọc chuyển nguồn mà không đổi UI.
 */
export class ServerSpeechController {
  private callbacks: SpeechCallbacks = {};
  private status: SpeechStatus = 'idle';
  private segments: ReadingSegment[] = [];
  private segmentIndex = 0;
  private rate = 1;
  private voice: string | undefined;
  private generation = 0;
  private audio: HTMLAudioElement | null = null;
  private marks: SpeechMark[] = [];
  private markIndex = 0;
  private frame = 0;

  attachCallbacks(callbacks: SpeechCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  detachCallbacks() {
    this.callbacks = {};
  }

  getStatus(): SpeechStatus {
    return this.status;
  }

  getBoundaryReliability(): BoundaryReliability {
    return this.marks.length ? 'reliable' : 'unreliable';
  }

  getCurrentSegmentIndex(): number {
    return this.segmentIndex;
  }

  async speak(options: SpeakOptions) {
    const segments = options.segments.filter((segment) => segment.text.trim().length > 0);
    if (!segments.length) {
      this.setStatus('error', 'Không có nội dung để đọc.');
      return;
    }
    this.stopAudio();
    const generation = ++this.generation;
    this.segments = segments;
    this.segmentIndex = Math.min(Math.max(options.startIndex ?? 0, 0), segments.length - 1);
    this.rate = options.rate;
    this.voice = options.voice;
    this.setStatus('speaking');
    await this.loadAndPlay(generation);
  }

  pause() {
    if (this.status !== 'speaking' || !this.audio) return;
    this.audio.pause();
    this.stopFrame();
    this.setStatus('paused');
  }

  resume() {
    if (this.status !== 'paused' || !this.audio) return;
    void this.audio.play().catch(() => this.setStatus('error', 'Không phát tiếp được giọng đọc.'));
    this.startFrame();
    this.setStatus('speaking');
  }

  stop() {
    this.generation += 1;
    this.stopAudio();
    this.setStatus('stopped');
  }

  destroy() {
    this.generation += 1;
    this.stopAudio();
    this.callbacks = {};
  }

  restartFromLastPosition(rate: number, voice?: string, startIndex = this.segmentIndex) {
    if (!this.segments.length) return;
    this.rate = rate;
    if (voice) this.voice = voice;
    void this.speak({ segments: this.segments, startIndex, rate, voice: this.voice });
  }

  private async loadAndPlay(generation: number) {
    const segment = this.segments[this.segmentIndex];
    if (!segment) {
      this.setStatus('ended');
      return;
    }
    let audio: SpeechAudio;
    try {
      audio = await fetchSpeech(segment.text, this.rateToPercent(), undefined, this.voice);
    } catch (cause) {
      if (generation !== this.generation) return;
      throw cause instanceof ServerSpeechError ? cause : new ServerSpeechError(
        cause instanceof Error ? cause.message : undefined,
      );
    }
    if (generation !== this.generation) return;

    this.marks = audio.marks;
    this.markIndex = 0;
    const element = new Audio(audio.url);
    this.audio = element;
    element.onended = () => {
      if (generation !== this.generation) return;
      this.advance();
    };
    element.onerror = () => {
      if (generation !== this.generation) return;
      this.setStatus('error', 'Không phát được audio của giọng đọc.');
    };
    try {
      await element.play();
    } catch {
      if (generation === this.generation) this.setStatus('error', 'Trình duyệt chặn phát audio.');
      return;
    }
    if (generation !== this.generation) return;
    this.emitBoundary(segment, 0);
    this.startFrame();
  }

  private rateToPercent() {
    return Math.round((this.rate - 1) * 100);
  }

  private advance() {
    this.stopFrame();
    if (this.segmentIndex + 1 < this.segments.length) {
      this.segmentIndex += 1;
      this.markIndex = 0;
      void this.loadAndPlay(this.generation);
    } else {
      this.segmentIndex = 0;
      this.setStatus('ended');
    }
  }

  private startFrame() {
    this.stopFrame();
    const tick = () => {
      if (!this.audio || this.status !== 'speaking') return;
      const elapsed = this.audio.currentTime * 1000;
      const segment = this.segments[this.segmentIndex];
      while (this.markIndex + 1 < this.marks.length && this.marks[this.markIndex + 1].offsetMs <= elapsed) {
        this.markIndex += 1;
        this.emitBoundary(segment, this.markIndex);
      }
      this.frame = window.requestAnimationFrame(tick);
    };
    this.frame = window.requestAnimationFrame(tick);
  }

  private stopFrame() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private emitBoundary(segment: ReadingSegment, index: number) {
    const mark = this.marks[index];
    if (!mark || !segment) return;
    const event: SpeechBoundaryEvent = {
      segmentId: segment.id,
      segmentIndex: this.segmentIndex,
      charIndex: (segment.sourceOffset ?? 0) + mark.charIndex,
      charLength: mark.charLength,
    };
    this.callbacks.onBoundary?.(event);
  }

  private stopAudio() {
    this.stopFrame();
    if (!this.audio) return;
    this.audio.onended = null;
    this.audio.onerror = null;
    this.audio.pause();
    this.audio = null;
  }

  private setStatus(status: SpeechStatus, message?: string) {
    this.status = status;
    this.callbacks.onStatusChange?.(status, message);
  }
}
