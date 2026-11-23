export interface PhonicsCurriculumLesson {
  id: string;
  title: string;
  sounds: string;
}

export interface PhonicsCurriculumChapter {
  id: string;
  title: string;
  shortTitle: string;
  lessons: PhonicsCurriculumLesson[];
}

export const phonicsCurriculum: PhonicsCurriculumChapter[] = [
  {
    id: 'chapter-1',
    title: 'Chương 1: Âm và chữ cơ bản',
    shortTitle: 'Chương 1',
    lessons: [
      { id: 'bai-01', title: 'Bài 1: a, c, o, ô', sounds: 'a, c, o, ô' },
      { id: 'bai-02', title: 'Bài 2: ơ, d, đ, e, ê, l', sounds: 'ơ, d, đ, e, ê, l' },
      { id: 'bai-03', title: 'Bài 3: b, g, h, i, ia', sounds: 'b, g, h, i, ia' },
      { id: 'bai-04', title: 'Bài 4: gh, gi, k, kh, m', sounds: 'gh, gi, k, kh, m' },
    ],
  },
  {
    id: 'chapter-2',
    title: 'Chương 2',
    shortTitle: 'Chương 2',
    lessons: [
      { id: 'bai-05', title: 'Bài 5: n, nh, ng, ngh', sounds: 'n, nh, ng, ngh' },
      { id: 'bai-06', title: 'Bài 6: p, ph, qu, r, s, x', sounds: 'p, ph, qu, r, s, x' },
      { id: 'bai-07', title: 'Bài 7: t, th, tr, ch', sounds: 't, th, tr, ch' },
      { id: 'bai-08', title: 'Bài 8: u, ư, ua, ưa, v, y', sounds: 'u, ư, ua, ưa, v, y' },
    ],
  },
  {
    id: 'chapter-3',
    title: 'Chương 3: Vần -m, -p',
    shortTitle: 'Chương 3',
    lessons: [
      { id: 'bai-09', title: 'Bài 9: am, ap, ăm, ăp, âm, âp', sounds: 'am, ap, ăm, ăp, âm, âp' },
      { id: 'bai-10', title: 'Bài 10: em, ep, êm, êp, im, ip', sounds: 'em, ep, êm, êp, im, ip' },
      { id: 'bai-11', title: 'Bài 11: iêm, yêm, iêp, om, op, ôm, ôp', sounds: 'iêm, yêm, iêp, om, op, ôm, ôp' },
      { id: 'bai-12', title: 'Bài 12: ơm, ơp, um, up, uôm, ươm, ươp', sounds: 'ơm, ơp, um, up, uôm, ươm, ươp' },
    ],
  },
  {
    id: 'chapter-4',
    title: 'Chương 4: Vần -n, -t',
    shortTitle: 'Chương 4',
    lessons: [
      { id: 'bai-13', title: 'Bài 13: an, at, ăn, ăt, ân, ât', sounds: 'an, at, ăn, ăt, ân, ât' },
      { id: 'bai-14', title: 'Bài 14: en, et, ên, êt, in, it', sounds: 'en, et, ên, êt, in, it' },
      { id: 'bai-15', title: 'Bài 15: iên, iêt, yên, yêt, on, ot, ôn, ôt', sounds: 'iên, iêt, yên, yêt, on, ot, ôn, ôt' },
      { id: 'bai-16', title: 'Bài 16: ơn, ơt, un, ut, ưt, uôn, uôt, ươn, ươt', sounds: 'ơn, ơt, un, ut, ưt, uôn, uôt, ươn, ươt' },
    ],
  },
  {
    id: 'chapter-5',
    title: 'Chương 5: Vần -ng, -c, -nh, -ch',
    shortTitle: 'Chương 5',
    lessons: [
      { id: 'bai-17', title: 'Bài 17: ang, ac, ăng, ăc, âng, âc', sounds: 'ang, ac, ăng, ăc, âng, âc' },
      { id: 'bai-18', title: 'Bài 18: eng, ec, iêng, yêng, iêc, ong, oc, ông, ôc', sounds: 'eng, ec, iêng, yêng, iêc, ong, oc, ông, ôc' },
      { id: 'bai-19', title: 'Bài 19: ung, uc, ưng, ưc, uông, uôc, ương, ươc', sounds: 'ung, uc, ưng, ưc, uông, uôc, ương, ươc' },
      { id: 'bai-20', title: 'Bài 20: anh, ach, ênh, êch, inh, ich', sounds: 'anh, ach, ênh, êch, inh, ich' },
    ],
  },
  {
    id: 'chapter-6',
    title: 'Chương 6: Vần có âm cuối i, y, o, u',
    shortTitle: 'Chương 6',
    lessons: [
      { id: 'bai-21', title: 'Bài 21: ai, ay, oi, ây, ôi, ơi', sounds: 'ai, ay, oi, ây, ôi, ơi' },
      { id: 'bai-22', title: 'Bài 22: ui, ưi, uôi, ươi, ao, eo, au, âu', sounds: 'ui, ưi, uôi, ươi, ao, eo, au, âu' },
      { id: 'bai-23', title: 'Bài 23: êu, iu, iêu, yêu, ưu, ươu', sounds: 'êu, iu, iêu, yêu, ưu, ươu' },
    ],
  },
  {
    id: 'chapter-7',
    title: 'Chương 7: Vần có âm đệm',
    shortTitle: 'Chương 7',
    lessons: [
      { id: 'bai-24', title: 'Bài 24: oa, oe, uê, uơ, uy, uya', sounds: 'oa, oe, uê, uơ, uy, uya' },
      { id: 'bai-25', title: 'Bài 25: oam, oăm, oan, oat, oăn, oăt, uân, uât', sounds: 'oam, oăm, oan, oat, oăn, oăt, uân, uât' },
      { id: 'bai-26', title: 'Bài 26: oen, oet, uyên, uyêt, uyn, uyt, oang, oac', sounds: 'oen, oet, uyên, uyêt, uyn, uyt, oang, oac' },
      { id: 'bai-27', title: 'Bài 27: oăng, oăc, oanh, oach, uênh, uêch, uynh, uych', sounds: 'oăng, oăc, oanh, oach, uênh, uêch, uynh, uych' },
      { id: 'bai-28', title: 'Bài 28: oai, oay, uây và vần ít gặp', sounds: 'oai, oay, uây; các vần ít gặp' },
    ],
  },
];
