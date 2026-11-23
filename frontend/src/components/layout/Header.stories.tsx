import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context';
import { Header } from './Header';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;
export const Default: StoryObj<typeof Header> = {};
