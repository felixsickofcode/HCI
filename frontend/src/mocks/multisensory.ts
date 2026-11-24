import type {
  SyllabusLesson,
  MultisensoryExercise,
  DailyGoalStatus,
} from '../types/phonics';

export const mockSyllabusLessons: SyllabusLesson[] = [
  { id: 'bai-01', title: 'Bài 01 – a, c, o, ô', category: 'Chương 1', status: 'not_started' },
  { id: 'bai-02', title: 'Bài 02 – ơ, d, đ, e, ê, l', category: 'Chương 1', status: 'not_started' },
  { id: 'bai-03', title: 'Bài 03 – b, g, h, i, ia', category: 'Chương 1', status: 'not_started' },
  { id: 'bai-04', title: 'Bài 04 – gh, gi, k, kh, m', category: 'Chương 1', status: 'not_started' },
  { id: 'bai-05', title: 'Bài 05 – n, nh, ng, ngh', category: 'Chương 2', status: 'not_started' },
  { id: 'bai-06', title: 'Bài 06 – p, ph, qu, r, s, x', category: 'Chương 2', status: 'not_started' },
  { id: 'bai-07', title: 'Bài 07 – t, th, tr, ch', category: 'Chương 2', status: 'not_started' },
  { id: 'bai-08', title: 'Bài 08 – u, ư, ua, ưa, v, y', category: 'Chương 2', status: 'not_started' },
  { id: 'bai-09', title: 'Bài 09 – am, ap, ăm, ăp, âm, âp', category: 'Chương 3', status: 'not_started' },
  { id: 'bai-10', title: 'Bài 10 – em, ep, êm, êp, im, ip', category: 'Chương 3', status: 'not_started' },
  { id: 'bai-11', title: 'Bài 11 – iêm, yêm, iêp, om, op, ôm, ôp', category: 'Chương 3', status: 'not_started' },
  { id: 'bai-12', title: 'Bài 12 – ơm, ơp, um, up, uôm, ươm, ươp', category: 'Chương 3', status: 'not_started' },
  { id: 'bai-13', title: 'Bài 13 – an, at, ăn, ăt, ân, ât', category: 'Chương 4', status: 'not_started' },
  { id: 'bai-14', title: 'Bài 14 – en, et, ên, êt, in, it', category: 'Chương 4', status: 'not_started' },
  { id: 'bai-15', title: 'Bài 15 – iên, iêt, yên, yêt, on, ot, ôn, ôt', category: 'Chương 4', status: 'not_started' },
  { id: 'bai-16', title: 'Bài 16 – ơn, ơt, un, ut, ưt, uôn, uôt, ươn, ươt', category: 'Chương 4', status: 'not_started' },
  { id: 'bai-17', title: 'Bài 17 – ang, ac, ăng, ăc, âng, âc', category: 'Chương 5', status: 'not_started' },
  { id: 'bai-18', title: 'Bài 18 – eng, ec, iêng, yêng, iêc, ong, oc, ông, ôc', category: 'Chương 5', status: 'not_started' },
  { id: 'bai-19', title: 'Bài 19 – ung, uc, ưng, ưc, uông, uôc, ương, ươc', category: 'Chương 5', status: 'not_started' },
  { id: 'bai-20', title: 'Bài 20 – anh, ach, ênh, êch, inh, ich', category: 'Chương 5', status: 'not_started' },
  { id: 'bai-21', title: 'Bài 21 – ai, ay, oi, ây, ôi, ơi', category: 'Chương 6', status: 'not_started' },
  { id: 'bai-22', title: 'Bài 22 – ui, ưi, uôi, ươi, ao, eo, au, âu', category: 'Chương 6', status: 'not_started' },
  { id: 'bai-23', title: 'Bài 23 – êu, iu, iêu, yêu, ưu, ươu', category: 'Chương 6', status: 'not_started' },
  { id: 'bai-24', title: 'Bài 24 – oa, oe, uê, uơ, uy, uya', category: 'Chương 7', status: 'not_started' },
  { id: 'bai-25', title: 'Bài 25 – oam, oăm, oan, oat, oăn, oăt, uân, uât', category: 'Chương 7', status: 'not_started' },
  { id: 'bai-26', title: 'Bài 26 – oen, oet, uyên, uyêt, uyn, uyt, oang, oac', category: 'Chương 7', status: 'not_started' },
  { id: 'bai-27', title: 'Bài 27 – oăng, oăc, oanh, oach, uênh, uêch, uynh, uych', category: 'Chương 7', status: 'not_started' },
  { id: 'bai-28', title: 'Bài 28 – oai, oay, uây và vần ít gặp', category: 'Chương 7', status: 'not_started' },
];

export const mockDailyGoal: DailyGoalStatus = {
  timeSpentMinutes: 15,
  timeTargetMinutes: 20,
  streakDays: 5,
  percentAchieved: 75,
};

// Bài 1: Phân biệt b - d và p - q
export const mockMultisensoryExercise: MultisensoryExercise = {
  id: 'ex-01-03',
  subject: 'Định hướng không gian chữ',
  stepIndicator: 'Bài 01 • Câu hỏi 3 / 5',
  title: "Nhận diện hướng xoay và âm thanh của ký tự 'b' và 'd'",
  description:
    'Nhìn hình khối, nghe âm thanh phát âm và chọn phương án đúng để gắn kết thị giác - thính giác.',
  progressPercent: 60,
  letters: [
    {
      title: 'Chữ b thường',
      symbol: 'b',
      badgeText: 'Bụng bên Phải',
      badgeIcon: 'arrow_forward',
      badgePosition: 'right',
      badgeColorClass: 'text-primary border-primary/20',
      description: 'Nét sổ thẳng trước → Vòng tròn bên tay phải',
      audioText: 'bờ',
    },
    {
      title: 'Chữ d thường',
      symbol: 'd',
      badgeText: 'Bụng bên Trái',
      badgeIcon: 'arrow_back',
      badgePosition: 'left',
      badgeColorClass: 'text-tertiary border-tertiary/30',
      description: 'Vòng tròn bên tay trái → Nét sổ thẳng đứng',
      audioText: 'dờ',
    },
  ],
  audioPrompt: {
    title: 'Phát âm thanh chuẩn: /b/ • bờ — /d/ • dờ',
    subtitle: 'Nhấn nghe để kích hoạt phản xạ thính giác âm đôi',
  },
  options: [
    {
      id: 'opt-a',
      key: 'A',
      text: "Chữ 'b' có bụng tròn quay sang bên phải (giống ngón cái bàn tay trái chỉ lên).",
      isCorrect: false,
    },
    {
      id: 'opt-b',
      key: 'B',
      text: "Chữ 'd' có bụng tròn quay sang bên trái và nét sổ thẳng đứng bên phải.",
      isCorrect: true,
    },
    {
      id: 'opt-c',
      key: 'C',
      text: 'Cả hai chữ đều có cấu trúc vòng cung cùng hướng xoay kim đồng hồ.',
      isCorrect: false,
    },
  ],
  correctOptionId: 'opt-b',
};

// Bài 2: Ghép âm thanh và hình ảnh biểu trưng
export const mockMultisensoryExercise2: MultisensoryExercise = {
  id: 'ex-02-01',
  subject: 'Liên kết thính giác - thị giác',
  stepIndicator: 'Bài 02 • Câu hỏi 1 / 4',
  title: "Nối âm thanh với hình ảnh đại diện: 'm' và 'n'",
  description:
    'Lắng nghe âm phát ra và quan sát số nét viết để phân biệt hai chữ có hình dạng gần giống nhau.',
  progressPercent: 0,
  letters: [
    {
      title: 'Chữ m thường',
      symbol: 'm',
      badgeText: '2 vòm cung',
      badgeIcon: 'expand_less',
      badgePosition: 'right',
      badgeColorClass: 'text-primary border-primary/20',
      description: 'Hai vòm cung đều nhau → đọc là "mờ"',
      audioText: 'mờ',
    },
    {
      title: 'Chữ n thường',
      symbol: 'n',
      badgeText: '1 vòm cung',
      badgeIcon: 'expand_less',
      badgePosition: 'left',
      badgeColorClass: 'text-tertiary border-tertiary/30',
      description: 'Một vòm cung đơn → đọc là "nờ"',
      audioText: 'nờ',
    },
  ],
  audioPrompt: {
    title: 'Phát âm thanh chuẩn: /m/ • mờ — /n/ • nờ',
    subtitle: 'Nhấn nghe và đếm số vòm cung khi viết từng chữ',
  },
  options: [
    {
      id: 'opt2-a',
      key: 'A',
      text: "Chữ 'm' có một vòm cung, chữ 'n' có hai vòm cung — ngược nhau.",
      isCorrect: false,
    },
    {
      id: 'opt2-b',
      key: 'B',
      text: "Chữ 'm' có hai vòm cung liên tiếp, chữ 'n' chỉ có một vòm cung duy nhất.",
      isCorrect: true,
    },
    {
      id: 'opt2-c',
      key: 'C',
      text: "Cả 'm' và 'n' đều được viết bằng các nét thẳng đứng không có đường cong.",
      isCorrect: false,
    },
  ],
  correctOptionId: 'opt2-b',
};

export const mockSidebarReadings = [
  {
    id: 'read-1',
    title: 'Kế hoạch Sinh tồn ở Đại học',
    progress: 60,
    isActive: true,
  },
  {
    id: 'read-2',
    title: 'Phương pháp tư duy trực quan cho não bộ',
    progress: 0,
    isActive: false,
  },
  {
    id: 'read-3',
    title: 'Lịch sử kiến trúc cổ điển phương Đông',
    progress: 0,
    isActive: false,
  },
  {
    id: 'read-4',
    title: 'Ghi chép nhanh và hệ thống Feynman',
    progress: 0,
    isActive: false,
  },
  {
    id: 'read-5',
    title: 'Quản lý năng lượng thay vì thời gian',
    progress: 0,
    isActive: false,
  },
];
