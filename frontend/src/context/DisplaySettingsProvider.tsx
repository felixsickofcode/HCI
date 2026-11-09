/* eslint-disable react-refresh/only-export-components */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import {
  ApiError, getDisplaySettings, saveDisplaySettings,
  type DisplaySettings, type FocusSettings, type FontFamily, type ThemeName,
} from '../lib/api';
import { useAuth } from './auth-context';

const STORAGE_KEY = 'display-settings';

// Dải giá trị = giao của yêu cầu FR-03 và schema backend (tránh 422).
export const LIMITS = {
  fontSize: [16, 32],
  lineHeight: [1.5, 2.5],
  letterSpacing: [0, 0.2],
  columnWidth: [45, 75],
} as const;

export const DEFAULTS: DisplaySettings = {
  fontFamily: 'lexend',
  fontSize: 20,
  lineHeight: 1.8,
  letterSpacing: 0.08,
  theme: 'cream',
  columnWidth: 60,
  focus: { enabled: false, dimOpacity: 0.6, followPointer: false },
};

// Không dùng #FFFFFF. Tương phản chữ/nền đều > 12:1 (AAA).
export const THEMES: Record<ThemeName, { label: string; bg: string; fg: string }> = {
  cream: { label: 'Kem ấm', bg: '#FBF0D9', fg: '#222222' },
  mint: { label: 'Bạc hà dịu', bg: '#E6F4EA', fg: '#1E2A22' },
  blue: { label: 'Xanh êm', bg: '#E6F3FC', fg: '#1B2A38' },
  dark: { label: 'Xám đêm', bg: '#1A1F2B', fg: '#E8EAF0' },
  navy: { label: 'Xanh đêm', bg: '#0F1A2E', fg: '#E9EEF7' },
};

export const FONT_STACKS: Record<FontFamily, string> = {
  lexend: "'Lexend', sans-serif",
  opendyslexic: "'OpenDyslexic', 'Lexend', sans-serif",
  arial: 'Arial, sans-serif',
  verdana: 'Verdana, sans-serif',
  merriweather: "'Merriweather', serif",
};

const clamp = (v: number, [min, max]: readonly [number, number]) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
const round2 = (v: number) => Math.round(v * 100) / 100;

function sanitize(raw?: Partial<DisplaySettings> | null): DisplaySettings {
  const r = { ...DEFAULTS, ...raw, focus: { ...DEFAULTS.focus, ...raw?.focus } };
  return {
    ...r,
    fontFamily: r.fontFamily in FONT_STACKS ? r.fontFamily : DEFAULTS.fontFamily,
    theme: r.theme in THEMES ? r.theme : DEFAULTS.theme,
    fontSize: Math.round(clamp(r.fontSize, LIMITS.fontSize)),
    lineHeight: round2(clamp(r.lineHeight, LIMITS.lineHeight)),
    letterSpacing: round2(clamp(r.letterSpacing, LIMITS.letterSpacing)),
    columnWidth: Math.round(clamp(r.columnWidth, LIMITS.columnWidth)),
  };
}

function loadLocal(): DisplaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitize(null);
  }
}

type Patch = Partial<Omit<DisplaySettings, 'focus'>> & { focus?: Partial<FocusSettings> };

interface Ctx {
  settings: DisplaySettings;
  update: (patch: Patch) => void;
  reset: () => void;
}

const DisplaySettingsContext = createContext<Ctx | null>(null);

export const useDisplaySettings = (): Ctx => {
  const ctx = useContext(DisplaySettingsContext);
  if (!ctx) throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  return ctx;
};

export const DisplaySettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DisplaySettings>(loadLocal);
  const latest = useRef(settings);
  const syncReady = useRef(false);
  const skipNext = useRef(false);

  // Đăng nhập: kéo cài đặt từ server (server thắng); chưa có thì đẩy bản local lên.
  useEffect(() => {
    syncReady.current = false;
    if (!user) return;
    let cancelled = false;
    getDisplaySettings()
      .then((r) => {
        if (cancelled) return;
        skipNext.current = true; // tránh PUT lại đúng dữ liệu vừa nhận
        setSettings(sanitize(r.display));
      })
      .catch((e) => {
        if (!cancelled && e instanceof ApiError && e.status === 404) {
          saveDisplaySettings(latest.current).catch(() => {});
        }
      })
      .finally(() => {
        if (!cancelled) syncReady.current = true;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Mỗi lần đổi: lưu localStorage ngay; đồng bộ server ngầm (debounce 600ms).
  useEffect(() => {
    latest.current = settings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage đầy hoặc bị chặn: bỏ qua */
    }
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (!user || !syncReady.current) return;
    const t = setTimeout(() => saveDisplaySettings(settings).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [settings, user]);

  const update = useCallback((patch: Patch) => {
    setSettings((s) => sanitize({ ...s, ...patch, focus: { ...s.focus, ...patch.focus } }));
  }, []);
  const reset = useCallback(() => setSettings(sanitize(null)), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <DisplaySettingsContext.Provider value={value}>{children}</DisplaySettingsContext.Provider>;
};