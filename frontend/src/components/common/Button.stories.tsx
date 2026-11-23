import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Common/Button',
  component: Button,
  args: {
    children: 'Đăng ký',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Đăng ký',
    variant: 'primary',
  },
};

export const PrimarySolid: Story = {
  args: { children: 'Xác nhận', variant: 'primary-solid' },
};

export const Secondary: Story = {
  args: { children: 'Tiếp tục', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Hủy', variant: 'ghost' },
};

export const Icon: Story = {
  args: { children: undefined, variant: 'icon', icon: 'arrow_forward', 'aria-label': 'Tiếp theo' },
};

export const Disabled: Story = {
  args: {
    children: 'Không thể nhấn',
    disabled: true,
  },
};