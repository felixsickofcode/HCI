import { apiFetch } from './api';

export interface SpeechBoundary {
  text: string;
  offsetMs: number;
  durationMs: number;
}

export interface SpeechResponse {
  audioBase64: string;
  mimeType: string;
  voice: string;
  durationMs: number;
  boundaries: SpeechBoundary[];
  cached: boolean;
}

export interface SpeechAudio {
  url: string;
  mimeType: string;
  voice: string;
  durationMs: number;
  boundaries: SpeechBoundary[];
  /** Mốc từ đã quy về offset ký tự trong câu, dùng để tô sáng chữ đang đọc. */
  marks: SpeechMark[];
}

export interface SpeechMark {
  charIndex: number;
  charLength: number;
  offsetMs: number;
  durationMs: number;
}

export const SERVER_VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'] as const;
export const DEFAULT_SERVER_VOICE = SERVER_VOICES[0];

const CACHE_LIMIT = 20;
const cache = new Map<string, SpeechAudio>();

const cacheKey = (text: string, voice: string, rate: number) => `${voice}|${rate}|${text}`;

/**
 * Ghép mốc từ của máy chủ với vị trí ký tự trong câu.
 * Mốc từ được dò tuần tự nên từ lặp vẫn trỏ đúng lần xuất hiện.
 */
export function alignBoundaries(text: string, boundaries: SpeechBoundary[]): SpeechMark[] {
  const marks: SpeechMark[] = [];
  let cursor = 0;
  for (const boundary of boundaries) {
    const word = boundary.text.trim();
    if (!word) continue;
    const found = text.indexOf(word, cursor);
    if (found < 0) continue;
    marks.push({
      charIndex: found,
      charLength: word.length,
      offsetMs: boundary.offsetMs,
      durationMs: boundary.durationMs,
    });
    cursor = found + word.length;
  }
  return marks;
}

/** Chuyển base64 sang Blob URL để phát bằng thẻ audio. */
function toObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function remember(key: string, audio: SpeechAudio) {
  const oldest = cache.keys().next();
  if (cache.size >= CACHE_LIMIT && !oldest.done) {
    const evicted = cache.get(oldest.value);
    if (evicted) URL.revokeObjectURL(evicted.url);
    cache.delete(oldest.value);
  }
  cache.set(key, audio);
}

export function clearSpeechCache() {
  for (const audio of cache.values()) URL.revokeObjectURL(audio.url);
  cache.clear();
}

/** Lấy audio đọc thành tiếng cho một đoạn; cùng nội dung thì dùng lại Blob đã tải. */
export async function fetchSpeech(
  text: string,
  rate: number,
  signal?: AbortSignal,
  voice: string = DEFAULT_SERVER_VOICE,
): Promise<SpeechAudio> {
  const key = cacheKey(text, voice, rate);
  const hit = cache.get(key);
  if (hit) return hit;

  const response = await apiFetch<SpeechResponse>('/tts/speech', {
    method: 'POST',
    body: JSON.stringify({ text, voice, rate }),
    signal,
  });
  const audio: SpeechAudio = {
    url: toObjectUrl(response.audioBase64, response.mimeType),
    mimeType: response.mimeType,
    voice: response.voice,
    durationMs: response.durationMs,
    boundaries: response.boundaries,
    marks: alignBoundaries(text, response.boundaries),
  };
  remember(key, audio);
  return audio;
}

export interface VoiceListResponse {
  voices: string[];
  default: string;
}

/** Danh sách giọng máy chủ hỗ trợ (endpoint công khai, không cần đăng nhập). */
export const fetchVoices = (signal?: AbortSignal) =>
  apiFetch<VoiceListResponse>('/tts/voices', { signal });
