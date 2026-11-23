import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  ManuscriptCard,
  PillarCard,
  ReadingCard,
} from './Card';

const meta: Meta<typeof Card> = {
  title: 'Common/Card',
  component: Card,
};

export default meta;

export const Default: StoryObj<typeof Card> = {
  render: () => <Card><p>Nội dung card mẫu.</p></Card>,
};

export const Reading: StoryObj<typeof ReadingCard> = {
  render: () => (
    <div className="max-w-sm">
      <ReadingCard
        imageSrc="/assets/images/m/meo.svg"
        category="Khoa học Nhận thức"
        readingTime="6 phút đọc"
        title="Nghệ thuật thinh lặng"
        excerpt="Tìm lại sự tập trung giữa thời đại náo nhiệt."
        author="LexiEase"
      />
    </div>
  ),
};

export const Pillar: StoryObj<typeof PillarCard> = {
  render: () => (
    <div className="max-w-sm">
      <PillarCard
        icon="visibility"
        title="Dẫn nhịp quang học"
        description="Lớp phủ sắc độ giúp mắt chuyển hàng mượt mà."
        metricLabel="Ổn định tiêu cự"
        metricValue="Êm dịu"
        progressPercent={88}
      />
    </div>
  ),
};

export const Manuscript: StoryObj<typeof ManuscriptCard> = {
  render: () => (
    <ManuscriptCard>
      <h2 className="font-headline text-2xl">Bản thảo</h2>
      <p className="mt-4">Nội dung văn bản trong card bản thảo.</p>
    </ManuscriptCard>
  ),
};
