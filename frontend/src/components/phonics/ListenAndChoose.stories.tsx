import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import lessonData from '../../data/lessons/am-m.json';
import type { PhonicsLesson } from '../../types/phonics';
import { ListenAndChoose } from './ListenAndChoose';

const lesson = lessonData as PhonicsLesson;

const meta: Meta<typeof ListenAndChoose> = {
  title: 'Phonics/ListenAndChoose',
  component: ListenAndChoose,
  args: {
    items: lesson.listenAndChoose,
    soundSymbol: lesson.sound.symbol,
    soundReadAs: lesson.sound.readAs,
    soundType: lesson.sound.type,
    onPlayTargetAudio: fn(),
  },
};

export default meta;
export const Default: StoryObj<typeof ListenAndChoose> = {};
