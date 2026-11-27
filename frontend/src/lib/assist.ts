import { apiFetch } from './api';

export interface WordSelection {
  segmentId: string;
  contextText: string;
  selectedText: string;
  start: number;
  end: number;
  rect: { left: number; top: number; bottom: number };
}

export interface ExplanationResponse {
  documentId: string;
  contentVersion: string;
  segmentId: string;
  start: number;
  end: number;
  term: string;
  meaning: string;
  example: string;
  cached: boolean;
}

export async function contentVersion(blocks: Array<{ id: string; text: string }>): Promise<string> {
  const source = JSON.stringify(blocks.map((block) => [block.id, block.text]));
  const bytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const explainWord = (
  data: Omit<ExplanationResponse, 'term' | 'meaning' | 'example' | 'cached'> & {
    contextText: string;
    selectedText: string;
  },
  signal: AbortSignal,
) => apiFetch<ExplanationResponse>('/assist/explain', {
  method: 'POST',
  body: JSON.stringify(data),
  signal,
});
