import type { Meta, StoryObj } from '@storybook/react-vite';
import { StrokeGuide } from './StrokeGuide';

const meta: Meta<typeof StrokeGuide> = {
  title: 'Phonics/StrokeGuide',
  component: StrokeGuide,
  args: {
    symbol: 'a',
  },
};

export default meta;
export const Default: StoryObj<typeof StrokeGuide> = {};
