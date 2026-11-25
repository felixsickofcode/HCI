import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { alignBoundaries, clearSpeechCache, fetchSpeech } from './tts';

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
});

afterEach(() => { clearSpeechCache(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const respond = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));

const serverPayload = {
  audioBase64: btoa('mp3-bytes'),
  mimeType: 'audio/mpeg',
  voice: 'vi-VN-HoaiMyNeural',
  durationMs: 650,
  boundaries: [
    { text: 'sinh', offsetMs: 0, durationMs: 300 },
    { text: 'học', offsetMs: 300, durationMs: 350 },
  ],
  cached: false,
};

it('maps spoken words back to the right character positions, including repeats', () => {
  const text = 'Em học sinh học.';
  const marks = alignBoundaries(text, [
    { text: 'Em', offsetMs: 0, durationMs: 100 },
    { text: 'học', offsetMs: 100, durationMs: 100 },
    { text: 'sinh', offsetMs: 200, durationMs: 100 },
    { text: 'học', offsetMs: 300, durationMs: 100 },
  ]);
  expect(marks.map((mark) => text.slice(mark.charIndex, mark.charIndex + mark.charLength)))
    .toEqual(['Em', 'học', 'sinh', 'học']);
  expect(marks.map((mark) => mark.charIndex)).toEqual([0, 3, 7, 12]);
});

it('skips words the server reports but the text does not contain', () => {
  const marks = alignBoundaries('Em học.', [
    { text: 'Xyz', offsetMs: 0, durationMs: 100 },
    { text: 'học', offsetMs: 100, durationMs: 100 },
  ]);
  expect(marks).toHaveLength(1);
  expect(marks[0].charIndex).toBe(3);
});

const stubSpeechServer = () => {
  const bodies: unknown[] = [];
  const fetchMock = vi.fn((...args: [RequestInfo | URL, RequestInit?]) => {
    bodies.push(args[1]?.body ? JSON.parse(String(args[1].body)) : null);
    return respond(serverPayload);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, bodies };
};

it('requests speech once per text and rate, then reuses the blob url', async () => {
  const { fetchMock, bodies } = stubSpeechServer();
  const first = await fetchSpeech('Em học sinh học.', 0);
  const second = await fetchSpeech('Em học sinh học.', 0);
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(first.url).toBe('blob:mock');
  expect(second.marks).toHaveLength(2);
  expect(bodies[0]).toMatchObject({ text: 'Em học sinh học.', voice: 'vi-VN-HoaiMyNeural', rate: 0 });
});

it('treats a different rate as a different cache entry', async () => {
  const { fetchMock } = stubSpeechServer();
  await fetchSpeech('Em học.', 0);
  await fetchSpeech('Em học.', 25);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
