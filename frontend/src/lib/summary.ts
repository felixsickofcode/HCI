import { apiFetch } from './api';
import type { ReadingBlock } from './document';

export interface SummarySegment {
  id: string;
  text: string;
}

export interface SummaryItem {
  id: string;
  text: string;
  sources: string[];
}

export interface SummarizeResponse {
  documentId: string;
  contentVersion: string;
  method: 'extractive' | 'llm';
  items: SummaryItem[];
  variants?: SummaryVariant[];
}

export type SummaryLength = 'short' | 'medium' | 'long';

export interface SummaryVariant {
  length: SummaryLength;
  items: SummaryItem[];
}

export function toSummarySegments(
  blocks: ReadingBlock[],
): SummarySegment[] {
  return blocks
    .filter((block) =>
      block.text.trim().length > 0 &&
      block.type !== 'table' &&
      block.type !== 'snapshot'
    )
    .map((block) => ({
      id: block.id,
      text: block.text,
    }));
}

export function summarizeDocument(
  documentId: string,
  segments: SummarySegment[],
  method: 'extractive' | 'llm' = 'extractive',
  length: SummaryLength = 'medium',
  signal?: AbortSignal,
): Promise<SummarizeResponse> {
  return apiFetch<SummarizeResponse>('/assist/summarize', {
    method: 'POST',
    body: JSON.stringify({
      documentId,
      segments,
      method,
      length,
    }),
    signal,
  });
}
