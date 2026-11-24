import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DropZoneInput, Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Common/Input',
  component: Input,
};

export default meta;

export const TextInput: StoryObj<typeof Input> = {
  args: {
    icon: 'person',
    placeholder: 'Tên người dùng',
  },
};

export const DropZone: StoryObj<typeof DropZoneInput> = {
  render: () => (
    <DropZoneInput
      value=""
      onChange={fn()}
      onSubmit={fn()}
      onFileSelect={fn()}
    />
  ),
};

export const DropZoneLoading: StoryObj<typeof DropZoneInput> = {
  render: () => (
    <DropZoneInput
      value=""
      onCancel={fn()}
      isLoading
      fileName="bai-doc.pdf"
    />
  ),
};
