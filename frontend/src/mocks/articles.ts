export interface ArticleSummary {
  id: string;
  category: string;
  readingTime: string;
  comfortLevel: string;
  title: string;
  excerpt: string;
  author: string;
  imageSrc: string;
  imageAlt: string;
}

export interface ReadingManuscript {
  id: string;
  folioSeries: string;
  folioVolume: string;
  folioPage: string;
  sectionPart: string;
  title: string;
  author: string;
  readingTime: string;
  wordCount: string;
  audioDuration: number; // in seconds
  leadParagraph: string;
  secondParagraph: string;
  calloutQuote: string;
  thirdParagraph: string;
  figureImageSrc: string;
  figureImageAlt: string;
  figureCaption: string;
  fourthParagraph: string;
  closingParagraph: string;
  prevChapter: string;
  currentChapterIndex: string;
  nextChapter: string;
}

export const mockCuratedArticles: ArticleSummary[] = [
  {
    id: '1',
    category: 'Triết học & Lối sống',
    readingTime: '6 phút đọc',
    comfortLevel: '100%',
    title: 'Nghệ thuật thinh lặng: Tìm lại sự tập trung giữa thời đại náo nhiệt',
    excerpt:
      'Những trích đoạn chiêm nghiệm sâu sắc của triết gia Marcus Aurelius về việc giữ gìn khoảng lặng bên trong nội tâm để thấu tỏ tri thức cuộc đời.',
    author: 'Tác giả: H. Đặng dịch',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCRtYABG6jtVZEh3_4pysZhB4NZXmogBE95OR2w0NPzxsM3abf6TKcmKi3iIbtmRsT88KNtr-30L0GFu3Q1eTzeV26njAG_xsP81dteeW1JDIjw95aoyPYPmT3r6qUtza9dI5lcJikgTrTG6CP7fRGU-7xd-3iv694uvs2EmJqEk-LxhYoztLgLLvDqkcKbtFxuvCQcJI6APk8ZOUWjjURlTxfsqhajJvf9jzqRwYW-',
    imageAlt: 'Sách cổ điển bên hoa dại khô trên vải lanh màu ngà dưới ánh sáng ban mai',
  },
  {
    id: '2',
    category: 'Khoa học Nhận thức',
    readingTime: '9 phút đọc',
    comfortLevel: '98%',
    title: 'Nhịp điệu sinh học của đôi mắt và sự tiếp nhận ngôn từ',
    excerpt:
      'Cách bộ não chúng ta giải mã các ký tự hình học trong vô thức và vì sao độ tương phản mềm mại lại giúp tăng khả năng ghi nhớ lâu dài.',
    author: 'Tác giả: Viện Thị Giác',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB6qkob3qSd5ZhtggXaaZDL3RJevlEsNyHEf1jToLVUPB8F9P9QADwx5nu03g7N5W-G0mTuLFtyYY_JvWZLnxECDZJtU4eRsje4089f5DQU2GLrkP5eCs7g4PBE1hIOSen82PWkklxoW7_eU5Bf78gl-pIHOUUwWBrE-1Z36RGEAw7KVDA-pN5KZIZfzO47_6f6GxS0_uavocrYzFNzbdQo3bviTuCKAOE16uDC-7Wo',
    imageAlt: 'Vườn đá thanh tịnh phong cách Nhật Bản với cát lượn sóng và rêu phong',
  },
  {
    id: '3',
    category: 'Văn học & Nghệ thuật',
    readingTime: '5 phút đọc',
    comfortLevel: '100%',
    title: 'Mùi giấy cũ và hơi ấm của những thư viện cổ kính',
    excerpt:
      'Tản văn hoài niệm về cảm giác ngắm nhìn những vết mực in thủ công trên nền giấy xơ gai dầu, nơi ký ức văn hóa được lưu giữ trọn vẹn.',
    author: 'Tác giả: Thạch Lam tuyển',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuASKHcC7zkcOEk77oNW1de67WePOKRawtcyPE6eWyFQK7GeUPjBe9hUuG7LeLVna_yAAVd-xtg907UfZZz3nwJ1qI_iPXhAf56GDCuV31LGv8O3bF2Kf4s_LljPfuLOSmZW6E33pKPh1FKxLxexpWZSEAg5NS-otqKnvJar2WFsvCUgTn8LiayahyYh3xvwoRQY0FDU6fDMLj767ud2aPDOHNHm3AHto4siq8izC1dx',
    imageAlt: 'Bát trà gốm men rạn tinh xảo đặt trên mặt gỗ mộc trong phòng trà sương sớm',
  },
];

export const mockReadingManuscript: ReadingManuscript = {
  id: 'deep-ocean-bioluminescence',
  folioSeries: 'LexiEase Chuyên Sâu',
  folioVolume: 'Tập II · Thám Hiểm',
  folioPage: 'Trang 42',
  sectionPart: 'Phần Một: Độ Sâu Thẳm',
  title: 'Bí Ẩn Của Đại Dương & Những Sinh Vật Phát Quang',
  author: 'TS. Vũ Hoàng Yến',
  readingTime: '7 phút đọc thư thái',
  wordCount: '1.480 từ',
  audioDuration: 438, // 07:18
  leadParagraph:
    'Khi ánh sáng mặt trời hoàn toàn vụt tắt ở độ sâu vượt quá hai trăm mét, hành tinh của chúng ta không hề biến thành một cõi hoang vu tĩnh mịch. Ngược lại, tầng nước xanh thẳm ấy hé mở một vũ trụ diệu kỳ—nơi hàng triệu tia sáng mềm mại tự thắp lên giữa màn đêm vĩnh cửu của biển khơi. Hiện tượng phát quang sinh học (Bioluminescence) không chỉ là tấm áo rực rỡ, mà là ngôn ngữ sinh tồn tối thượng của muôn loài.',
  secondParagraph:
    'Khác biệt với ánh đèn nhân tạo nóng rực, nguồn quang năng dưới đáy đại dương hoàn toàn là một dạng ánh sáng lạnh. Chưa đầy hai mươi phần trăm năng lượng bị chuyển hóa thành nhiệt; toàn bộ phần còn lại tỏa ra một sắc xanh lam hoặc lục ngọc thanh khiết. Sở dĩ hai gam màu này ngự trị là bởi chúng sở hữu bước sóng ngắn nhất, cho phép ánh sáng xuyên qua khối nước dầy đặc mà không bị hấp thụ nhanh chóng.',
  calloutQuote:
    '“Dưới đáy vực thẳm sâu hàng ngàn sải nước, bóng tối không phải là điểm kết thúc của thị giác, mà là bức màn nhung cho bản hòa tấu ánh sáng bắt đầu.”',
  thirdParagraph:
    'Bí mật hóa học của vũ điệu này nằm ở sự kết hợp giữa một hợp chất hữu cơ mang tên luciferin và chất xúc tác enzyme luciferase. Khi phân tử oxy tiếp xúc với phản ứng này, một chuỗi electron được kích hoạt, giải phóng các photon lấp lánh như bụi sao. Từ loài sứa lược mong manh như pha lê cho đến những bầy tôm sâu thẳm, chúng sử dụng thứ ánh sáng này để ngụy trang bằng phương thức phản chiếu ngược, xua đuổi kẻ săn mồi hoặc tìm kiếm tri kỷ trong cõi mịt mùng.',
  figureImageSrc:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCNa9xf7xGP0_qvtjoFpaa_kk16Gh0_Rwe7yPNeF6o2fVeUoFIkmctsW6rLxeHrHp0WZreUXPzq5jQfgyDrXWu9IbcmydQBiO6KDB-5WQ1tzRLY1aF9LHshBDbti3XiVP09ATQ5-cyDyTmMhsxmNCIFj0OZlcPkT_24RNBq-deN9kuLy-WcMYTeMibY-h45YP211ZFsU8VeSgke0zi9Y-Oj67kfPD39xwIqDKiTtA2X',
  figureImageAlt:
    'Ảnh chụp sứa biển phát quang thanh khiết giữa tầng nước xanh lam thẫm tĩnh lặng',
  figureCaption:
    'Loài sứa Aequorea victoria tỏa ánh hào quang lục lam thanh nhã giữa tầng nước trung khơi.',
  fourthParagraph:
    'Đối với những người lữ hành trên mặt đất, việc chiêm ngưỡng từng con sóng bừng sáng bên bờ vịnh đêm hè tựa hồ như một giấc mộng thanh bình. Những đốm sáng nhỏ li ti chớp tắt khi bàn tay khuấy nhẹ vào làn nước biển mát lạnh chính là lời nhắc nhở dịu dàng về sức sống bền bỉ và vẻ đẹp thầm lặng đang diễn ra mỗi giây phút dưới đáy sâu khôn cùng.',
  closingParagraph:
    'Khi gấp lại trang sách này và nhắm mắt lại, hãy để tâm trí chìm lắng vào sự tĩnh lặng vô bờ của lòng đại dương. Con chữ trên trang giấy đã lắng xuống, chỉ còn lại sự an yên trong nhịp thở và miền tưởng tượng bao la đang mở ra.',
  prevChapter: 'Mở Đầu: Bản Đồ Thăm Dò',
  currentChapterIndex: '2 / 12',
  nextChapter: 'Chương 2: Vực Thẳm Mariana',
};
