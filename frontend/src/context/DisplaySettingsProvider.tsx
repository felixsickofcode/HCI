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
  letterSpacing: 0.02,
  theme: 'cream',
  columnWidth: 60,
  focus: { enabled: false, dimOpacity: 0.6, followPointer: false, lineCount: 1 },
};

export interface ThemePalette {
  label: string;
  shortLabel: string;
  isDark: boolean;
  bg: string;
  fg: string;
  secondaryText: string;
  badgeText: string;
  badgeBg: string;
  sidebarBg: string;
  panelBg: string;
  surfaceBg: string;
  controlBg: string;
  hoverBg: string;
  activeBg: string;
  activeFg: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentFg: string;
  accentSoft: string;
  highlightBg: string;
  highlightFg: string;
  highlightOutline: string;
  warningBg: string;
  warningFg: string;
  warningBorder: string;
  errorBg: string;
  errorFg: string;
  tooltipBg: string;
  tooltipFg: string;
  brandBadgeBg: string;
  brandBadgeFg: string;
  brandBadgeBorder: string;
  brandDot: string;
}

// Không dùng #FFFFFF. Tương phản chữ/nền đều > 12:1 (AAA).
export const THEMES: Record<ThemeName, ThemePalette> = {
  cream: {
    label: 'Kem ấm',
    shortLabel: 'Kem ấm',
    isDark: false,
    bg: '#FBF0D9',
    fg: '#222222',
    secondaryText: '#50452E',
    badgeText: '#51411F',
    badgeBg: '#EEE2B8',
    sidebarBg: '#F4E6C8',
    panelBg: '#F5E8CB',
    surfaceBg: '#F2E3C2',
    controlBg: '#FAF0DA',
    hoverBg: '#EADBB9',
    activeBg: '#E6D6B0',
    activeFg: '#1556B8',
    border: '#DFCFA9',
    borderStrong: '#BFA97E',
    accent: '#1556B8',
    accentFg: '#FAF6EE',
    accentSoft: '#E3ECFA',
    highlightBg: '#F4CF63',
    highlightFg: '#1E1700',
    highlightOutline: '#8A6900',
    warningBg: '#EAD7A1',
    warningFg: '#594108',
    warningBorder: '#D4BC7D',
    errorBg: '#F6D9D5',
    errorFg: '#8F1D1D',
    tooltipBg: '#2B2211',
    tooltipFg: '#FBF0D9',
    brandBadgeBg: '#17294D',
    brandBadgeFg: '#FBF4E4',
    brandBadgeBorder: 'transparent',
    brandDot: '#E3B642',
  },
  mint: {
    label: 'Bạc hà dịu',
    shortLabel: 'Bạc hà',
    isDark: false,
    bg: '#E6F4EA',
    fg: '#1E2A22',
    secondaryText: '#394E40',
    badgeText: '#294C37',
    badgeBg: '#CDE3D2',
    sidebarBg: '#DCEEE1',
    panelBg: '#DFF0E4',
    surfaceBg: '#D6EADC',
    controlBg: '#E8F5EC',
    hoverBg: '#CCE2D3',
    activeBg: '#C2DEC9',
    activeFg: '#145333',
    border: '#BDD6C4',
    borderStrong: '#8FB59B',
    accent: '#1B5E3A',
    accentFg: '#F2FAF4',
    accentSoft: '#CBE6D4',
    highlightBg: '#F2D46B',
    highlightFg: '#1E1700',
    highlightOutline: '#7E6100',
    warningBg: '#DFDFB5',
    warningFg: '#4A430D',
    warningBorder: '#C4C28E',
    errorBg: '#F3D8D6',
    errorFg: '#8B1E1E',
    tooltipBg: '#183626',
    tooltipFg: '#E6F4EA',
    brandBadgeBg: '#183626',
    brandBadgeFg: '#EBF7EE',
    brandBadgeBorder: 'transparent',
    brandDot: '#D9B13B',
  },
  blue: {
    label: 'Xanh êm',
    shortLabel: 'Xanh êm',
    isDark: false,
    bg: '#E6F3FC',
    fg: '#1B2A38',
    secondaryText: '#394D60',
    badgeText: '#25465E',
    badgeBg: '#CDDFEE',
    sidebarBg: '#DCECF8',
    panelBg: '#DFEEF9',
    surfaceBg: '#D5E7F6',
    controlBg: '#E9F4FC',
    hoverBg: '#CCE0F0',
    activeBg: '#C1DAEE',
    activeFg: '#0D4D91',
    border: '#BDD4E8',
    borderStrong: '#8CB0CF',
    accent: '#0E55A3',
    accentFg: '#F2F8FD',
    accentSoft: '#C9E0F5',
    highlightBg: '#F4D56B',
    highlightFg: '#1E1700',
    highlightOutline: '#856500',
    warningBg: '#E3DFB8',
    warningFg: '#52440A',
    warningBorder: '#C7C08E',
    errorBg: '#F4D9DA',
    errorFg: '#8E1D21',
    tooltipBg: '#152C42',
    tooltipFg: '#E6F3FC',
    brandBadgeBg: '#16314E',
    brandBadgeFg: '#ECF5FC',
    brandBadgeBorder: 'transparent',
    brandDot: '#E0B53F',
  },
  dark: {
    label: 'Xám đêm',
    shortLabel: 'Xám đêm',
    isDark: true,
    bg: '#1A1F2B',
    fg: '#E8EAF0',
    secondaryText: '#C5CBD9',
    badgeText: '#F0E8CD',
    badgeBg: '#373B42',
    sidebarBg: '#141822',
    panelBg: '#202634',
    surfaceBg: '#222836',
    controlBg: '#1A1F2B',
    hoverBg: '#252C3D',
    activeBg: '#24344F',
    activeFg: '#8BB8FF',
    border: '#30394D',
    borderStrong: '#526180',
    accent: '#3B7EE8',
    accentFg: '#F7FAFF',
    accentSoft: '#223659',
    highlightBg: '#574511',
    highlightFg: '#FFE89B',
    highlightOutline: '#D9A92C',
    warningBg: '#3B3318',
    warningFg: '#F5DC87',
    warningBorder: '#695826',
    errorBg: '#472126',
    errorFg: '#FFC7CC',
    tooltipBg: '#2D364B',
    tooltipFg: '#F0F3FA',
    brandBadgeBg: '#263D68',
    brandBadgeFg: '#F2F6FF',
    brandBadgeBorder: '#436399',
    brandDot: '#E5BC4B',
  },
  navy: {
    label: 'Xanh đêm',
    shortLabel: 'Xanh đêm',
    isDark: true,
    bg: '#0F1A2E',
    fg: '#E9EEF7',
    secondaryText: '#C4D0E1',
    badgeText: '#D7E8FF',
    badgeBg: '#243750',
    sidebarBg: '#0C1526',
    panelBg: '#152238',
    surfaceBg: '#16243D',
    controlBg: '#0F1A2E',
    hoverBg: '#1A2A47',
    activeBg: '#1E3357',
    activeFg: '#91BEFF',
    border: '#25395C',
    borderStrong: '#476494',
    accent: '#3D82EB',
    accentFg: '#F7FAFF',
    accentSoft: '#1B3257',
    highlightBg: '#4F3E0F',
    highlightFg: '#FFE9A0',
    highlightOutline: '#D9A92C',
    warningBg: '#383016',
    warningFg: '#F5DD8A',
    warningBorder: '#665624',
    errorBg: '#462028',
    errorFg: '#FFC8CE',
    tooltipBg: '#223657',
    tooltipFg: '#EEF4FF',
    brandBadgeBg: '#203B69',
    brandBadgeFg: '#F0F6FF',
    brandBadgeBorder: '#3E629E',
    brandDot: '#E5BC4B',
  },
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
    focus: {
      ...r.focus,
      lineCount: r.focus.lineCount === 2 || r.focus.lineCount === 3 ? r.focus.lineCount : 1,
      dimOpacity: clamp(r.focus.dimOpacity, [0.5, 0.8]),
    },
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
