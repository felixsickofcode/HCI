import amM from './am-m.json';
import bai01 from './bai-01.json';
import type { PhonicsLesson } from '../../types/phonics';
import type { Bai01Lesson } from '../../types/phonics';

interface VowelLessonConfig {
  id: string;
  symbol: string;
  readAs: string;
  keyword: string;
  word: string;
}

const vowelConfigs: VowelLessonConfig[] = [
  { id: 'am-a', symbol: 'a', readAs: 'a', keyword: 'anh', word: 'ma' },
  { id: 'am-o', symbol: 'o', readAs: 'o', keyword: 'ong', word: 'mo' },
  { id: 'am-oo', symbol: 'ô', readAs: 'ô', keyword: 'ô tô', word: 'mô' },
  { id: 'am-aw', symbol: 'ơ', readAs: 'ơ', keyword: 'ơ', word: 'mơ' },
  { id: 'am-e', symbol: 'e', readAs: 'e', keyword: 'em', word: 'me' },
  { id: 'am-ee', symbol: 'ê', readAs: 'ê', keyword: 'ếch', word: 'mê' },
  { id: 'am-i', symbol: 'i', readAs: 'i', keyword: 'ít', word: 'mi' },
  { id: 'am-u', symbol: 'u', readAs: 'u', keyword: 'ủn', word: 'mu' },
  { id: 'am-uu', symbol: 'ư', readAs: 'ư', keyword: 'ư', word: 'mư' },
];

export const createVowelLesson = (config: VowelLessonConfig): PhonicsLesson => ({
  id: config.id,
  title: `Nguyên âm ${config.symbol}`,
  sound: {
    symbol: config.symbol,
    upper: config.symbol.toUpperCase(),
    type: 'vowel',
    readAs: config.readAs,
    audio: {
      normal: `/assets/audio/vowels/${config.symbol}/phoneme.mp3`,
      slow: `/assets/audio/vowels/${config.symbol}/phoneme-slow.mp3`,
    },
    tip: `Mở miệng tự nhiên và nói rõ âm "${config.readAs}".`,
    strokes: {
      viewBox: '0 0 200 200',
      verified: false,
      paths: [
        {
          order: 1,
          d: 'M 55 150 C 55 95, 145 95, 145 150',
          label: 'Nét 1',
          startPoint: { x: 55, y: 150 },
          arrow: { x: 105, y: 105, angle: 0 },
        },
      ],
    },
  },
  keyword: {
    word: config.keyword,
    leadSymbol: config.keyword.charAt(0),
    image: '',
    audio: `/assets/audio/vowels/${config.symbol}/keyword.mp3`,
  },
  listenAndChoose: [
    { target: config.symbol, options: [config.symbol, 'm', 'n'] },
    { target: config.symbol, options: ['n', config.symbol, 'm'] },
    { target: config.symbol, options: ['m', 'n', config.symbol] },
  ],
  blending: [
    {
      word: config.word,
      parts: [
        { symbol: 'm', type: 'consonant', audio: '/assets/audio/m/phoneme.mp3' },
        { symbol: config.symbol, type: 'vowel', audio: `/assets/audio/vowels/${config.symbol}/phoneme.mp3` },
      ],
      audio: `/assets/audio/words/${config.word}.mp3`,
    },
  ],
});

export const lessonCatalog: Record<string, PhonicsLesson> = {
  'am-m': amM as PhonicsLesson,
  ...Object.fromEntries(vowelConfigs.map((config) => [config.id, createVowelLesson(config)])),
};

export const bai01Lesson = bai01 as Bai01Lesson;
