import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AudioButton } from './AudioButton';

const meta: Meta<typeof AudioButton> = {
  title: 'Phonics/AudioButton',
  component: AudioButton,
  args: { label: 'Nghe', onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof AudioButton>;

export const Primary: Story = {};
export const Playing: Story = { args: { isPlaying: true } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Subtle: Story = { args: { variant: 'subtle', size: 'md' } };
export const Disabled: Story = { args: { disabled: true } };
