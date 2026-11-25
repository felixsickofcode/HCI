import { ApiError, apiFetch } from './api';

export interface ArticleSummary {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  readingTime: string;
  wordCount: number;
  comfortLevel?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export interface ArticleDetail extends ArticleSummary {
  /** Văn bản thuần, mỗi đoạn cách nhau bằng một dòng trống. */
  body: string;
}

export interface ArticleCatalog {
  items: ArticleSummary[];
  /** `api` khi lấy được từ backend; `sample` khi dùng bộ bài đọc nằm sẵn trong app. */
  source: 'api' | 'sample';
}

interface ArticleListResponse {
  items: ArticleSummary[];
  total: number;
}

export const fetchArticles = (signal?: AbortSignal) =>
  apiFetch<ArticleListResponse>('/articles', { signal });

export const fetchArticle = (id: string, signal?: AbortSignal) =>
  apiFetch<ArticleDetail>(`/articles/${encodeURIComponent(id)}`, { signal });

const isAbort = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

type SampleArticle = Omit<ArticleDetail, 'readingTime' | 'wordCount'> & { readingTime?: string };

const build = (article: SampleArticle): ArticleDetail => {
  const wordCount = article.body.trim().split(/\s+/u).length;
  return {
    ...article,
    wordCount,
    readingTime: article.readingTime ?? `${Math.max(1, Math.round(wordCount / 180))} phút đọc`,
  };
};

/**
 * Bộ bài đọc mẫu dùng khi backend chưa có `GET /articles`.
 * Nội dung ngắn hơn bài đọc thật trong proposal để tiện kiểm thử giao diện.
 */
export const sampleArticles: ArticleDetail[] = [
  build({
    id: 'nghe-thuat-thinh-lang',
    title: 'Nghệ thuật thinh lặng: Tìm lại sự tập trung giữa thời đại náo nhiệt',
    excerpt:
      'Những trích đoạn chiêm nghiệm của triết gia Marcus Aurelius về việc giữ gìn khoảng lặng bên trong nội tâm để thấu tỏ tri thức cuộc đời.',
    category: 'Triết học & Lối sống',
    author: 'H. Đặng dịch',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCRtYABG6jtVZEh3_4pysZhB4NZXmogBE95OR2w0NPzxsM3abf6TKcmKi3iIbtmRsT88KNtr-30L0GFu3Q1eTzeV26njAG_xsP81dteeW1JDIjw95aoyPYPmT3r6qUtza9dI5lcJikgTrTG6CP7fRGU-7xd-3iv694uvs2EmJqEk-LxhYoztLgLLvDqkcKbtFxuvCQcJI6APk8ZOUWjjURlTxfsqhajJvf9jzqRwYW-',
    imageAlt: 'Sách cổ điển bên hoa dại khô trên vải lanh màu ngà dưới ánh sáng ban mai',
    body: `Có một nghịch lý dễ thấy ở những người đọc nhiều: càng cố đọc nhanh, họ càng nhớ ít. Khi mắt lướt qua chữ mà tâm trí vẫn còn mải mang một cuộc trò chuyện dang dở, trang sách trở thành tấm nền cho những suy nghĩ khác. Sự thinh lặng không phải là phép màu chữa lành, mà là điều kiện để mắt và trí nhớ gặp nhau ở cùng một chỗ.

Marcus Aurelius từng ghi lại rằng con người luôn có thể rút về một nơi yên tĩnh trong chính mình, và đó là nơi duy nhất ta thật sự làm chủ. Ông không nói về việc trốn tránh thế giới. Ông nói về một khoảng dừng đủ ngắn để ta kịp hiểu điều mình vừa đọc, trước khi thế giới chen vào bằng thông báo tiếp theo.

Với người đọc chậm, khoảng dừng ấy thường bị coi là dấu hiệu của sự chậm chạp. Nhưng nếu nhìn kỹ quá trình đọc, ta thấy mỗi câu dài cần vài nhịp thở để tách thành cụm nghĩa. Người đọc tốt không phải người đọc ít nhịp, mà là người biết đặt nhịp đúng chỗ: sau dấu phẩy, trước một liên từ, ở chỗ câu chuyển ý.

Khi giao diện đọc giúp ta giữ được nhịp ấy — bằng khoảng cách dòng rộng hơn, một dải sáng đánh dấu dòng đang đọc, hay một khung văn bản hẹp vừa tầm mắt — ta không đọc nhanh hơn. Ta đọc liền mạch hơn. Và sự liền mạch chính là thứ tạo ra cảm giác hiểu, cảm giác rằng trang sách đang nói với riêng mình ta.`,
  }),
  build({
    id: 'nhip-dieu-sinh-hoc-cua-mat',
    title: 'Nhịp điệu sinh học của đôi mắt và sự tiếp nhận ngôn từ',
    excerpt:
      'Cách bộ não giải mã các ký tự hình học trong vô thức và vì sao độ tương phản mềm mại lại giúp tăng khả năng ghi nhớ lâu dài.',
    category: 'Khoa học Nhận thức',
    author: 'Viện Thị Giác',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB6qkob3qSd5ZhtggXaaZDL3RJevlEsNyHEf1jToLVUPB8F9P9QADwx5nu03g7N5W-G0mTuLFtyYY_JvWZLnxECDZJtU4eRsje4089f5DQU2GLrkP5eCs7g4PBE1hIOSen82PWkklxoW7_eU5Bf78gl-pIHOUUwWBrE-1Z36RGEAw7KVDA-pN5KZIZfzO47_6f6GxS0_uavocrYzFNzbdQo3bviTuCKAOE16uDC-7Wo',
    imageAlt: 'Vườn đá thanh tịnh phong cách Nhật Bản với cát lượn sóng và rêu phong',
    body: `Mắt người không quét văn bản theo một đường thẳng đều đặn. Nó nhảy theo từng đợt gọi là saccade, dừng lại ở vài ba chỗ gọi là fixation, rồi lại nhảy tiếp. Mỗi lần dừng như vậy kéo dài khoảng hai trăm mili giây — đủ để một cụm từ được nạp vào trí nhớ làm việc.

Điều đáng chú ý là độ dài của mỗi bước nhảy phụ thuộc vào độ quen thuộc của chữ. Với người đọc thành thạo, bước nhảy dài hơn và số lần dừng ít hơn. Với người đọc chậm, mắt dừng nhiều hơn, và mỗi lần dừng thường rơi vào giữa một từ dài hoặc một cụm nhiều âm tiết, khiến nghĩa bị cắt đôi.

Ánh sáng nền cũng tham gia vào quá trình này. Nền trắng tuyệt đối với chữ đen tạo tương phản cao, kích thích mắt mạnh, và với người dễ mỏi mắt, nó làm tăng cảm giác chói sau vài chục phút. Nền kem ấm, chữ nâu than, cùng độ giãn dòng rộng hơn, giảm số lần mắt phải điều tiết lại, nhờ đó duy trì được nhịp đọc ổn định trong thời gian dài hơn.

Hiểu cơ chế này giúp việc thiết kế giao diện đọc trở nên có căn cứ: không phải trang trí cho đẹp, mà là can thiệp đúng vào những điểm mà mắt và trí nhớ làm việc cùng nhau.`,
  }),
  build({
    id: 'mui-giay-cu',
    title: 'Mùi giấy cũ và hơi ấm của những thư viện cổ kính',
    excerpt:
      'Tản văn hoài niệm về cảm giác ngắm nhìn những vết mực in thủ công trên nền giấy xơ gai dầu, nơi ký ức văn hóa được lưu giữ trọn vẹn.',
    category: 'Văn học & Nghệ thuật',
    author: 'Thạch Lam tuyển',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuASKHcC7zkcOEk77oNW1de67WePOKRawtcyPE6eWyFQK7GeUPjBe9hUuG7LeLVna_yAAVd-xtg907UfZZz3nwJ1qI_iPXhAf56GDCuV31LGv8O3bF2Kf4s_LljPfuLOSmZW6E33pKPh1FKxLxexpWZSEAg5NS-otqKnvJar2WFsvCUgTn8LiayahyYh3xvwoRQY0FDU6fDMLj767ud2aPDOHNHm3AHto4siq8izC1dx',
    imageAlt: 'Bát trà gốm men rạn tinh xảo đặt trên mặt gỗ mộc trong phòng trà sương sớm',
    body: `Mùi của một thư viện cũ không giống bất cứ mùi nào khác. Đó là mùi bụi giấy đã khô đi qua nhiều mùa nồm, mùi keo gáy sách ngả màu, và một chút mùi ẩm của tường đá mà nắng chưa từng chạm tới. Người ta thường nhớ mùi ấy trước khi nhớ tên cuốn sách mình đã đọc.

Những trang giấy xơ gai dầu in mực thủ công có chỗ đậm chỗ nhạt, khiến hàng chữ không hoàn toàn thẳng. Chính sự không đều ấy làm cho việc đọc trở thành một việc làm có nhịp: mắt đi chậm lại ở chỗ mực loang, nhanh hơn ở chỗ chữ đều. Đọc sách cũ là đọc bằng cả thị giác và trí tưởng tượng về bàn tay đã in nó.

Ngày nay, chữ hiện trên màn hình đều tăm tắp đến mức hoàn hảo, và sự hoàn hảo ấy đôi khi lấy đi cảm giác ấm áp. Nhưng điều chúng ta có thể giữ lại không phải là vết mực loang, mà là nhịp đọc: một tốc độ vừa phải, một khoảng trắng đủ rộng giữa các dòng, một chỗ dừng cho mắt trước khi sang trang.

Khi thiết kế một trang đọc cho người dễ mỏi mắt, mục tiêu không phải là bắt chước giấy cũ. Mục tiêu là trả lại cho người đọc cái cảm giác được phép chậm — cảm giác mà một thư viện cổ vẫn luôn dành sẵn cho bất cứ ai bước vào.`,
  }),
  build({
    id: 'bien-phat-quang',
    title: 'Bí ẩn của đại dương và những sinh vật phát quang',
    excerpt:
      'Dưới độ sâu hai trăm mét, ánh sáng mặt trời vụt tắt nhưng biển khơi không hề tĩnh mịch: hàng triệu tia sáng lạnh tự thắp lên giữa màn đêm vĩnh cửu.',
    category: 'Thiên nhiên & Khoa học',
    author: 'TS. Vũ Hoàng Yến',
    body: `Khi ánh sáng mặt trời hoàn toàn vụt tắt ở độ sâu vượt quá hai trăm mét, hành tinh của chúng ta không hề biến thành một cõi hoang vu tĩnh mịch. Ngược lại, tầng nước xanh thẳm ấy hé mở một vũ trụ diệu kỳ — nơi hàng triệu tia sáng mềm mại tự thắp lên giữa màn đêm vĩnh cửu của biển khơi. Hiện tượng phát quang sinh học không chỉ là tấm áo rực rỡ, mà là ngôn ngữ sinh tồn tối thượng của muôn loài.

Khác biệt với ánh đèn nhân tạo nóng rực, nguồn quang năng dưới đáy đại dương hoàn toàn là một dạng ánh sáng lạnh. Chưa đầy hai mươi phần trăm năng lượng bị chuyển hóa thành nhiệt; phần còn lại tỏa ra một sắc xanh lam hoặc lục ngọc thanh khiết. Hai gam màu này ngự trị bởi chúng sở hữu bước sóng ngắn nhất, cho phép ánh sáng xuyên qua khối nước dày đặc mà không bị hấp thụ nhanh chóng.

Bí mật hóa học của vũ điệu này nằm ở sự kết hợp giữa hợp chất hữu cơ luciferin và chất xúc tác enzyme luciferase. Khi phân tử oxy tiếp xúc với phản ứng này, một chuỗi electron được kích hoạt, giải phóng các photon lấp lánh như bụi sao. Từ loài sứa lược mong manh như pha lê cho đến những bầy tôm sâu thẳm, chúng dùng thứ ánh sáng ấy để ngụy trang, xua đuổi kẻ săn mồi hoặc tìm kiếm tri kỷ trong cõi mịt mùng.

Với người lữ hành trên mặt đất, việc chiêm ngưỡng từng con sóng bừng sáng bên bờ vịnh đêm hè tựa hồ như một giấc mộng thanh bình. Những đốm sáng li ti chớp tắt khi bàn tay khuấy nhẹ làn nước mát lạnh chính là lời nhắc nhở dịu dàng về sức sống bền bỉ đang diễn ra mỗi giây phút dưới đáy sâu khôn cùng.`,
  }),
  build({
    id: 'doc-cham-khong-phai-doc-kem',
    title: 'Đọc chậm không phải là đọc kém',
    excerpt:
      'Vì sao tốc độ đọc không nói lên năng lực hiểu, và những hỗ trợ nào thật sự giúp người đọc chậm tự tin hơn khi tiếp cận văn bản dài.',
    category: 'Giáo dục & Học tập',
    author: 'Nhóm Nghiên cứu HCI',
    body: `Trong hầu hết lớp học, tốc độ đọc bị dùng như một thước đo năng lực. Học sinh đọc nhanh được xem là tiến bộ, còn em đọc chậm thường bị nhắc nhở. Nhưng các nghiên cứu về đọc hiểu cho thấy một điều khác: tốc độ và mức hiểu không đi cùng một đường thẳng. Đọc quá nhanh làm giảm khả năng ghi nhớ ý chính; đọc chậm có kiểm soát lại thường giữ được nhiều chi tiết hơn.

Vấn đề thật sự của người đọc chậm không nằm ở tốc độ, mà ở chỗ họ mất vị trí. Mắt trượt xuống dòng dưới, câu bị đọc lại từ đầu, và mỗi lần như vậy là một lần mất đà. Sau vài chục lần, cảm giác mệt xuất hiện trước khi nội dung kịp đọng lại.

Vì vậy, hỗ trợ hữu ích nhất không phải là công cụ tăng tốc, mà là công cụ giữ chỗ: một dải sáng bám theo dòng đang đọc, một khung văn bản hẹp vừa tầm mắt, một nút quay lại đúng đoạn vừa rời. Những thứ này không làm người đọc nhanh hơn, chúng làm người đọc ít bị ngắt quãng hơn.

Cùng với đó là quyền được điều chỉnh. Khi người học tự chọn cỡ chữ, độ giãn dòng và màu nền, họ không chỉ chỉnh giao diện — họ đang nói rằng "đây là cách tôi đọc tốt nhất". Một sản phẩm tôn trọng điều đó sẽ đánh giá người dùng bằng mức hiểu, chứ không bằng số giây trên mỗi trang.`,
  }),
];

const toSummary = (article: ArticleDetail): ArticleSummary => ({
  id: article.id,
  title: article.title,
  excerpt: article.excerpt,
  category: article.category,
  author: article.author,
  readingTime: article.readingTime,
  wordCount: article.wordCount,
  comfortLevel: article.comfortLevel,
  imageSrc: article.imageSrc,
  imageAlt: article.imageAlt,
});

export const isSampleArticle = (id: string) => sampleArticles.some(article => article.id === id);

/**
 * Lấy danh sách bài đọc từ backend. Khi backend chưa có endpoint `/articles`
 * (404) hoặc không kết nối được, trả bộ bài đọc mẫu để giao diện vẫn dùng được;
 * các lỗi khác được ném ra để màn thư viện hiện trạng thái lỗi và cho thử lại.
 */
export async function loadCatalog(signal?: AbortSignal): Promise<ArticleCatalog> {
  try {
    const page = await fetchArticles(signal);
    if (page.items.length) return { items: page.items, source: 'api' };
  } catch (error) {
    if (isAbort(error)) throw error;
    const unavailable = !(error instanceof ApiError) || error.status === 404;
    if (!unavailable) throw error;
  }
  return { items: sampleArticles.map(toSummary), source: 'sample' };
}

/** Lấy toàn văn một bài đọc. Bài mẫu luôn đọc tại chỗ, không gọi mạng. */
export async function loadArticle(id: string, signal?: AbortSignal): Promise<ArticleDetail> {
  const sample = sampleArticles.find(article => article.id === id);
  if (sample) return sample;
  return fetchArticle(id, signal);
}
