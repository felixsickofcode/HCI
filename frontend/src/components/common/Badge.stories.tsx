import type { Meta, StoryObj } from '@storybook/react-vite';
import { CategoryBadge, HighlightMark, TagMarker } from './Badge';

const meta: Meta<typeof TagMarker> = {
  title: 'Common/Badge',
  component: TagMarker,
};

export default meta;

export const Tag: StoryObj<typeof TagMarker> = {
  args: { label: 'Ấn bản kỹ thuật số thuần khiết' },
};

export const Category: StoryObj<typeof CategoryBadge> = {
  render: () => <CategoryBadge label="Khoa học Nhận thức" />,
};

export const Highlight: StoryObj<typeof HighlightMark> = {
  render: () => (
    <p>
      Đây là <HighlightMark>đoạn văn được đánh dấu</HighlightMark> trong bài đọc.
    </p>
  ),
};
