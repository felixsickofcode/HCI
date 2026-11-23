import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LetterDisplay } from './LetterDisplay';

const meta: Meta<typeof LetterDisplay> = {
  title: 'Phonics/LetterDisplay',
  component: LetterDisplay,
  args: { letter: 'm', type: 'consonant' },
};

export default meta;
type Story = StoryObj<typeof LetterDisplay>;

export const Consonant: Story = {};
export const Vowel: Story = { args: { letter: 'a', type: 'vowel', size: 'lg' } };
export const Highlighted: Story = { args: { highlighted: true } };
export const Interactive: Story = { args: { interactive: true, onClick: fn() } };
