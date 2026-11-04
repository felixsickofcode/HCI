export interface PillarItem {
  id: string;
  icon: string;
  iconColorClass: string;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  progressPercent: number;
  progressBarColorClass: string;
}

export const mockPillars: PillarItem[] = [
  {
    id: 'pillar-1',
    icon: 'format_shapes',
    iconColorClass: 'text-primary',
    title: 'Kiến trúc ký tự định vị',
    description:
      'Các nét chữ sở hữu trọng tâm chân đế dày dặn, loại bỏ hiện tượng nhầm lẫn đối xứng thường gặp ở những chữ cái tương đồng như b/d, p/q.',
    metricLabel: 'Độ phân giải nhận diện',
    metricValue: '99.2%',
    progressPercent: 94,
    progressBarColorClass: 'bg-primary',
  },
  {
    id: 'pillar-2',
    icon: 'visibility',
    iconColorClass: 'text-tertiary',
    title: 'Dẫn nhịp quang học tự nhiên',
    description:
      'Lớp phủ gradient sắc độ tối giản giúp mắt chuyển hàng mượt mà, ngăn hiện tượng lặp dòng mà không gây ngắt quãng dòng suy tưởng.',
    metricLabel: 'Ổn định tiêu cự mắt',
    metricValue: 'Êm dịu',
    progressPercent: 88,
    progressBarColorClass: 'bg-tertiary',
  },
  {
    id: 'pillar-3',
    icon: 'graphic_eq',
    iconColorClass: 'text-on-surface',
    title: 'Âm thanh đồng hành thinh lặng',
    description:
      'Giọng đọc AI ngữ điệu tự nhiên, ấm áp như người bạn đồng hành. Có thể chuyển đổi tức thì sang chế độ đọc bằng tai khi đôi mắt cần nghỉ ngơi.',
    metricLabel: 'Ngữ điệu truyền cảm',
    metricValue: 'Tự nhiên',
    progressPercent: 96,
    progressBarColorClass: 'bg-on-surface',
  },
];
