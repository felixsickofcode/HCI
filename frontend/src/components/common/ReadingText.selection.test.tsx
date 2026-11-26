import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReadingText } from './ReadingText';

describe('FR06 word selection', () => {
  it('uses the clicked occurrence instead of the first matching word', () => {
    const choose = vi.fn();
    render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: 'sinh học và sinh học' }]}
      activeBoundary={null}
      onWordSelection={choose}
    />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Chọn sinh để giải nghĩa' })[1]);
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({
      segmentId: 'block-1', selectedText: 'sinh', start: 12, end: 16,
    }));
  });

  it('supports Enter on a focused word without changing TTS content', () => {
    const choose = vi.fn();
    render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: '😀 sinh học' }]}
      activeBoundary={{ segmentId: 'block-1', segmentIndex: 0, charIndex: 3, charLength: 4 }}
      onWordSelection={choose}
    />);
    const token = screen.getByRole('button', { name: 'Chọn sinh để giải nghĩa' });
    fireEvent.keyDown(token, { key: 'Enter' });
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({
      selectedText: 'sinh', start: 3, end: 7,
    }));
    expect(token).toHaveAttribute('aria-current', 'true');
  });

  it('tabs by block, then moves between words with arrow keys', () => {
    const choose = vi.fn();
    const { container } = render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: 'sinh học' }]}
      activeBoundary={null}
      onWordSelection={choose}
    />);
    const paragraph = container.querySelector('p')!;
    const sinh = screen.getByRole('button', { name: 'Chọn sinh để giải nghĩa' });
    const hoc = screen.getByRole('button', { name: 'Chọn học để giải nghĩa' });
    expect(paragraph).toHaveAttribute('tabindex', '0');
    expect(sinh).toHaveAttribute('tabindex', '-1');
    paragraph.focus();
    fireEvent.keyDown(paragraph, { key: 'Enter' });
    expect(sinh).toHaveFocus();
    fireEvent.keyDown(sinh, { key: 'ArrowRight' });
    expect(hoc).toHaveFocus();
    fireEvent.keyDown(hoc, { key: 'Enter' });
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({ selectedText: 'học', start: 5, end: 8 }));
  });

  it('keeps the exact range of a selected multi-syllable phrase', () => {
    const choose = vi.fn();
    const { container } = render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: 'sinh học và sinh học' }]}
      activeBoundary={null}
      onWordSelection={choose}
    />);
    const tokens = container.querySelectorAll<HTMLElement>('[data-token-start]');
    const range = document.createRange();
    range.setStart(tokens[3].firstChild!, 0);
    range.setEnd(tokens[4].firstChild!, 3);
    Object.defineProperty(range, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, bottom: 30 }),
    });
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    fireEvent.mouseUp(container.querySelector('p')!);
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({
      selectedText: 'sinh học', start: 12, end: 20,
    }));
    window.getSelection()?.removeAllRanges();
  });

  it('reports the clicked block segment through onSegmentClick', () => {
    const onSegmentClick = vi.fn();
    render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: 'Nội dung nguồn' }]}
      activeBoundary={null}
      onSegmentClick={onSegmentClick}
    />);

    const paragraph = document.querySelector('p');
    expect(paragraph).not.toBeNull();
    fireEvent.click(paragraph!);

    expect(onSegmentClick).toHaveBeenCalledWith('block-1');
  });

  it('keeps a trailing combining accent when clicking a word', () => {
    const choose = vi.fn();
    render(<ReadingText
      blocks={[{ id: 'block-1', type: 'paragraph', text: 'họ.' }]}
      activeBoundary={null}
      onWordSelection={choose}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Chọn họ. để giải nghĩa' }));
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({
      selectedText: 'họ', start: 0, end: 3,
    }));
  });
});
