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
