export type SoundType = 'consonant' | 'vowel';

export const SOUND_COLORS: Record<SoundType, { text: string; bg: string; border: string; glow: string }> = {
  consonant: {
    text: '#1F5FBF',
    bg: '#EAF2FD',
    border: '#1F5FBF',
    glow: 'rgba(31, 95, 191, 0.25)',
  },
  vowel: {
    text: '#C2410C',
    bg: '#FFEDE5',
    border: '#C2410C',
    glow: 'rgba(194, 65, 12, 0.25)',
  },
};

export interface StrokePath {
  order: number;
  d: string;
  label?: string;
  arrow?: { x: number; y: number; angle: number };
  startPoint?: { x: number; y: number };
}

export interface StrokeData {
  viewBox: string;
  verified: boolean;
  paths: StrokePath[];
}

export interface SoundData {
  symbol: string;
  upper: string;
  type: SoundType;
  readAs: string;
  audio: {
    normal: string;
    slow: string;
  };
  tip: string;
  strokes: StrokeData;
}

export interface KeywordData {
  word: string;
  image: string;
  audio: string;
  leadSymbol?: string;
}

export interface ListenAndChooseItem {
  target: string;
  options: string[];
}

export interface BlendingPart {
  symbol: string;
  type: SoundType;
  audio: string;
}

export interface BlendingItem {
  word: string;
  parts: BlendingPart[];
  audio: string;
}

export interface PhonicsLesson {
  id: string;
  title: string;
  sound: SoundData;
  keyword: KeywordData;
  listenAndChoose: ListenAndChooseItem[];
  blending: BlendingItem[];
}

export interface Bai01Lesson {
  id: string;
  number: number;
  title: string;
  estimatedMinutes: number;
  source: {
    book: string;
    lessons: number[];
  };
  step1: {
    minutes: number;
    sounds: Array<{
      symbol: string;
      type: SoundType;
      readAs: string;
      audio: { normal: string; slow: string };
      mouth: { image: string; note: string };
    }>;
    tones: Array<{
      name: string;
      example: string;
      audio: string;
    }>;
  };
  step2: {
    minutes: number;
    examples: Array<{
      parts?: string[];
      base?: string;
      tone?: string;
      result: string;
      audio: string;
    }>;
  };
  step3: {
    minutes: number;
    items: Array<{
      word: string;
      audio: string;
      consonant: string;
      vowel: string;
      tone: string | null;
      chips: string[];
    }>;
  };
  step4: {
    minutes: number;
    items: Array<{
      heard: string;
      tone: string | null;
      audio: string;
      options: string[];
      answer: string;
    }>;
  };
}

export interface SyllabusLesson {
  id: string;
  title: string;
  progress?: number;
  status?: 'completed' | 'in_progress' | 'not_started';
  badge?: string;
  category?: string;
}

export interface MultisensoryOption {
  id: string;
  key: string;
  text: string;
  isCorrect?: boolean;
}

export interface VisualLetterDetail {
  title: string;
  symbol: string;
  badgeText: string;
  badgeIcon: string;
  badgePosition: 'left' | 'right';
  badgeColorClass: string;
  description: string;
  audioText: string;
}

export interface MultisensoryExercise {
  id: string;
  subject: string;
  stepIndicator: string;
  title: string;
  description: string;
  progressPercent: number;
  letters: [VisualLetterDetail, VisualLetterDetail];
  audioPrompt: {
    title: string;
    subtitle: string;
    normalAudio?: string;
    slowAudio?: string;
  };
  options: MultisensoryOption[];
  correctOptionId: string;
}

export interface DailyGoalStatus {
  timeSpentMinutes: number;
  timeTargetMinutes: number;
  streakDays: number;
  percentAchieved: number;
}

