import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SpeechController } from './speech';

let controller: SpeechController;
let utterances: SpeechSynthesisUtterance[];

beforeEach(() => {
  utterances = [];
  vi.useFakeTimers();
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    text: string;
    constructor(text: string) { this.text = text; }
  });
  vi.stubGlobal('speechSynthesis', {
    cancel: vi.fn(), pause: vi.fn(), resume: vi.fn(),
    getVoices: () => [], addEventListener: vi.fn(), removeEventListener: vi.fn(),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => utterances.push(utterance)),
  });
  controller = new SpeechController();
});
afterEach(() => {
  controller.detachCallbacks();
  controller.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fire(utterance: SpeechSynthesisUtterance, name: 'start' | 'end' | 'boundary', data = {}) {
  const handler = utterance[`on${name}`] as ((event: unknown) => void) | null;
  handler?.(data);
}

it('reads only the excerpt, maps highlight offsets to the original paragraph, then ends', () => {
  const boundary = vi.fn();
  const status = vi.fn();
  controller.attachCallbacks({ onBoundary: boundary, onStatusChange: status });
  controller.speak({ segments: [{ id: 'block-1', text: 'sinh học', kind: 'paragraph', sourceOffset: 12 }], rate: 1, voice: null });
  expect(utterances[0].text).toBe('sinh học');
  fire(utterances[0], 'start');
  fire(utterances[0], 'boundary', { charIndex: 0, charLength: 4, name: 'word' });
  expect(boundary).toHaveBeenCalledWith({ segmentId: 'block-1', segmentIndex: 0, charIndex: 12, charLength: 4 });
  fire(utterances[0], 'end');
  expect(utterances).toHaveLength(1);
  expect(status).toHaveBeenLastCalledWith('ended', undefined);
});

it('keeps rate changes, pause and resume within the excerpt', () => {
  const voice = { voiceURI: 'vi-voice', lang: 'vi-VN' } as SpeechSynthesisVoice;
  controller.speak({ segments: [{ id: 'block-1', text: 'sinh học', kind: 'paragraph', sourceOffset: 12 }], rate: 1, voice: null });
  fire(utterances[0], 'start');
  controller.pause();
  expect(window.speechSynthesis.pause).toHaveBeenCalledOnce();
  controller.resume();
  expect(window.speechSynthesis.resume).toHaveBeenCalledOnce();
  fire(utterances[0], 'boundary', { charIndex: 5, charLength: 3, name: 'word' });
  controller.restartFromLastPosition(1.5, voice);
  expect(utterances[1].text).toBe('học');
  expect(utterances[1].rate).toBe(1.5);
  expect(utterances[1].voice).toBe(voice);
});

it('ignores late events from the full article after starting a selected excerpt', () => {
  const boundary = vi.fn();
  controller.attachCallbacks({ onBoundary: boundary });
  controller.speak({ segments: [{ id: 'old', text: 'Bài cũ', kind: 'paragraph' }], rate: 1, voice: null });
  const old = utterances[0];
  controller.speak({ segments: [{ id: 'new', text: 'Đoạn mới', kind: 'paragraph' }], rate: 1, voice: null });
  fire(old, 'boundary', { charIndex: 0, charLength: 3, name: 'word' });
  fire(old, 'end');
  expect(boundary).not.toHaveBeenCalled();
  expect(controller.getStatus()).not.toBe('ended');
  expect(utterances).toHaveLength(2);
});
