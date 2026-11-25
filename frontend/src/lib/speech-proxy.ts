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
}

/**
 * Chọn nguồn giọng đọc: ưu tiên audio của máy chủ (`edge-tts`), tự lùi về
 * Web Speech API của trình duyệt khi máy chủ chưa sẵn sàng hoặc mất mạng.
 * Cùng giao diện với `SpeechController` nên trang đọc không phải đổi UI.
 */
export class SpeechProxy {
  private browser = new SpeechController();
  private server = new ServerSpeechController();
  private source: SpeechSource | null = null;
  private lastVoice: SpeechSynthesisVoice | null = null;

  attachCallbacks(callbacks: SpeechCallbacks) {
    this.browser.attachCallbacks(callbacks);
    this.server.attachCallbacks(callbacks);
  }

  detachCallbacks() {
    this.browser.detachCallbacks();
    this.server.detachCallbacks();
  }

  getSource(): SpeechSource | null {
    return this.source;
  }

  getStatus(): SpeechStatus {
    return this.source === 'server' ? this.server.getStatus() : this.browser.getStatus();
  }

  speak(options: ProxySpeakOptions) {
    this.lastVoice = options.voice;
    this.source = 'server';
    this.server
      .speak({
        segments: options.segments,
        startIndex: options.startIndex,
        startOffset: options.startOffset,
        rate: options.rate,
      })
      .catch(() => {
        // Máy chủ chưa có endpoint, chưa cài edge-tts, hoặc mất mạng: quay về giọng trình duyệt.
        this.source = 'browser';
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

  restartFromLastPosition(rate: number, voice: SpeechSynthesisVoice | null) {
    if (this.source === 'server') this.server.restartFromLastPosition(rate);
    else this.browser.restartFromLastPosition(rate, voice ?? this.lastVoice);
  }

  destroy() {
    this.server.destroy();
    this.browser.destroy();
  }
}
