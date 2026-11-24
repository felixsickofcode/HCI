import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import lessonData from '../../data/lessons/am-m.json';
import type { PhonicsLesson } from '../../types/phonics';
import { SoundBoxes } from './SoundBoxes';

const lesson = lessonData as PhonicsLesson;

const meta: Meta<typeof SoundBoxes> = {
  title: 'Phonics/SoundBoxes',
  component: SoundBoxes,
  args: {
    items: lesson.blending,
    onPlayWordAudio: fn(),
    onPlayPartAudio: fn(),
  },
};

export default meta;
export const Default: StoryObj<typeof SoundBoxes> = {};
