import React, { useCallback, useEffect, useRef } from 'react';
import Vivus from 'vivus';
import { GLYPHS, type GlyphFontStyle } from '../../data/phonics/glyphData';

export interface StrokeGuideProps {
  symbol: string;
  fontStyle?: GlyphFontStyle;
  strokeColor?: string;
  strokeWidth?: number;
  speed?: number; // 0.5, 1.0, 2.0
  soundType?: 'consonant' | 'vowel';
  strokeDescription?: string;
  onPlaySound?: () => void;
  className?: string;
}

const DEFAULT_STROKE_DESCRIPTIONS: Record<string, string> = {
  c: 'Nét cong hở phải (1 nét liền)',
  a: 'Nét cong kín và nét móc ngược (2 nét)',
  o: 'Nét cong kín (1 nét liền)',
  ô: 'Nét cong kín và dấu mũ (3 nét)',
};

export const StrokeGuide: React.FC<StrokeGuideProps> = ({
  symbol,
  fontStyle = 'sans',
  strokeColor = '#094cb2',
  strokeWidth = 14,
  speed = 1.0,
  strokeDescription,
  onPlaySound,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const vivusRef = useRef<Vivus | null>(null);

  // Tính số frames dựa trên speed: 1.0x -> 90 frames; 0.5x -> 180 frames; 2.0x -> 45 frames
  const frames = Math.round(90 / speed);

  const character = symbol.toLowerCase().trim() || 'c';
  const glyph = (GLYPHS[fontStyle] && GLYPHS[fontStyle][character]) || GLYPHS.sans[character];
  const missingGlyph = !glyph;
  const desc = strokeDescription || DEFAULT_STROKE_DESCRIPTIONS[character] || 'Nét vẽ hướng dẫn';

  // Lấy toạ độ điểm bắt đầu của nét 1 để đánh dấu ①
  const firstStroke = glyph?.strokes[0];
  let startX = 0;
  let startY = 0;
  if (firstStroke) {
    const match = firstStroke.d.match(/^M\s*([-\d.]+)[,\s]+([-\d.]+)/i);
    if (match) {
      startX = parseFloat(match[1]);
      startY = parseFloat(match[2]);
    }
  }

  // Tính toán bounding box / viewBox
  const padding = strokeWidth + 14;
  const totalWidth = glyph ? glyph.advance + padding * 2 : 120;
  const totalHeight = 100 + padding * 1.5;
  const viewBoxStr = `${-padding} ${-padding / 2} ${totalWidth} ${totalHeight}`;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !glyph) return;

    vivusRef.current?.destroy();
    vivusRef.current = null;
    svg.replaceChildren();

    // Dựng các đường nét hoạt hình chính vào SVG
    glyph.strokes.forEach((stroke, idx) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', stroke.d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', String(strokeWidth));
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('data-stroke-index', String(idx + 1));
      svg.appendChild(path);
    });

    if (typeof svg.querySelector('path')?.getTotalLength !== 'function') return;

    vivusRef.current = new Vivus(svg as unknown as HTMLElement, {
      type: 'oneByOne',
      duration: frames,
      animTimingFunction: Vivus.LINEAR,
      pathTimingFunction: Vivus.LINEAR,
      start: 'autostart',
    });
  }, [glyph, strokeColor, strokeWidth, frames]);

  useEffect(() => {
    return () => {
      vivusRef.current?.destroy();
    };
  }, []);

  // Hành động "Phát lại": phát âm thanh và chạy lại hoạt hình Vivus từ đầu
  const handleReplay = useCallback(() => {
    onPlaySound?.();
    vivusRef.current?.stop().reset().play();
  }, [onPlaySound]);

  // Keyboard shortcut: Space để phát lại
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInteractive =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'BUTTON';

      if (e.code === 'Space' && !isInteractive) {
        e.preventDefault();
        handleReplay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReplay]);

  return (
    <div
      className={`w-full h-full bg-surface-container-lowest rounded-2xl p-5 flex flex-col items-center justify-between shadow-xs relative overflow-hidden select-none ${className}`}
    >
      {/* 1. Header trên: Loại nét & Điểm bắt đầu */}
      <div className="w-full flex items-center justify-between shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-label font-semibold">
          <span className="material-symbols-outlined text-primary text-[16px]">draw</span>
          <span>{desc}</span>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-outline font-label">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-xs" />
          <span>Điểm bắt đầu nét ①</span>
        </div>
      </div>

      {/* 2. Khung vẽ chính: Chữ lớn ở giữa màn hình */}
      <div className="relative flex-1 flex items-center justify-center w-full min-h-0 my-1">
        <div className="relative flex items-center justify-center w-full max-w-[680px] h-full max-h-[480px]">
          {/* Lưới toạ độ chấm mờ nền */}
          <svg
            className="absolute inset-0 w-full h-full text-surface-container opacity-60 pointer-events-none"
            viewBox="0 0 680 480"
            aria-hidden="true"
          >
            <line stroke="currentColor" strokeDasharray="5 5" strokeWidth="1.5" x1="40" x2="640" y1="240" y2="240" />
            <line stroke="currentColor" strokeDasharray="5 5" strokeWidth="1.5" x1="340" x2="340" y1="30" y2="450" />
          </svg>

          {/* SVG 1: Nét mờ định hướng (Ghost guide background) luôn hiển thị tĩnh làm khuôn chữ */}
          {glyph && (
            <svg
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
              viewBox={viewBoxStr}
              aria-hidden="true"
            >
              {glyph.strokes.map((stroke, idx) => (
                <path
                  key={`bg-${idx}`}
                  d={stroke.d}
                  fill="none"
                  stroke={strokeColor}
                  strokeOpacity="0.12"
                  strokeWidth={strokeWidth + 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Điểm bắt đầu nét ① trên khuôn chữ */}
              {firstStroke && (
                <g className="pointer-events-none" transform={`translate(${startX}, ${startY})`}>
                  <circle r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                  <text
                    textAnchor="middle"
                    dy="2"
                    fill="#ffffff"
                    fontSize="5.5"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    1
                  </text>
                </g>
              )}
            </svg>
          )}

          {/* SVG 2: Nét vẽ hoạt hình chính do Vivus điều khiển */}
          <svg
            ref={svgRef}
            role="img"
            aria-label={`Hoạt hình hướng dẫn vẽ nét chữ ${character}`}
            viewBox={viewBoxStr}
            className="absolute inset-0 w-full h-full overflow-visible drop-shadow-sm pointer-events-none"
          />

          {missingGlyph && (
            <p role="status" className="absolute bottom-4 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              Chưa có nét cho chữ này
            </p>
          )}
        </div>
      </div>

      {/* 3. Nút "Phát lại" */}
      <div className="flex justify-center shrink-0 pt-1">
        <button
          type="button"
          onClick={handleReplay}
          aria-label="Phát lại"
          title="Phát lại âm thanh và nét vẽ (Phím Space)"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-white font-headline font-semibold hover:bg-primary-hover shadow-xs hover:shadow transition-all text-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
        >
          <span className="material-symbols-outlined text-[18px]">replay</span>
          <span>Phát lại</span>
          <span className="text-[11px] font-normal opacity-75 font-label ml-0.5">(Phím Space)</span>
        </button>
      </div>
    </div>
  );
};