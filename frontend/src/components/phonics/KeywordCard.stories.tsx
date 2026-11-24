import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { KeywordCard } from './KeywordCard';

const meta: Meta<typeof KeywordCard> = {
  title: 'Phonics/KeywordCard',
  component: KeywordCard,
};

export default meta;

export const Default: StoryObj<typeof KeywordCard> = {
  args: {
    keyword: {
      word: 'mèo',
      leadSymbol: 'm',
      image: '/assets/images/m/meo.svg',
      audio: '/assets/audio/m/meo.mp3',
    },
    soundType: 'consonant',
    tip: 'Khép môi lại và nói "mmm", cảm nhận môi rung nhẹ.',
    onPlayAudio: fn(),
  },
};
