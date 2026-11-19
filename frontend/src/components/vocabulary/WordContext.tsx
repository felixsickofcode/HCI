import type { VocabularyEntry } from '../../lib/vocabulary';

function sentenceBounds(text: string, start: number, end: number): [number, number] {
  // Both DOM Range offsets and Intl.Segmenter indices use UTF-16 code units.
  const sentences = typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter('vi', { granularity: 'sentence' }).segment(text), part => part.index)
    : Array.from(text.matchAll(/[^.!?…\n]+[.!?…]*|\n+/gu), match => match.index);
  const left = sentences.findLast(index => index <= start) ?? 0;
  const right = sentences.find(index => index >= end) ?? text.length;
  return [left, right];
}

export function WordContext({ entry }: { entry: VocabularyEntry }) {
  const { contextText: text, term } = entry;
  let { start, end } = entry;
  if (start == null || end == null || text.slice(start, end) !== term) {
    // Older imports without offsets can be highlighted only if the match is unambiguous.
    const index = text.indexOf(term);
    if (index < 0 || index !== text.lastIndexOf(term)) return <blockquote className="mt-3 whitespace-pre-wrap break-words">{text}</blockquote>;
    start = index;
    end = index + term.length;
  }
  const [left, right] = sentenceBounds(text, start, end);
  const highlight = <mark className="rounded bg-amber-100 px-0.5 font-semibold text-slate-900">{text.slice(start, end)}</mark>;
  return <div className="mt-3 whitespace-pre-wrap break-words leading-relaxed">
    <blockquote>{text.slice(left, start)}{highlight}{text.slice(end, right).trimEnd()}</blockquote>
    {(text.slice(0, left).trim() || text.slice(right).trim()) && <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-primary">Xem cả đoạn</summary>
      <blockquote className="mt-2 rounded-xl bg-surface-container-low p-3">{text.slice(0, start)}{highlight}{text.slice(end)}</blockquote>
    </details>}
  </div>;
}
