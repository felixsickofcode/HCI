import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FeedbackBanner } from './FeedbackBanner';

const meta: Meta<typeof FeedbackBanner> = {
  title: 'Common/FeedbackBanner',
  component: FeedbackBanner,
};

export default meta;
type Story = StoryObj<typeof FeedbackBanner>;

export const Correct: Story = { args: { type: 'correct', message: 'Đúng rồi! Đây là âm mờ.' } };
export const TryAgain: Story = { args: { type: 'tryAgain', message: 'Chưa đúng, mình nghe lại nhé.' } };
export const Info: Story = { args: { type: 'info', message: 'Chọn thẻ chữ cái tương ứng.' } };
export const Hint: Story = {
  args: {
    type: 'hint',
    message: 'Chú ý thẻ có viền sáng nhẹ.',
    actionLabel: 'Nghe lại',
    onActionClick: fn(),
  },
};
