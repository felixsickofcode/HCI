import { SpeechController } from './speech';
import type { ReadingSegment, SpeechCallbacks, SpeechStatus } from './speech';
import { ServerSpeechController } from './server-speech';

export type SpeechSource = 'server' | 'browser';

interface ProxySpeakOptions {
  segments: ReadingSegment[];
  startIndex?: number;
  startOffset?: number;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  /** Giọng của máy chủ (ví dụ `vi-VN-NamMinhNeural`); bỏ trống thì dùng mặc định. */
  serverVoice?: string;
}

/**
 * Chọn nguồn giọng đọc: ưu tiên audio của máy chủ (`edge-tts`), tự lùi về
 * Web Speech API của trình duyệt khi máy chủ chưa sẵn sàng hoặc mất mạng.
 * Cùng giao diện với `SpeechController` nên trang đọc không phải đổi UI.
 */
export class SpeechProxy {
  private browser = new SpeechController();
  private server = new ServerSpeechController();
  private callbacks: SpeechCallbacks = {};
  private source: SpeechSource | null = null;
  private lastVoice: SpeechSynthesisVoice | null = null;
  private lastServerVoice: string | undefined;

  attachCallbacks(callbacks: SpeechCallbacks) {
    this.callbacks = callbacks;
    this.browser.attachCallbacks(callbacks);
    this.server.attachCallbacks(callbacks);
  }

  detachCallbacks() {
    this.callbacks = {};
    this.browser.detachCallbacks();
    this.server.detachCallbacks();
  }

  getSource(): SpeechSource | null {
    return this.source;
  }

  getServerVoice(): string | undefined {
    return this.lastServerVoice;
  }

  getStatus(): SpeechStatus {
    return this.source === 'server' ? this.server.getStatus() : this.browser.getStatus();
  }

  speak(options: ProxySpeakOptions) {
    this.lastVoice = options.voice;
    if (options.serverVoice) this.lastServerVoice = options.serverVoice;
    this.source = 'server';
    this.server
      .speak({
        segments: options.segments,
        startIndex: options.startIndex,
        startOffset: options.startOffset,
        rate: options.rate,
        voice: this.lastServerVoice,
      })
      .then(() => {
        if (this.source === 'server') this.callbacks.onSourceChange?.('server');
      })
      .catch((cause: unknown) => {
        // Máy chủ chưa có endpoint, chưa cài edge-tts, hết phiên hoặc mất mạng.
        this.source = 'browser';
        const reason = cause instanceof Error && cause.message
          ? cause.message
          : 'Máy chủ giọng đọc chưa sẵn sàng';
        this.callbacks.onSourceChange?.('browser', reason);
        this.browser.speak(options);
      });
  }

  pause() {
    if (this.source === 'server') this.server.pause();
    else this.browser.pause();
  }

  resume() {
    if (this.source === 'server') this.server.resume();
    else this.browser.resume();
  }

  stop() {
    this.server.stop();
    this.browser.stop();
  }

  restartFromLastPosition(rate: number, voice: SpeechSynthesisVoice | null, serverVoice?: string) {
    if (this.source === 'server') {
      if (serverVoice) this.lastServerVoice = serverVoice;
      this.server.restartFromLastPosition(rate, this.lastServerVoice);
    } else this.browser.restartFromLastPosition(rate, voice ?? this.lastVoice);
  }

  destroy() {
    this.server.destroy();
    this.browser.destroy();
  }
}
