export type GlyphFontStyle = 'sans' | 'script' | 'italic' | 'mono' | 'lexend' | 'arial' | 'verdana';

export interface GlyphStroke {
  d: string;
}

export interface GlyphDefinition {
  advance: number;
  strokes: GlyphStroke[];
}

export const GLYPH_FONT_LABELS: Record<'lexend' | 'arial' | 'verdana', string> = {
  lexend: 'Lexend',
  arial: 'Arial',
  verdana: 'Verdana',
};

export const SPEC_FONT_LABELS: Record<'sans' | 'script' | 'italic' | 'mono', string> = {
  sans: 'Sans Hiện Đại',
  script: 'Script Bay Bổng',
  italic: 'Italic Nghiêng',
  mono: 'Mono Kỹ Thuật',
};

// Hệ tọa độ chuẩn: cao 100 (x-height ~ 45..85, baseline = 85, ascender = 20, descender = 98)
// Mỗi phần tử trong mảng `strokes` là 1 nét bút liền mạch để Vivus.js vẽ tuần tự từng nét một (oneByOne).

const SCRIPT_GLYPHS: Record<string, GlyphDefinition> = {
  a: {
    advance: 64,
    strokes: [
      { d: 'M 48 48 C 36 42, 18 48, 16 68 C 14 84, 30 88, 46 72' },
      { d: 'M 48 46 C 46 62, 46 78, 56 85 C 60 85, 62 82, 64 78' },
    ],
  },
  ă: {
    advance: 64,
    strokes: [
      { d: 'M 48 48 C 36 42, 18 48, 16 68 C 14 84, 30 88, 46 72' },
      { d: 'M 48 46 C 46 62, 46 78, 56 85 C 60 85, 62 82, 64 78' },
      { d: 'M 24 30 C 30 38, 42 38, 48 30' },
    ],
  },
  â: {
    advance: 64,
    strokes: [
      { d: 'M 48 48 C 36 42, 18 48, 16 68 C 14 84, 30 88, 46 72' },
      { d: 'M 48 46 C 46 62, 46 78, 56 85 C 60 85, 62 82, 64 78' },
      { d: 'M 24 35 L 36 25 L 48 35' },
    ],
  },
  b: {
    advance: 62,
    strokes: [
      { d: 'M 14 42 C 26 32, 34 18, 28 16 C 22 14, 18 46, 18 72 C 18 86, 36 88, 48 74 C 56 64, 50 48, 36 48 C 26 48, 22 58, 26 66 C 32 72, 48 70, 58 64' },
    ],
  },
  c: {
    advance: 56,
    strokes: [
      { d: 'M 48 52 C 38 42, 18 46, 16 66 C 14 84, 34 88, 52 76' },
    ],
  },
  d: {
    advance: 64,
    strokes: [
      { d: 'M 48 50 C 34 42, 16 48, 16 68 C 16 86, 36 86, 48 70' },
      { d: 'M 50 18 C 48 42, 46 68, 54 84 C 58 86, 62 82, 64 78' },
    ],
  },
  đ: {
    advance: 64,
    strokes: [
      { d: 'M 48 50 C 34 42, 16 48, 16 68 C 16 86, 36 86, 48 70' },
      { d: 'M 50 18 C 48 42, 46 68, 54 84 C 58 86, 62 82, 64 78' },
      { d: 'M 38 30 L 60 30' },
    ],
  },
  e: {
    advance: 56,
    strokes: [
      { d: 'M 18 66 C 32 66, 48 60, 46 50 C 44 42, 24 44, 18 62 C 12 80, 32 88, 52 76' },
    ],
  },
  ê: {
    advance: 56,
    strokes: [
      { d: 'M 18 66 C 32 66, 48 60, 46 50 C 44 42, 24 44, 18 62 C 12 80, 32 88, 52 76' },
      { d: 'M 22 35 L 34 25 L 46 35' },
    ],
  },
  g: {
    advance: 64,
    strokes: [
      { d: 'M 48 48 C 34 42, 16 48, 16 66 C 16 82, 34 84, 48 68' },
      { d: 'M 50 46 C 48 68, 48 92, 36 98 C 24 102, 16 94, 24 86 C 32 78, 48 74, 60 68' },
    ],
  },
  h: {
    advance: 64,
    strokes: [
      { d: 'M 12 40 C 24 30, 32 18, 26 16 C 20 14, 18 52, 18 85' },
      { d: 'M 19 64 C 26 48, 42 46, 44 62 L 44 80 C 44 86, 52 86, 60 78' },
    ],
  },
  i: {
    advance: 36,
    strokes: [
      { d: 'M 16 48 C 16 62, 16 76, 22 84 C 26 86, 30 82, 32 78' },
      { d: 'M 17 32 L 18 33' },
    ],
  },
  k: {
    advance: 62,
    strokes: [
      { d: 'M 12 40 C 24 30, 32 18, 26 16 C 20 14, 18 52, 18 85' },
      { d: 'M 48 46 C 38 54, 26 62, 20 65' },
      { d: 'M 28 62 C 36 70, 44 82, 56 84' },
    ],
  },
  l: {
    advance: 40,
    strokes: [
      { d: 'M 12 40 C 24 30, 32 18, 26 16 C 20 14, 18 52, 22 82 C 24 86, 30 85, 36 78' },
    ],
  },
  m: {
    advance: 92,
    strokes: [
      { d: 'M 10 54 C 15 44, 22 45, 22 56 L 22 85' },
      { d: 'M 22 62 C 28 46, 46 46, 46 62 L 46 85' },
      { d: 'M 46 62 C 52 46, 70 46, 70 62 L 70 80 C 70 86, 78 86, 86 78' },
    ],
  },
  n: {
    advance: 68,
    strokes: [
      { d: 'M 12 54 C 17 44, 24 45, 24 56 L 24 85' },
      { d: 'M 24 62 C 30 46, 48 46, 48 62 L 48 80 C 48 86, 56 86, 64 78' },
    ],
  },
  o: {
    advance: 62,
    strokes: [
      { d: 'M 34 46 C 18 46, 14 66, 20 78 C 26 88, 46 86, 50 70 C 54 54, 42 46, 32 48 C 36 56, 48 58, 58 54' },
    ],
  },
  ô: {
    advance: 62,
    strokes: [
      { d: 'M 34 46 C 18 46, 14 66, 20 78 C 26 88, 46 86, 50 70 C 54 54, 42 46, 32 48 C 36 56, 48 58, 58 54' },
      { d: 'M 22 35 L 34 25 L 46 35' },
    ],
  },
  ơ: {
    advance: 64,
    strokes: [
      { d: 'M 34 46 C 18 46, 14 66, 20 78 C 26 88, 46 86, 50 70 C 54 54, 42 46, 32 48' },
      { d: 'M 48 48 C 56 44, 62 50, 56 58' },
    ],
  },
  p: {
    advance: 64,
    strokes: [
      { d: 'M 18 46 L 18 98' },
      { d: 'M 19 56 C 28 44, 50 46, 50 64 C 50 82, 30 86, 20 78' },
    ],
  },
  q: {
    advance: 64,
    strokes: [
      { d: 'M 48 48 C 34 42, 16 48, 16 66 C 16 82, 34 84, 48 68' },
      { d: 'M 48 46 L 48 98 C 52 94, 58 88, 62 84' },
    ],
  },
  r: {
    advance: 52,
    strokes: [
      { d: 'M 14 54 C 18 46, 22 48, 22 58 L 22 85' },
      { d: 'M 22 62 C 28 48, 40 46, 46 52' },
    ],
  },
  s: {
    advance: 54,
    strokes: [
      { d: 'M 44 52 C 36 44, 20 46, 20 56 C 20 66, 46 66, 46 78 C 46 88, 24 88, 16 78' },
    ],
  },
  t: {
    advance: 48,
    strokes: [
      { d: 'M 24 26 C 24 48, 22 72, 28 83 C 32 86, 38 84, 42 78' },
      { d: 'M 12 46 L 40 46' },
    ],
  },
  u: {
    advance: 64,
    strokes: [
      { d: 'M 16 48 L 16 72 C 16 86, 36 86, 46 70' },
      { d: 'M 46 48 L 46 80 C 46 86, 54 86, 60 78' },
    ],
  },
  ư: {
    advance: 66,
    strokes: [
      { d: 'M 16 48 L 16 72 C 16 86, 36 86, 46 70' },
      { d: 'M 46 48 L 46 80 C 46 86, 54 86, 60 78' },
      { d: 'M 50 44 C 58 40, 64 46, 58 54' },
    ],
  },
  v: {
    advance: 60,
    strokes: [
      { d: 'M 14 48 C 22 64, 28 78, 32 85 C 38 72, 46 56, 52 46' },
    ],
  },
  x: {
    advance: 58,
    strokes: [
      { d: 'M 16 48 C 28 60, 38 72, 48 85' },
      { d: 'M 48 48 C 36 60, 26 72, 16 85' },
    ],
  },
  y: {
    advance: 62,
    strokes: [
      { d: 'M 16 48 L 16 70 C 16 84, 36 84, 48 68' },
      { d: 'M 48 48 C 48 70, 48 92, 36 98 C 24 102, 16 94, 24 86 C 32 78, 48 74, 58 68' },
    ],
  },
};

const SANS_GLYPHS: Record<string, GlyphDefinition> = {
  a: {
    advance: 60,
    strokes: [
      { d: 'M 46 54 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 46 L 46 85' },
    ],
  },
  ă: {
    advance: 60,
    strokes: [
      { d: 'M 46 54 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 46 L 46 85' },
      { d: 'M 22 30 C 28 38, 40 38, 46 30' },
    ],
  },
  â: {
    advance: 60,
    strokes: [
      { d: 'M 46 54 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 46 L 46 85' },
      { d: 'M 22 35 L 34 25 L 46 35' },
    ],
  },
  b: {
    advance: 60,
    strokes: [
      { d: 'M 16 20 L 16 85' },
      { d: 'M 16 56 C 24 44, 48 46, 48 66 C 48 84, 24 86, 16 74' },
    ],
  },
  c: {
    advance: 54,
    strokes: [
      { d: 'M 46 54 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 76' },
    ],
  },
  d: {
    advance: 60,
    strokes: [
      { d: 'M 46 56 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 20 L 46 85' },
    ],
  },
  đ: {
    advance: 60,
    strokes: [
      { d: 'M 46 56 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 20 L 46 85' },
      { d: 'M 36 32 L 56 32' },
    ],
  },
  e: {
    advance: 56,
    strokes: [
      { d: 'M 16 65 L 46 65 C 46 46, 16 44, 16 66 C 16 84, 38 86, 46 76' },
    ],
  },
  ê: {
    advance: 56,
    strokes: [
      { d: 'M 16 65 L 46 65 C 46 46, 16 44, 16 66 C 16 84, 38 86, 46 76' },
      { d: 'M 20 35 L 32 25 L 44 35' },
    ],
  },
  g: {
    advance: 60,
    strokes: [
      { d: 'M 46 54 C 38 44, 16 46, 16 66 C 16 84, 38 84, 46 72' },
      { d: 'M 46 46 L 46 86 C 46 98, 26 100, 18 92' },
    ],
  },
  h: {
    advance: 60,
    strokes: [
      { d: 'M 16 20 L 16 85' },
      { d: 'M 16 60 C 22 46, 44 46, 44 62 L 44 85' },
    ],
  },
  i: {
    advance: 32,
    strokes: [
      { d: 'M 16 46 L 16 85' },
      { d: 'M 16 30 L 16 32' },
    ],
  },
  k: {
    advance: 56,
    strokes: [
      { d: 'M 16 20 L 16 85' },
      { d: 'M 44 46 L 18 66' },
      { d: 'M 24 61 L 46 85' },
    ],
  },
  l: {
    advance: 32,
    strokes: [
      { d: 'M 16 20 L 16 85' },
    ],
  },
  m: {
    advance: 86,
    strokes: [
      { d: 'M 16 46 L 16 85' },
      { d: 'M 16 60 C 22 46, 43 46, 43 62 L 43 85' },
      { d: 'M 43 60 C 49 46, 70 46, 70 62 L 70 85' },
    ],
  },
  n: {
    advance: 60,
    strokes: [
      { d: 'M 16 46 L 16 85' },
      { d: 'M 16 60 C 22 46, 44 46, 44 62 L 44 85' },
    ],
  },
  o: {
    advance: 62,
    strokes: [
      { d: 'M 31 46 C 14 46, 14 85, 31 85 C 48 85, 48 46, 31 46' },
    ],
  },
  ô: {
    advance: 62,
    strokes: [
      { d: 'M 31 46 C 14 46, 14 85, 31 85 C 48 85, 48 46, 31 46' },
      { d: 'M 20 35 L 31 25 L 42 35' },
    ],
  },
  ơ: {
    advance: 64,
    strokes: [
      { d: 'M 31 46 C 14 46, 14 85, 31 85 C 48 85, 48 46, 31 46' },
      { d: 'M 45 48 C 54 44, 58 52, 50 58' },
    ],
  },
  p: {
    advance: 60,
    strokes: [
      { d: 'M 16 46 L 16 98' },
      { d: 'M 16 56 C 24 44, 48 46, 48 66 C 48 84, 24 86, 16 74' },
    ],
  },
  q: {
    advance: 60,
    strokes: [
      { d: 'M 46 56 C 38 44, 16 46, 16 66 C 16 84, 38 86, 46 74' },
      { d: 'M 46 46 L 46 98' },
    ],
  },
  r: {
    advance: 44,
    strokes: [
      { d: 'M 16 46 L 16 85' },
      { d: 'M 16 60 C 20 48, 30 46, 38 48' },
    ],
  },
  s: {
    advance: 52,
    strokes: [
      { d: 'M 42 52 C 36 44, 16 46, 16 56 C 16 66, 44 65, 44 76 C 44 86, 20 86, 14 78' },
    ],
  },
  t: {
    advance: 44,
    strokes: [
      { d: 'M 22 26 L 22 78 C 22 85, 30 86, 36 84' },
      { d: 'M 12 46 L 34 46' },
    ],
  },
  u: {
    advance: 60,
    strokes: [
      { d: 'M 16 46 L 16 70 C 16 86, 38 86, 44 72' },
      { d: 'M 44 46 L 44 85' },
    ],
  },
  ư: {
    advance: 62,
    strokes: [
      { d: 'M 16 46 L 16 70 C 16 86, 38 86, 44 72' },
      { d: 'M 44 46 L 44 85' },
      { d: 'M 46 45 C 55 41, 59 49, 51 55' },
    ],
  },
  v: {
    advance: 56,
    strokes: [
      { d: 'M 14 46 L 28 85' },
      { d: 'M 42 46 L 28 85' },
    ],
  },
  x: {
    advance: 56,
    strokes: [
      { d: 'M 14 46 L 42 85' },
      { d: 'M 42 46 L 14 85' },
    ],
  },
  y: {
    advance: 56,
    strokes: [
      { d: 'M 14 46 L 28 84' },
      { d: 'M 42 46 L 22 98' },
    ],
  },
};

const MONO_GLYPHS: Record<string, GlyphDefinition> = Object.fromEntries(
  Object.entries(SANS_GLYPHS).map(([char, def]) => {
    const targetAdvance = 68;
    const offsetX = +((targetAdvance - def.advance) / 2).toFixed(1);
    return [
      char,
      {
        advance: targetAdvance,
        strokes: def.strokes.map((stroke) => {
          const tokens = stroke.d.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
          let isX = true;
          const shifted = tokens.map((token) => {
            if (/^[A-Za-z]$/.test(token)) {
              isX = true;
              return token;
            }
            const num = parseFloat(token);
            if (isX) {
              isX = false;
              return `${+(num + offsetX).toFixed(1)}`;
            }
            isX = true;
            return `${num}`;
          });
          return { d: shifted.join(' ') };
        }),
      },
    ];
  }),
);

const ITALIC_GLYPHS: Record<string, GlyphDefinition> = Object.fromEntries(
  Object.entries(SANS_GLYPHS).map(([char, def]) => {
    return [
      char,
      {
        advance: def.advance,
        strokes: def.strokes.map((stroke) => {
          const tokens = stroke.d.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
          const shifted: string[] = [];
          let pendingX: number | null = null;
          for (const token of tokens) {
            if (/^[A-Za-z]$/.test(token)) {
              if (pendingX !== null) {
                shifted.push(`${pendingX}`);
                pendingX = null;
              }
              shifted.push(token);
              continue;
            }
            const val = parseFloat(token);
            if (pendingX === null) {
              pendingX = val;
            } else {
              const y = val;
              const x = +(pendingX + (85 - y) * 0.18).toFixed(1);
              shifted.push(`${x}`, `${y}`);
              pendingX = null;
            }
          }
          if (pendingX !== null) shifted.push(`${pendingX}`);
          return { d: shifted.join(' ') };
        }),
      },
    ];
  }),
);

// Hỗ trợ thêm chữ hoa cơ bản (tự động scale từ chữ thường nếu chưa định nghĩa riêng)
function withUppercaseFallback(base: Record<string, GlyphDefinition>): Record<string, GlyphDefinition> {
  const full: Record<string, GlyphDefinition> = { ...base };
  for (const [char, def] of Object.entries(base)) {
    const upper = char.toUpperCase();
    if (!full[upper]) {
      full[upper] = {
        advance: Math.round(def.advance * 1.15),
        strokes: def.strokes.map((stroke) => {
          const tokens = stroke.d.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
          let isX = true;
          const scaled = tokens.map((token) => {
            if (/^[A-Za-z]$/.test(token)) {
              isX = true;
              return token;
            }
            const num = parseFloat(token);
            if (isX) {
              isX = false;
              return `${+(num * 1.15).toFixed(1)}`;
            }
            isX = true;
            // Kéo giãn trục Y quanh baseline 85 để chữ hoa cao lên
            const scaledY = +(85 - (85 - num) * 1.28).toFixed(1);
            return `${scaledY}`;
          });
          return { d: scaled.join(' ') };
        }),
      };
    }
  }
  full[' '] = { advance: 36, strokes: [] };
  return full;
}

export const GLYPHS: Record<GlyphFontStyle, Record<string, GlyphDefinition>> = {
  sans: withUppercaseFallback(SANS_GLYPHS),
  script: withUppercaseFallback(SCRIPT_GLYPHS),
  italic: withUppercaseFallback(ITALIC_GLYPHS),
  mono: withUppercaseFallback(MONO_GLYPHS),
  // Legacy aliases for backwards compatibility
  lexend: withUppercaseFallback(SCRIPT_GLYPHS),
  arial: withUppercaseFallback(SANS_GLYPHS),
  verdana: withUppercaseFallback(MONO_GLYPHS),
};