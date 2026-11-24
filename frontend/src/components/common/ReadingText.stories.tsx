import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReadingText } from './ReadingText';

const meta: Meta<typeof ReadingText> = {
  title: 'Common/ReadingText',
  component: ReadingText,
  args: {
    blocks: [
      { id: 'paragraph-1', text: 'Đọc chậm giúp chúng ta hiểu sâu hơn từng ý.', type: 'paragraph' },
      { id: 'quote-1', text: 'Khoảng lặng là điểm bắt đầu của sự tập trung.', type: 'quote' },
    ],
    activeBoundary: null,
  },
};

export default meta;

export const Default: StoryObj<typeof ReadingText> = {};

export const Highlighted: StoryObj<typeof ReadingText> = {
  args: {
    activeBoundary: { segmentId: 'paragraph-1', segmentIndex: 0, charIndex: 5, charLength: 4 },
  },
};
