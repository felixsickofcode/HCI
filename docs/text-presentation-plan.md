# Kế hoạch triển khai trình bày văn bản

Ngày lập: 2026-11-13. Trạng thái: bước 1–4 đã có trong code; chế độ xem PDF/ảnh gốc ở mục 8 cũng đã triển khai. Cần QA trên trình duyệt và tài liệu thật, rồi mới mở rộng Markdown/DOCX/LaTeX.

## 1. Mục tiêu và phạm vi

Biến văn bản dán, PDF có lớp chữ và PDF/ảnh OCR thành trang đọc dễ theo dõi: giữ ranh giới đoạn, phân biệt tiêu đề, danh sách và trích dẫn khi có tín hiệu rõ; không gộp nhiều đoạn thành một khối chữ. Người đọc có thể sửa bố cục khi máy nhận diện sai. Bản gốc luôn còn trong phiên đọc để đối chiếu và khôi phục.

Phiên này chỉ làm trình bày văn bản. Không sửa đăng ký/đăng nhập, phân quyền, đồng bộ tài liệu, TTS, cơ sở dữ liệu hay migration. Không gọi NLP/LLM trong phiên đầu. Giữ chức năng đọc to đang có hoạt động bằng cách dùng cùng danh sách khối văn bản để tạo `ReadingSegment[]`; mọi khối có chữ phải có `id` ổn định và thứ tự duy nhất.

Đích là **cấu trúc đọc hợp lý**, không tái tạo bố cục PDF chính xác từng pixel. Văn bản thuần không chứa thông tin chữ đậm/nghiêng; PDF và OCR có thể mất thứ tự đọc ở trang nhiều cột hoặc bảng. Các trường hợp chưa đủ căn cứ phải giữ nguyên chữ và cho sửa tay, không tự sáng tác nội dung.

## 2. Hiện trạng cần thay

| Nơi | Vấn đề |
| --- | --- |
| `frontend/src/lib/document.ts` | `normalizePastedText` sửa khoảng trắng; `toParagraphs` tách theo dòng trống nếu tài liệu có ít nhất một dòng trống, nên xuống dòng đơn còn trong một khối và bị HTML hiển thị như khoảng trắng. |
| `app/services/text_extraction_service.py` | `normalize_text` gọi `_reflow` để ghép dòng theo dấu câu/chữ thường; không còn biết dòng nào là xuống dòng tác giả và dòng nào chỉ do chiều rộng trang. Nhiều trang PDF được nối thành một chuỗi. |
| `app/schemas/text_extraction.py` và endpoint | API chỉ trả `text`, `source`, `pageCount`, `charCount`, `ocrUsed`; không có khối văn bản hay số trang của từng khối. |
| `frontend/src/components/common/ReadingText.tsx` | Chỉ render `paragraph`/`quote`; tiêu đề, danh sách và ngắt dòng đều biến thành `<p>`. |
| `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx` | Tự tạo `ReadingSegment[]` từ `toParagraphs`; mọi đoạn có cùng kiểu. |
| `frontend/src/context/DocumentProvider.tsx` | Chỉ giữ tài liệu trong React state; chưa có bước xem lại/sửa bố cục. |

## 3. Hợp đồng dữ liệu

Tạo một kiểu khối dùng chung về ý nghĩa ở backend schema và frontend TypeScript:

```ts
type BlockType = 'paragraph' | 'heading' | 'listItem' | 'quote';
type ReadingBlock = {
  id: string;                 // duy nhất, ổn định trong phiên đọc
  type: BlockType;
  text: string;               // chữ hiển thị và đọc; không chứa HTML
  pageNumber?: number;        // chỉ áp dụng cho tệp, đếm từ 1
  headingLevel?: 2 | 3;       // chỉ với heading; h1 dành cho tiêu đề tài liệu
  listKind?: 'ordered' | 'unordered'; // chỉ với listItem
};
```

`ReadingDocument` thêm `sourceText` (văn bản trích xuất ban đầu, còn xuống dòng) và `blocks`. Giữ `text` hiện có làm chuỗi thuần được **dẫn xuất từ `blocks`** để bộ đếm từ/thời gian đọc và code cũ dùng được; không lưu hai bản văn bản có thể bị sửa độc lập. Khi sửa khối, cập nhật `blocks` rồi tính lại `text`. `sourceText` bất biến trong phiên để “Xem bản gốc” và “Khôi phục”. Chỉ lưu văn bản trong bộ nhớ như hiện tại; tải lại trang vẫn mất tài liệu.

API `POST /api/v1/documents/extract-text` tiếp tục trả các field cũ và thêm `blocks` (cùng cấu trúc trên, `pageNumber` cho PDF/ảnh). `text` và `charCount` vẫn nhất quán với văn bản thuần sau trích xuất. Frontend chấp nhận response thiếu `blocks` trong giai đoạn chuyển tiếp bằng bộ tách an toàn từ `text`; bỏ fallback này sau khi backend và frontend cùng ổn định. Không trả HTML từ OCR/PDF, không render bằng `dangerouslySetInnerHTML`.

TTS hiện chỉ hiểu `ReadingSegment` kiểu paragraph/quote. Trong `MinimalReadingView`, tạo adapter từ `blocks` có chữ sang segments: giữ nguyên `id`, `text`, thứ tự; `quote` thành quote, các loại khác thành paragraph. `ReadingText` nhận danh sách khối tương ứng để `activeBoundary.segmentId`/`segmentIndex` vẫn chỉ đúng chữ. Không triển khai tính năng TTS mới trong kế hoạch này.

## 4. Quy tắc nhận diện bản đầu

### Văn bản dán

1. Chuẩn hóa Unicode NFC, CRLF thành `\n`, tab/khoảng trắng dư vừa đủ; giữ `\n` và dòng trống. Không ghép các dòng chỉ dựa vào chữ thường hoặc dấu câu.
2. Dòng trống phân tách đoạn. Dòng đơn trong một đoạn được giữ làm ngắt dòng mềm khi hiển thị (`white-space: pre-line` hoặc `<br>`), không để HTML tự nuốt mất. Giới hạn số dòng trống liên tiếp để giao diện gọn.
3. Nhận diện cú pháp rõ ràng: `#`/`##` hoặc dòng tiêu đề độc lập có dấu hiệu chắc chắn; `-`, `*`, `•`, `1.` cho danh sách; `>` cho trích dẫn. Với tiêu đề không có ký hiệu, chỉ gợi ý khi dòng ngắn và được ngăn bằng dòng trống; nếu không chắc, giữ paragraph.
4. Không hiểu Markdown đầy đủ trong bản đầu: không biến dấu `*` trong câu thành định dạng, không suy đoán chữ đậm/nghiêng từ plain text.

### PDF có chữ và OCR

1. Giữ text theo từng trang trong `TextExtractionService` thay vì nối trước khi phân tích; trang rỗng không sinh block. Chỉ chuẩn hóa ký tự an toàn trước khi nhận diện cấu trúc. Bỏ `_reflow` toàn cục hoặc thay bằng xử lý cục bộ có test.
2. Phân biệt xuống dòng do độ rộng trang với ranh giới đoạn bằng tín hiệu nhiều hơn một dấu câu: dòng trống, thụt đầu dòng, bullet/đánh số, độ dài dòng so với các dòng cùng trang, vị trí dòng trên trang (nếu lấy được). Không nối qua bullet, tiêu đề hay ranh giới trang khi chưa chắc.
3. PDF có cả trang text và trang scan: quyết định OCR **theo trang**, không dùng ngưỡng tổng 10 ký tự cho cả tệp. Tôn trọng `MAX_OCR_PAGES`; tài liệu vượt giới hạn báo rõ trang nào chưa xử lý thay vì âm thầm làm thiếu nội dung.
4. OCR ảnh/scanned PDF: giữ thứ tự dòng và khoảng cách đoạn do Tesseract trả về, gắn `pageNumber`, áp dụng quy tắc thận trọng. Hiện không có dữ liệu hình học đáng tin cậy cho bảng/nhiều cột, vì vậy hiển thị cảnh báo “Có thể cần kiểm tra thứ tự đọc” và cho sửa tay.
5. Tuyệt đối không xóa tiêu đề chân trang, số trang, dấu gạch nối hay câu “giống quảng cáo” chỉ vì heuristics. Việc lọc những thứ này cần bằng chứng và fixture riêng.

## 5. Trình tự code

### Bước 1 — Dữ liệu mẫu và hợp đồng

- Tạo fixture nhỏ chứa: văn bản dán có một/hai xuống dòng; tiêu đề và danh sách; thơ có ngắt dòng đơn; PDF chữ nhiều trang; PDF scan; OCR lỗi dấu; PDF pha trộn trang chữ/trang scan. Ghi kết quả mong đợi về thứ tự chữ và ranh giới khối.
- Khai báo `ReadingBlock`, mở rộng `ReadingDocument` trong `frontend/src/lib/document.ts`; thêm schema tương ứng trong `app/schemas/text_extraction.py`. Chốt bất biến: nối text các block theo thứ tự không làm mất câu hoặc đảo thứ tự; `id` duy nhất; block rỗng không được đưa vào UI/TTS.
- Tách parser khỏi React component để test độc lập. Không thêm thư viện NLP/LLM.

**Xong khi:** fixture và schema mô tả được mọi loại block đã định; response cũ vẫn dùng được trong lúc chuyển đổi.

### Bước 2 — Văn bản dán và giao diện đọc

- Thay `toParagraphs` bằng parser cho văn bản dán; `buildPastedDocument` tạo `sourceText`, `blocks`, `text` ngay khi nhập.
- Sửa `ReadingText` render ngữ nghĩa: `<h2>/<h3>`, `<p>`, `<blockquote>`, nhóm `listItem` liên tiếp thành `<ul>/<ol><li>`. Dùng React text node, không chèn HTML. Giữ ngắt dòng mềm bên trong paragraph, khoảng cách khối rõ ràng; không thụt đầu dòng tất cả khối.
- `MinimalReadingView` lấy `blocks` từ document, bỏ `toParagraphs`, dùng cùng thứ tự block cho hiển thị và adapter TTS. Tiêu đề tài liệu vẫn là `<h1>`. Giữ các cài đặt font, cỡ chữ, line height, letter spacing, column width và focus mode.

**Xong khi:** dán mẫu nhiều đoạn không còn thành một khối; tiêu đề/danh sách có cấu trúc HTML đúng; chữ gốc không bị đổi hoặc mất.

### Bước 3 — Backend PDF/ảnh

- Đổi `ExtractionResult` thành kết quả theo trang, sau đó tạo `blocks` trong service mới hoặc hàm tách riêng ở tầng service; endpoint chỉ chuyển kết quả thành schema.
- Thay `_reflow` bằng chuẩn hóa tối thiểu + nhận diện khối theo nguồn. Không để endpoint tự quyết định nghiệp vụ. Bổ sung xử lý OCR theo trang và thông tin `ocrUsed` tổng/từng trang nếu cần; giữ `text` trong response để tương thích.
- Sửa `frontend/src/lib/api.ts`, `buildFileDocument` và `DocumentProvider` để nhận `blocks`. Nếu thiếu cấu trúc, dùng fallback text an toàn và gắn thông báo cần xem lại.

**Xong khi:** PDF/ảnh trả block đúng thứ tự trang; PDF pha trộn không bỏ qua trang scan; không ghép nhầm hai trang hoặc hai mục danh sách.

### Bước 4 — Cho người đọc sửa bố cục

- Thêm nút “Chỉnh bố cục” trên màn hình đọc, mở panel xem trước các block; cho đổi loại block, sửa chữ, tách tại vị trí con trỏ, gộp với block kế, đổi thứ tự khi thực sự cần. Cho “Xem bản gốc”, “Khôi phục bản trích xuất”; cảnh báo trước thao tác khôi phục nếu có sửa chưa lưu trong phiên.
- Khi áp dụng thay đổi, giữ `id` của block được sửa; block mới do tách nhận `id` mới. Tính lại `text`, bộ đếm từ và danh sách segment; dừng phát nếu người dùng đang sửa nội dung để tránh highlight lệch (không sửa SpeechController).
- Trên tài liệu OCR/PDF, hiển thị ghi chú ngắn về khả năng sai thứ tự; không buộc người dùng qua màn hình chỉnh sửa nếu tài liệu đã ổn.

**Xong khi:** người dùng sửa được lỗi tách đoạn phổ biến mà không phải tải lại tệp; khôi phục đưa về đúng bản trích xuất của phiên.

### Bước 5 — Kiểm thử và tinh chỉnh

- Backend: unit test parser/normalizer theo fixture; test endpoint với PDF chữ, ảnh OCR giả lập, tài liệu pha trộn, giới hạn trang và phản hồi tương thích. Không dùng database thật cho test trích xuất.
- Frontend: thêm test runner nhẹ (đề xuất Vitest) cho parser, thao tác tách/gộp và bất biến thứ tự chữ; test render ngữ nghĩa bằng React Testing Library nếu thêm dependency này. Tránh test chỉ chụp snapshot của class CSS.
- QA thủ công trên desktop/mobile: tài liệu ngắn/dài, dấu tiếng Việt, xuống dòng, danh sách, heading, chữ rất lớn/cột hẹp, focus mode, bàn phím/screen reader cơ bản, PDF nhiều trang, OCR. Kiểm tra chức năng phát hiện có vẫn đọc đúng thứ tự và tô sáng đúng block, nhưng không mở rộng TTS.
- Chạy `python -m pytest` khi có test backend; từ `frontend/` chạy `npm run lint`, `npx tsc -b`, `npm run build` và test frontend mới. Nếu không có PostgreSQL test, ghi rõ phần test DB không chạy được; parser/extraction test nên chạy độc lập DB.

## 6. Tiêu chí nghiệm thu tổng

1. Cùng một tài liệu hiển thị đúng thứ tự chữ; không mất dấu tiếng Việt, không lặp/mất câu khi chuyển sang block.
2. Văn bản dán giữ đoạn, xuống dòng có chủ ý, danh sách và tiêu đề có cú pháp rõ. PDF/OCR được chia khối hợp lý theo trang, không dồn toàn bộ vào một đoạn dài.
3. Các trường hợp không chắc chắn giữ chữ và có cách sửa tay; không khẳng định tự phục hồi được bố cục gốc của bảng hoặc PDF nhiều cột.
4. Cài đặt hiển thị, focus mode và TTS hiện có không bị hỏng; `segmentId` và vị trí tô sáng khớp khối đang hiển thị.
5. Chức năng chạy khi chưa đăng nhập; không thêm lưu trữ lâu dài hay yêu cầu tài khoản.

## 7. Sau phiên đầu

Chỉ cân nhắc NLP/LLM hoặc trích xuất layout nâng cao nếu bộ fixture và thử nghiệm người dùng chỉ ra nhiều tài liệu chưa đọc được. Đo riêng tỷ lệ nhận diện sai đoạn, tiêu đề, thứ tự đọc; thử phương án xử lý bố cục PDF/OCR trước khi gửi nội dung tài liệu lên dịch vụ LLM. Mọi kết quả tự động vẫn cần khả năng xem lại và sửa.

## 8. Dàn trang chuyên nghiệp và giữ định dạng file gốc

Phần 1–7 giải quyết **cấu trúc chữ để đọc lại**. Nó không thể làm một chuỗi text đã trích xuất trở thành trang Word/PDF giống hệt bản gốc. Bổ sung hai chế độ rõ ràng:

| Chế độ | Mục đích | Nguồn dữ liệu |
| --- | --- | --- |
| Trang đọc | Chữ dễ đọc, đổi font/cỡ/cột, focus mode, chỉnh bố cục. | Block/ngữ nghĩa sau trích xuất. |
| Bản gốc | Giữ vị trí trang, bảng, hình, khoảng trắng và căn lề như tệp đầu vào để đối chiếu. | Tệp gốc hoặc bản PDF tạo từ tệp gốc. |

### 8.1. Sửa trang đọc hiện tại trước

- Căn cùng một cột cho tiêu đề, metadata, thông báo, player và nội dung; cột đọc nằm giữa card thay vì bị đẩy trái bởi `mr-auto`. Việc này được chỉnh ngay trong `MinimalReadingView.tsx`, cần QA ở màn hình rộng/hẹp.
- Tạo một bộ quy tắc typography dùng chung cho trang đọc: cột 45–75 `ch` theo setting hiện có; khoảng cách đều giữa tiêu đề, đoạn, danh sách, trích dẫn; bullet có lề treo; tiêu đề luôn tách rõ khỏi đoạn sau; không thụt mọi đoạn. Giới hạn chữ tràn ở URL/từ dài, bảng cuộn ngang nếu có.
- Mặc định căn trái vì cột hẹp và chữ tiếng Việt dễ có khoảng trắng lớn khi căn đều. Có thể thêm lựa chọn “Căn đều” như tùy chọn hiển thị sau khi QA, với `text-align-last: left`; kiểm tra ở cỡ chữ lớn và trên điện thoại. Không mặc định dùng `text-align: justify` chỉ để trông giống Word.
- Trạng thái theme tối cần kiểm tra màu chữ của heading và `ReadingText`: class màu cố định có thể ghi đè màu do theme đặt. QA cả 5 theme trước khi coi giao diện hoàn tất.

### 8.2. Hiển thị đúng từng định dạng

| Đầu vào | Trang đọc | Bản gốc |
| --- | --- | --- |
| PDF | **Đã triển khai:** pdfplumber lấy tọa độ/font, PDFium chụp bảng và ảnh 200dpi; phần chữ tự reflow, mục lục lấy từ heading. Bảng có nút phóng to và văn bản thay thế. Không cần mô hình Docling. | Mở file local bằng viewer PDF tích hợp của browser trong iframe để đối chiếu, có liên kết mở tab mới. Nếu cần toolbar nhất quán, đánh giá [PDF.js](https://github.com/mozilla/pdf.js). |
| Ảnh | OCR thành block, cho sửa. | **Đã có:** hiển thị ảnh gốc trong vùng cuộn; không coi OCR là định dạng gốc. |
| Markdown `.md` | Parse Markdown/GFM thành cây ngữ nghĩa, render heading, đoạn, nhấn mạnh, link, danh sách, bảng, code, ảnh; áp dụng typography trang đọc. Không dùng regex hiện tại để giả vờ hỗ trợ Markdown đầy đủ. [react-markdown](https://github.com/remarkjs/react-markdown) | Cho xem source Markdown khi cần; Markdown không định nghĩa bố cục trang cố định. |
| Word `.docx` | Chuyển style ngữ nghĩa sang cấu trúc đọc (heading, list, table, bold/italic, ảnh); HTML xuất ra phải được kiểm soát/sanitize trước khi render. [Mammoth](https://github.com/mwilliamson/mammoth.js) | Có thể thử `docx-preview` để xem gần bố cục Word, nhưng HTML không bảo đảm giống Word từng trang. Muốn độ trung thực cao hơn, cần luồng chuyển DOCX sang PDF rồi xem PDF. [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) |
| LaTeX `.tex` | Chỉ hỗ trợ công thức trong nội dung bằng KaTeX sau khi có parser/nguồn rõ; KaTeX không render nguyên tài liệu `.tex`. [KaTeX](https://katex.org/docs/api) | Với tài liệu LaTeX đầy đủ, xem PDF đã biên dịch. Không chạy trình biên dịch `.tex` tùy ý từ upload trong bản đầu. |

**Thứ tự đề xuất:** hoàn thiện QA parser PDF trên nhiều loại tài liệu, đặc biệt bảng phức tạp/scan/đa cột → ảnh minh họa/công thức → nhận `.docx` thật với Mammoth → `.md` → LaTeX nếu bộ tài liệu mẫu cần. Mỗi định dạng cần fixture và test riêng; không gộp tất cả vào parser text thuần.

### 8.3. Hợp đồng dữ liệu khi mở rộng

- `ReadingBlock.text` hiện chỉ là chữ thuần; muốn giữ **bold/italic/link/code/bảng/ảnh** phải bổ sung cây inline/block có kiểu hoặc AST an toàn. Không nhét HTML vào `text` và không chạy HTML từ tệp người dùng trực tiếp.
- Tệp PDF/ảnh cần giữ `Blob`/object URL trong phiên ở frontend để mở “Bản gốc”; thu hồi URL khi đổi/xóa tài liệu. Hiện backend không lưu tệp, nên chế độ này mất sau refresh như trạng thái tài liệu hiện tại.
- Metadata của block liên kết với vị trí nguồn: `pageNumber` và, nếu đủ tin cậy, vùng/trang trong bản gốc. Khi không xác định được vị trí, nút đối chiếu chỉ mở đúng trang thay vì cuộn đến vị trí sai.
- Tách renderer theo nguồn (`pdf`, `image`, `markdown`, `docx`) khỏi renderer trang đọc. Chế độ bản gốc không dùng cài đặt font/column width của trang đọc; người dùng có thể chuyển qua lại mà không mất các sửa bố cục trong phiên.

### 8.4. Tiêu chí nghiệm thu bổ sung

1. Trên màn hình rộng và điện thoại, mép trái của tiêu đề, player và văn bản cùng một cột; cột không vượt viewport, không có vùng trắng lệch lớn một bên.
2. PDF/ảnh có nút xem bản gốc; zoom, chuyển trang và quay lại trang đọc không làm mất tài liệu hay bản chỉnh bố cục.
3. File Markdown mẫu giữ đúng heading, danh sách, nhấn mạnh, bảng và code; file DOCX mẫu giữ các style ngữ nghĩa tương ứng khi các định dạng đó được triển khai.
4. Nội dung không tin cậy không chèn script hoặc HTML nguy hiểm; link/ảnh ngoài được xử lý theo chính sách rõ ràng.
5. Đánh giá bằng ảnh chụp ở 375px, 768px, 1440px với cùng một bộ fixture, kể cả font tối đa và theme tối. Test tự động kiểm tra cấu trúc; QA bằng mắt kiểm tra cân lề, nhịp khoảng cách và khả năng đọc.

## 9. Pipeline snapshot hiện tại và kiểm chứng `test.pdf`

- Phát hiện bảng có viền bằng `find_tables`, bổ sung nhóm đường ngang theo mép trái/phải cho bảng LaTeX kiểu booktabs; nhận diện ảnh raster qua bbox. Caption sát bảng được đưa trọn vào vùng chụp để tránh cắt nửa chữ.
- Render vùng bằng PDFium, padding 5pt, 200dpi (giới hạn 8 triệu pixel/vùng), trả PNG inline trong block `snapshot` cùng `sourceBbox`, số trang, kích thước và chữ trích xuất. Lọc chữ trong vùng đó khỏi đoạn văn để không lặp.
- Tính mode cỡ chữ có trọng số theo lượng chữ, nhận diện heading/font đậm, ghép dòng theo khoảng cách dọc và thụt lề, xử lý gạch nối cuối dòng. Lọc số trang và header/footer lặp tại mép 6%; giữ tiêu đề không lặp. Thứ tự đọc dùng các khoảng trắng tách cột, thay vì chỉ sort y/x gây trộn hai cột.
- `ReadingText` hiển thị ảnh gốc đúng vị trí, có zoom 100–300%, cuộn trong vùng ảnh và phần mở rộng “Văn bản để đọc và sao chép”. TTS vẫn nhận chữ của snapshot theo thứ tự block. Phần chữ chính tiếp tục đổi font/cỡ/giãn dòng; ảnh bảng dùng zoom, không đổi font trong ảnh.
- Đã kiểm tra file 5 trang: 55 block, 3 ảnh bảng, không có dòng cứng trong paragraph, không lặp chữ của bảng. Snapshot bảng thứ hai giữ đúng các hàng/cột mà Docling từng gom sai. Trích xuất cục bộ mất khoảng 0.6–0.8 giây trong lần đo mẫu; đây không phải cam kết cho mọi PDF.
- Đã upload thật qua UI bằng Edge headless ở 1440px và 390px, kiểm tra ảnh bảng/zoom, trang không tràn ngang. Backend hiện tại ở cổng 8000 cũng trả HTTP 200 và 3 snapshot, không cảnh báo fallback. Parser lỗi sẽ trả lỗi rõ ràng, không âm thầm đưa ra trang text hỏng.
- Giới hạn: bảng hoàn toàn không có đường kẻ, biểu đồ vector, công thức, bố cục phức tạp và OCR vẫn cần mẫu/test tiếp. Ảnh/PDF scan dùng Tesseract với giới hạn cũ; tài liệu pha trộn vẫn phân tích tọa độ cho các trang có chữ. DOCX chưa được triển khai. Không dùng LLM tự sửa lỗi từ trong PDF.
