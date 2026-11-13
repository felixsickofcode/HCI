# Handoff dự án HCI

Cập nhật hiện hành: **2026-11-13**, múi giờ Asia/Bangkok. Agent đọc phần hiện hành trước; các mục dưới “Nhật ký lịch sử” ghi diễn tiến, có quyết định đã được thay thế. Cập nhật file này cuối mỗi phiên.

## Trạng thái hiện hành và ý định người dùng

- Ưu tiên trình đọc văn bản dễ đọc trực tiếp, thay font/cỡ/giãn dòng/giãn chữ/cột và dùng tính năng đọc; auth/TTS mới để sau.
- PDF phải giữ bảng/hình rõ ràng, paragraph tự reflow. “Trang đọc” là mặc định; “Bản gốc” là đối chiếu. Không đổi về viewer PDF tĩnh mặc định.
- **Parser hiện tại là pdfplumber + PDFium, không còn Docling.** Pipeline Docling cũ từng lỗi do môi trường và gom sai ô; phần lịch sử về Docling không phải hướng dẫn triển khai hiện hành.
- Đã có upload PDF/PNG/JPEG/WebP, văn bản dán, block ngữ nghĩa, mục lục, bảng/ảnh snapshot có zoom/text thay thế, chỉnh bố cục thủ công và xem file gốc. File/block chỉ ở bộ nhớ phiên React; refresh mất tài liệu, chưa có persistence/backend library.
- Đã tích hợp parser vào Python đang chạy backend: API cổng 8000 được kiểm chứng trả HTTP 200, 55 block và 3 snapshot không warnings trên mẫu 5 trang. Khi nhận bản sửa phải mở lại tài liệu, không kiểm tra bằng state cũ đang mở.

## Đọc và chạy ở phiên tiếp theo

1. Đọc `AGENTS.md`, [kiến trúc](architecture.md), [module trình đọc](modules/document-reader.md), [module frontend](modules/frontend.md) và `frontend/AGENTS.md`.
2. Kiểm tra `git status --short --branch` và `git log -3 --oneline`; nhánh làm việc/push là **`feature/hong-quan`**, remote **`origin` = `felixsickofcode/HCI`**. Remote `frontend` là repo khác, không phải đích push monorepo.
3. Backend root: `python -m pip install -r requirements.txt`, tạo `.env` theo `.env.example`, có PostgreSQL rồi chạy `python -m alembic upgrade head` và `python -m uvicorn app.main:app --reload`.
4. Frontend trong `frontend/`: `npm ci`, `npm run dev`. API mặc định localhost:8000; `VITE_API_URL` và CORS phải khớp nếu đổi cổng.
5. Cài requirements vào đúng interpreter chạy backend. PDF chữ cần pdfplumber/PDFium, không tải model; OCR cần Tesseract và `vie+eng`, có `TESSERACT_CMD` khi cần.

## Thay đổi được bàn giao

- Backend: `text_blocks.py` cho hợp đồng/parser text cơ bản; `layout_pdf.py` nhận bbox, font và thứ tự cột để reflow. Snapshot bảng/ảnh 200dpi + padding 5pt, giới hạn 8 triệu pixel/vùng; giữ caption trọn vẹn và loại text snapshot khỏi paragraph. Nhận bảng booktabs không có viền dọc và tách bảng cùng chiều rộng. Lọc số trang/header/footer lặp tại mép 6%, không cắt mọi nội dung ở mép trang.
- `TextExtractionService`: giới hạn upload/trang, OCR theo từng trang, xử lý PDF pha trộn, warnings cho trang OCR bị bỏ qua; lỗi layout trả lỗi thay vì fallback text hỏng. `ReadingBlockRead`/endpoint trả cấu trúc và provenance theo camelCase.
- Frontend: `lib/document.ts`, `DocumentProvider` giữ `sourceText`, `sourceBlocks`, `blocks`, `originalFile` và các thao tác chỉnh. `ReadingText` render HTML ngữ nghĩa, không render HTML đầu vào. `SnapshotFigure` có zoom 100–300%, vùng cuộn nội bộ và text mở rộng cho TTS/sao chép. Mục lục liên kết tới heading; sửa block dừng speech; `OriginalDocumentView` thu hồi object URL.
- `LayoutEditor`: sửa chữ/loại khối, tách tại con trỏ, gộp/di chuyển và khôi phục. Snapshot/table không tách/gộp trực tiếp, có thể đổi sang paragraph để sửa text. Giữ marker danh sách PDF để không đánh số/bullet hai lần.
- Letter spacing mặc định mới là 0.02em ở cả API/frontend; các tùy chọn người dùng đã lưu vẫn giữ nguyên. Không đổi schema DB, không có migration mới.
- Vitest + React Testing Library và fixture PDF sinh trong test. Test parser mang marker `no_db`; test DB tạo/dọn DB riêng hậu tố `_test`, không dùng DB phát triển.
- Tài liệu: module trình đọc mới, cập nhật kiến trúc/AGENTS/module frontend và kế hoạch trình bày; log lịch sử giữ bên dưới để hiểu các quyết định trước.

## Kiểm chứng và dữ liệu local

| Kiểm tra | Kết quả cuối phiên triển khai |
| --- | --- |
| `python -m pytest` | 50 passed; có deprecation warning của FastAPI/Starlette TestClient, không phải fail |
| `python -m pytest tests/test_text_blocks.py tests/test_layout_pdf.py` | Parser chạy không cần PostgreSQL; fixture PDF tự tạo |
| `npm run test` | 17 passed |
| `npm run lint` | Pass |
| `npm run build` | Pass, gồm TypeScript |
| QA browser | Edge headless, upload PDF thật ở 1440×1000 và 390×844; paragraph reflow, 3 snapshot, zoom hoạt động, không tràn ngang trang |
| API runtime người dùng | localhost:8000 trả 200, 55 block, 3 snapshot và không warnings |

- Mẫu `test.pdf` (5 trang) và ảnh QA `output/reader-review/` giữ local, đã gitignore; không được push cùng code. Checkout mới dùng fixture trong test, không cần mẫu cá nhân này. Tab IDE `VĐ_hiện_đại (2).pdf` không tìm thấy trong workspace ở lần QA, nên chưa kiểm chứng file đó.
- Mẫu đo parser khoảng 0.6–0.8s trên máy hiện tại; chưa benchmark tài liệu dài hoặc tải đồng thời. Đã xem PNG thật của bảng khó từng bị gom sai ô và sửa caption cắt nửa chữ.
- Các server kiểm thử riêng ở 8010/5175 và script/thư mục tạm đã được dọn; không dừng backend của người dùng tại 8000. Browser tool/CUA từng không dùng được, QA thành công sau bằng Edge headless riêng.

## Việc còn lại theo ưu tiên

1. Thêm fixture và QA các tài liệu chưa phủ: bảng không đường kẻ, biểu đồ vector, công thức, nhiều cột phức tạp, heading dài, PDF scan/mixed. Không coi sample pass là mọi PDF đều giữ đúng.
2. Kiểm tra tài liệu dài, tổng dung lượng snapshot, bộ nhớ và PDFium khi có nhiều request đồng thời; cân nhắc xử lý nền nếu phép đo thực tế cho thấy cần.
3. Snapshot giữ hình thức nhưng font trong ảnh không reflow: dùng zoom/text thay thế. Text thay thế chưa là bảng ngữ nghĩa đầy đủ cho screen reader, có thể sai thứ tự. Chưa tự sửa lỗi từ/ngữ nghĩa bằng LLM.
4. DOCX/EPUB/Markdown/LaTeX đầy đủ chưa hỗ trợ; Mammoth cho DOCX mới là đề xuất trong kế hoạch. Chưa triển khai Edge TTS hoặc provider TTS mới.
5. Auth/TTS mới tạm hoãn theo người dùng. Cần xử lý route CRUD users thiếu auth/phân quyền đã ghi nhận trước khi public. Web Speech cần QA giọng và word boundary trên nhiều browser.

## Bàn giao Git phiên này

- Người dùng đã yêu cầu commit/push code và toàn bộ handoff lên nhánh của họ. Tên remote branch xác minh là `feature/hong-quan`; không có branch `hong-quan` riêng.
- Base khi bắt đầu bàn giao: `a4084f2` (merge PR #4 từ nhánh này vào main); remote branch trước push ở `cd74961`. Đã fetch trước khi đóng gói, push bình thường, không force-push.
- Commit chứa các thay đổi code/test và tài liệu hiện hành; không chứa `.env`, `.venv`, mẫu PDF hay ảnh QA local. Xem hash chính xác bằng `git log -1 --oneline` sau checkout/pull.
- Phiên mới tiếp tục từ ưu tiên trình đọc, không khởi động lại hướng Docling chỉ vì thấy lịch sử cũ.

## Nhật ký lịch sử

Các mục sau giữ nguyên diễn tiến. Các dòng “chưa commit”, “chưa QA”, trạng thái mock hoặc parser Docling chỉ có giá trị tại thời điểm ghi; trạng thái hiện hành phía trên thay thế chúng.

## Công việc TTS đã ghi trước đó (tạm hoãn)

Triển khai FR-04 frontend: đọc thành tiếng tiếng Việt, chỉnh tốc độ và giọng, tô sáng theo lời đọc bằng Web Speech API.

Phạm vi phiên bản đầu: frontend-only trên nội dung mock ở `/reading`; không backend, database, migration hoặc lưu audio.

### Cơ sở đã xác minh

- `README.md` ghi FR-04 và định hướng Web Speech API cho đọc to.
- `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx` đang hiển thị bài đọc từ `mockReadingManuscript`.
- `frontend/src/components/common/AudioPlayerCapsule.tsx` trước phiên này chỉ mô phỏng play/timer/speed bằng state và `setInterval`; đã thay bằng điều khiển speech thật.
- `frontend/design/DESIGN.md` có định hướng AudioPlayerCapsule (nút play/pause gradient, waveform, tốc độ đọc).
- Không có test frontend cho TTS.

### Plan triển khai theo thứ tự

1. Đã chốt acceptance criteria: play/pause/resume/stop; tốc độ; chọn voice tiếng Việt; trạng thái unsupported/error; tô sáng theo từ; kết thúc đọc đưa UI về trạng thái ổn định.
2. Xác định dữ liệu đọc gồm các đoạn có id ổn định từ `mockReadingManuscript`: lead, second, callout quote, third, fourth, closing. Không thêm API/backend.
3. Đã tạo speech controller dùng `window.speechSynthesis` và `SpeechSynthesisUtterance` tại `frontend/src/lib/speech.ts`: kiểm tra hỗ trợ, lấy danh sách voice, ưu tiên `vi-VN`, lifecycle, `rate`, `onstart`, `onpause`, `onresume`, `onend`, `onerror`, `onboundary`.
4. Đã tách/chuẩn hóa các đoạn văn trong màn hình đọc thành `ReadingSegment[]` dùng chung cho controller và UI; ánh xạ `charIndex`/`charLength` về đoạn + khoảng trong đoạn.
5. Đã thay phần mô phỏng trong `AudioPlayerCapsule` bằng props/callback; hiển thị tốc độ và voice thật, bỏ timer giả.
6. Đã tích hợp controller với `MinimalReadingView`; render active word theo `charIndex`/`charLength`, giữ các `HighlightMark` tĩnh (phát quang sinh học, ánh sáng lạnh, luciferin, luciferase).
7. Đã bổ sung trạng thái accessibility: label cho nút, `aria-live` cho trạng thái, thông báo thiếu voice Việt/không hỗ trợ API/không hỗ trợ word boundary.
8. Đã chạy kiểm tra tự động; kiểm tra thủ công trên browser thật chưa thực hiện trong phiên này (xem Phần kiểm tra).
9. Đã chạy `npm run lint`, `npx tsc -b`, `npm run build` thành công trong phiên này.

### File đã sửa/tạo

- Sửa `frontend/src/components/common/AudioPlayerCapsule.tsx`: từ mô phỏng sang UI điều khiển speech thật (play/pause/resume/stop, tốc độ 0.8/1.0/1.2/1.5, chọn voice, trạng thái unsupported/error/không có vi-VN/không hỗ trợ word boundary).
- Tạo `frontend/src/lib/speech.ts`: wrapper/controller cho Web Speech API, không chứa React UI.
- Tạo `frontend/src/components/common/ReadingText.tsx`: render các đoạn đọc và tô sáng theo từ, giữ highlight tĩnh.
- Sửa `frontend/src/components/common/index.ts`: export `ReadingText`.
- Sửa `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx`: tạo danh sách đoạn, nối controller với audio capsule và phần văn bản; cleanup khi unmount/đổi bài.
- Không sửa backend, `frontend/package.json`, migration, API client hoặc build config.
- Không sửa `frontend/src/mocks/articles.ts` — dùng các trường paragraph hiện có.

### Rủi ro và cách xử lý

- Voice `vi-VN` phụ thuộc browser/OS, xuất hiện bất đồng bộ: hiển thị danh sách voice hiện có, ưu tiên `vi-VN` rồi `vi*`, có fallback rõ ràng và cảnh báo khi thiếu voice Việt.
- `onboundary` không đồng nhất: tô sáng từ chỉ dựa trên boundary đáng tin cậy (`name === 'word'` hoặc `charLength > 1`); nếu không có boundary đáng tin cậy, hiển thị rõ giới hạn “chỉ phát giọng đọc, không tô sáng theo đoạn”, không fallback im lặng sang highlight đoạn.
- `SpeechSynthesis` chỉ nhận từng utterance: đọc theo từng đoạn và nối queue qua `onend`; cleanup `cancel()` khi unmount/đổi bài/stop.
- Đổi `rate`/voice giữa lúc đọc: restart từ vị trí boundary cuối cùng của đoạn hiện tại; không giữ nguyên vị trí chính xác theo ký tự nếu browser không cho boundary.
- Duration thật của Web Speech không biết chính xác: bỏ bộ đếm thời gian giả, hiển thị trạng thái đọc và tiến trình theo đoạn.
- Tô sáng từ theo Unicode tiếng Việt: token hóa theo khoảng trắng + offset thật trong đoạn; cần QA thủ công dấu/khoảng trắng/câu có ngoặc.

## Đã xong

- Đã đọc `AGENTS.md`, `docs/handoff.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/modules/frontend.md`, `frontend/AGENTS.md`, `README.md`, `frontend/design/DESIGN.md`.
- Đã tạo `frontend/src/lib/speech.ts` với `SpeechController`, `isSpeechSupported()`, `getSpeechVoices()`, `pickPreferredVoice()`, `hasVietnameseVoice()`, `SPEECH_SPEEDS`, `SPEECH_LANGUAGE = 'vi-VN'`.
- Đã tạo `frontend/src/components/common/ReadingText.tsx` tô sáng theo từ dùng `onboundary` (`charIndex`/`charLength`) và giữ highlight tĩnh.
- Đã viết lại `AudioPlayerCapsule` bằng điều khiển thật: play, pause, resume, stop, đổi tốc độ, chọn voice (ưu tiên `vi-VN`), trạng thái unsupported/error, cảnh báo thiếu voice Việt và thiếu word boundary, `aria-live`/`aria-label`.
- Đã tích hợp `MinimalReadingView` với controller; cleanup bằng `destroy()` + `detachCallbacks()` khi unmount hoặc khi `manuscript.id` đổi.
- Đã chạy:
  - `npm run lint` — pass
  - `npx tsc -b` — pass
  - `npm run build` — pass
- Đã khởi động thử `npm run dev -- --port 5173 --host 127.0.0.1` và server sẵn sàng tại `http://127.0.0.1:5173/` (đã dừng sau kiểm tra).

## Còn lại / bước tiếp theo

- Cần QA thủ công trên browser thật (Chrome/Edge/Firefox/Safari nếu có) theo checklist Phần kiểm tra; sau QA ghi lại kết quả vào file này.
- Xem xét thêm frontend test cho mapping highlight (hiện chưa có test framework frontend).
- Chưa commit theo yêu cầu.

## Quyết định đã chốt

- Tô sáng theo từ là bắt buộc; Web Speech API là giải pháp frontend đầu tiên; chưa chốt đây là giải pháp production lâu dài.
- Đổi tốc độ/giọng khi đang đọc sẽ đọc lại từ boundary cuối cùng của đoạn hiện tại.
- Nếu word boundary không đáng tin cậy: vẫn cho phát giọng nhưng hiển thị cảnh báo rõ, tắt tô sáng từ.

## Lưu ý / vấn đề đang mở

- Chưa có spec riêng FR-04. Word-level highlighting phụ thuộc `onboundary` của browser/OS.
- Phát hiện boundary “unreliable” dựa trên event không đáng tin cậy hoặc không có boundary sau 6 giây đầu của utterance; các browser đã có boundary muộn có thể bị báo sớm — cần QA thực tế.

### Kiểm tra thủ công (chưa thực hiện trong phiên headless này)

- [ ] Play bài ngắn/dài: nghe tiếng Việt, tô sáng đúng từ theo `charIndex`/`charLength`.
- [ ] Pause → Resume: tiếp tục từ đúng vị trí và giữ highlight ổn định.
- [ ] Stop giữa chừng: dừng hẳn, UI về trạng thái ổn định, không phát tiếp.
- [ ] Hết bài: trạng thái `ended`/“Đã đọc xong”, không còn highlight.
- [ ] Đổi tốc độ khi đang đọc: đọc lại từ boundary cuối cùng, không lặp mất đoạn.
- [ ] Đổi voice: ưu tiên `vi-VN`; không có voice Việt thì hiện cảnh báo và dùng giọng mặc định.
- [ ] Browser không hỗ trợ Web Speech API: hiển thị unsupported, tắt điều khiển.
- [ ] Browser không hỗ trợ word boundary đáng tin cậy: hiển thị giới hạn rõ ràng, không tô sáng đoạn im lặng.
- [ ] Unmount/chuyển bài trong lúc đọc: không còn tiếng, không còn callback cập nhật UI.

## Cập nhật phiên 2026-11-09

- Khôi phục việc nối `SpeechController` vào `MinimalReadingView` sau merge: nội dung hiện tại từ `useDocument` được chuyển thành `ReadingSegment[]`, dùng `AudioPlayerCapsule` và `ReadingText` để đọc giọng nói, tạm dừng, tiếp tục, dừng, đổi tốc độ/giọng và tô sáng theo từ.
- Giữ nguyên các cài đặt hiển thị hiện có; làm lại capsule audio theo phong cách card kính nhẹ, nút phát lớn hơn và responsive hơn.
- `ReadingText` nhận thêm `className`/`style` để tôn trọng font, cỡ chữ, giãn dòng và giãn chữ do panel cài đặt điều khiển.
- Bỏ tự động `scrollIntoView` theo từ đang đọc để người dùng có thể tự do kéo lên/xuống trong lúc phát giọng; highlight vẫn cập nhật độc lập.
- Đã chạy thành công: `npm run lint`, `npx tsc -b`, `npm run build`.
- Chưa QA giọng đọc thực tế trên browser và chưa commit.

## Rà soát và đề xuất 2026-11-13

- Đã đối chiếu tài liệu với code hiện tại. Auth đăng ký/đăng nhập và đồng bộ cài đặt đã hoạt động ở mức cơ bản; TTS vẫn dùng Web Speech API phía frontend, cần QA trên trình duyệt thật.
- Ưu tiên bảo mật: `app/api/v1/endpoints/users.py` để lộ GET danh sách/chi tiết và PATCH/DELETE theo `user_id` mà không có `CurrentUser` hoặc kiểm tra quyền. Cần giới hạn route theo người dùng hiện tại và bổ sung test chặn truy cập trái phép.
- Định dạng văn bản: API trích xuất chỉ trả `text`; `_reflow` có thể ghép dòng theo dấu câu/chữ thường. `toParagraphs` tách theo dòng trống nếu có ít nhất một dòng trống, làm các xuống dòng đơn bên trong khối bị HTML gộp. `ReadingText` chỉ render paragraph/quote. Nên lưu bản gốc, tạo cấu trúc block có loại và offset, rồi render tiêu đề/đoạn/danh sách/trích dẫn trước khi cân nhắc NLP/LLM.
- Edge TTS có thể thử nghiệm bằng thư viện cộng đồng `edge-tts`, nhưng phụ thuộc dịch vụ trực tuyến của Edge và không phải API sản phẩm chính thức. Nếu cần giọng Việt và mốc đồng bộ ổn định, đánh giá Azure Speech với `vi-VN` và sự kiện `WordBoundary`; vẫn có thể giữ Web Speech làm đường cơ bản.
- Phiên này chỉ rà soát và ghi nhận đề xuất, không sửa chức năng; không chạy test/lint vì không đổi mã nguồn.

## Cập nhật phiên lập kế hoạch 2026-11-13

- Đã đọc lại handoff, tài liệu frontend/migration và đối chiếu luồng dán văn bản, trích xuất PDF/OCR, `ReadingDocument`, `ReadingText`, `MinimalReadingView`.
- Đã lập `docs/text-presentation-plan.md` gồm hợp đồng block, thứ tự triển khai, chỉnh bố cục thủ công, fixture/test và tiêu chí nghiệm thu. Không đụng auth/TTS hay DB.
- Chỉ thay đổi tài liệu nên chưa chạy test/lint/build; chưa commit.

## Triển khai trình bày văn bản 2026-11-13

### Đã làm

- Backend tạo `app/services/text_blocks.py`: chuẩn hóa giữ xuống dòng, tách block `paragraph`/`heading`/`listItem`/`quote`, id ổn định, giữ `pageNumber`; bỏ `_reflow` toàn cục.
- `TextExtractionService` xử lý PDF theo từng trang, quyết định OCR theo trang, chỉ OCR tối đa `MAX_OCR_PAGES`, trả `warnings` và `skippedOcrPages` cho trang bị bỏ qua; `text` được dẫn xuất từ `blocks`, thêm `sourceText`.
- Schema/endpoint `POST /documents/extract-text` trả thêm `blocks`, `warnings`, `skippedOcrPages`, `sourceText`; các field cũ giữ nguyên.
- Frontend `lib/document.ts`: thêm `ReadingBlock`, `parseTextBlocks`, `blocksToText`, `buildPastedDocument`/`buildFileDocument` với `sourceText`, `blocks`, `sourceBlocks`, và thao tác sửa/tách/gộp/đổi thứ tự block.
- `ReadingText` render `<h2>/<h3>`, `<p>`, `<ul>/<ol>/<li>`, `<blockquote>`; giữ xuống dòng mềm bằng `white-space: pre-line`, vẫn tô sáng theo boundary. Bỏ indent toàn bộ đoạn.
- `DocumentProvider` thêm `updateBlocks` và `restoreSource`; `MinimalReadingView` dùng `blocks`, adapter TTS giữ nguyên id/thứ tự, hiển thị cảnh báo OCR/PDF và thứ tự đọc.
- Thêm `LayoutEditor`: đổi loại block, sửa chữ, tách tại con trỏ, gộp block kế, đổi thứ tự, xem bản gốc, khôi phục bản trích xuất; dừng TTS khi sửa và cảnh báo trước khi khôi phục.
- Thêm Vitest + React Testing Library (`npm run test`) và test parser/block ops/render ngữ nghĩa.
- `tests/conftest.py` chỉ khởi tạo database khi test không đánh dấu `no_db`; thêm marker `no_db` trong `pytest.ini` cho test parser thuần.

### Đã chạy

- `python -m pytest` — 46 passed.
- `npm run test` — 12 passed.
- `npm run lint` — pass.
- `npx tsc -b` — pass.
- `npm run build` — pass.

### Còn lại

- QA thủ công: dán văn bản có đoạn/xuống dòng/danh sách/tiêu đề/trích dẫn; PDF chữ nhiều trang; PDF scan; PDF pha trộn; ảnh OCR; giới hạn `MAX_OCR_PAGES`; kiểm tra TTS vẫn đọc/tô sáng đúng block.
- Chưa có test endpoint extraction tự động vì cần tệp PDF/ảnh mẫu và/hoặc mock OCR; test parser hiện chạy độc lập database.
- Chưa commit.

## Bổ sung dàn trang chuyên nghiệp 2026-11-13

- Người dùng nhận thấy trang đọc vẫn lệch lề và muốn hướng hiển thị chuyên nghiệp như Markdown/Word/LaTeX. Đã bổ sung mục 8 vào `docs/text-presentation-plan.md`: phân biệt “Trang đọc” và “Bản gốc”, typography, thứ tự hỗ trợ PDF/ảnh/Markdown/DOCX/LaTeX, hợp đồng dữ liệu cho inline style và tiêu chí QA.
- Đã sửa `MinimalReadingView.tsx`: tiêu đề, metadata, cảnh báo, player và nội dung nằm chung một cột giữa theo `columnWidth`; bỏ `mr-auto` làm vùng chữ lệch trái. Tiêu đề/metadata căn trái cả ở mobile.
- Đã bỏ màu chữ cố định trên `ReadingText` và heading để cài đặt theme điều khiển màu chữ thực sự.
- Kiểm tra sau sửa: `npm run lint`, `npx tsc -b`, `npm run build`, `npm test` đều pass (12 test). Lần chạy Vite/Vitest trong sandbox bị `spawn EPERM`; chạy ngoài sandbox đã pass. Dev server cục bộ khởi động được; browser access host của công cụ UI không khả dụng nên chưa QA trực quan.
- Chưa triển khai viewer PDF/Markdown/DOCX/LaTeX; đây là các bước mở rộng trong kế hoạch. Chưa commit.

## Xem file gốc 2026-11-13

- Ảnh chụp màn hình người dùng cho thấy mục lục PDF bị tách sai: dòng chấm dẫn trang và số trang xuống dòng, giãn chữ lớn. Đây là giới hạn khi chỉ render text trích xuất; cần xem PDF nguyên bản để giữ layout.
- `ReadingDocument` giữ `originalFile` trong phiên. Màn hình đọc mặc định mở bản gốc cho PDF/ảnh, có nút chuyển sang “Trang đọc”. PDF dùng viewer tích hợp của browser qua object URL/iframe và có liên kết mở tab mới; ảnh hiển thị file gốc. Chuyển trang/đổi tài liệu thu hồi object URL.
- Panel cài đặt và chỉnh bố cục chỉ hiện trong “Trang đọc”, để viewer gốc có đủ chiều rộng. Không sửa backend, đăng nhập hay TTS.
- Đã chạy `npm run lint`, `npx tsc -b`, `npm test` (14 passed), `npm run build` đều pass. Chưa QA trực quan bằng browser trong môi trường này vì browser access host của công cụ UI không khả dụng; cần kiểm tra PDF thật trên trình duyệt của người dùng.
- Với nội dung chỉ dán dưới dạng text, không có file gốc để phục hồi layout; muốn xem giống PDF phải tải PDF gốc lên. Chưa commit.

Ngày cập nhật cuối: 2026-11-13

## Trình đọc ngữ nghĩa PDF với `test.pdf` 2026-11-13

- Người dùng muốn **đọc trực tiếp trong giao diện có thể đổi font/cỡ/giãn chữ và dùng TTS**, đồng thời giữ cấu trúc file gốc tốt hơn. `test.pdf` (5 trang) được cung cấp làm mẫu. Ảnh trang 1–2 cho thấy tiêu đề, danh sách và bảng; pipeline pypdf cũ ngắt dòng cứng và làm dính ô bảng.
- Đã tích hợp `docling==2.150.0` trong `requirements.txt`, dùng ở `app/services/layout_pdf.py` cho PDF có text layer. Adapter lấy reading order, heading/paragraph/list/table, caption và số trang, nối đoạn bị chia qua trang khi có tín hiệu chắc chắn. Parser chạy cục bộ và lazy load; khi lỗi trả pipeline cũ kèm cảnh báo. PDF scan/ảnh tiếp tục dùng Tesseract theo giới hạn OCR cũ.
- API `ReadingBlockRead` và frontend `ReadingBlock` có thêm `table.rows`/`caption`; `ReadingText` render `<table>` trong vùng cuộn ngang, tiêu đề có anchor. `MinimalReadingView` mặc định mở “Trang đọc” và có mục lục nhảy tiêu đề; “Bản gốc” là chế độ đối chiếu. Đổi letter spacing mặc định từ 0.08em sang 0.02em cho thiết lập mới (giữ lựa chọn đã lưu của người dùng).
- Kiểm chứng mẫu: Docling trả 55 block, 3 bảng; bảng đầu trang 2 và các heading đúng, đoạn phần lớn reflow. Bảng thứ hai trang 2 vẫn bị gom nhiều hàng vào ô và một số khoảng trắng chữ bị sai. Không tuyên bố giữ 100% bản gốc; cần tiếp tục xử lý bảng khó, ảnh/công thức, scan, đa cột và DOCX. `docs/text-presentation-plan.md` mục 9 ghi chi tiết.
- Đã chạy `python -m pytest` (47 pass), `npm run lint` (pass), `npm run test` (15 pass), `npm run build` (pass), `.venv\Scripts\python.exe -m pip check` (pass). TestClient gọi `POST /api/v1/documents/extract-text` với `test.pdf`: HTTP 200, 55 block, 3 bảng có `rows`/`caption`. File thử tạm đã dọn.
- Chưa commit. `test.pdf` là file người dùng cung cấp, không xóa/commit nếu chưa được yêu cầu.

## Thay Docling bằng parser tọa độ và snapshot 2026-11-13

- Ảnh lỗi mới của người dùng cho thấy backend đang fallback về pypdf, nên paragraph vẫn có dòng cứng. Đã thay pipeline Docling ở `app/services/layout_pdf.py` bằng `pdfplumber==0.11.9` + PDFium có sẵn, bỏ dependency Docling khỏi `requirements.txt`. Đã cài pdfplumber vào cả `.venv` và Python đang chạy backend của người dùng.
- Nhận diện bảng có viền, bảng booktabs bằng nhóm đường kẻ ngang, ảnh raster; snapshot PNG 200dpi + padding 5pt, giới hạn 8 triệu pixel/vùng. Caption sát bảng được giữ trọn; lọc chữ trong snapshot khỏi paragraph. Chữ thường ghép theo tọa độ/font; nhận heading theo mode cỡ chữ và bold; xử lý dấu gạch nối. Lọc số trang và header/footer lặp tại mép trang, không xóa mọi chữ trong dải 6%.
- Thứ tự đọc dùng chia vùng theo khoảng trắng để giữ cột; test 2 cột. PDF pha trộn vẫn xử lý tọa độ cho trang có chữ và OCR theo giới hạn cũ cho trang scan. Nếu parser lỗi trả lỗi rõ ràng thay vì âm thầm xuất text hỏng.
- API/ReadingBlock thêm `snapshot`, `imageSrc`, `imageWidth`, `imageHeight`, `snapshotKind`, `sourceBbox`. `SnapshotFigure` có zoom 100–300%, cuộn nội bộ và phần mở rộng chữ để đọc/sao chép; TTS vẫn nhận chữ của snapshot. Bỏ cảnh báo chung PDF trên trang đọc thành công. Giữ marker danh sách từ PDF mà không thêm số/bullet lần hai.
- Mẫu `test.pdf`: 55 block, 3 snapshot bảng; thời gian đo cục bộ khoảng 0.6–0.8s. Đã xem PNG bảng thực tế (gồm bảng thứ hai trước đây bị gom sai ô) và sửa clipping caption.
- QA bằng Edge headless riêng, upload PDF thật qua UI tại 1440×1000 và 390×844: 3 figure, zoom hoạt động, không tràn chiều ngang trang; đã xem screenshot đoạn văn desktop/mobile và bảng. Backend người dùng tại cổng 8000 trả HTTP 200, 55 block, 3 snapshot và không warnings. Người dùng cần tải lại trang rồi mở lại PDF để có kết quả parser mới.
- Kiểm tra cuối: `python -m pytest` — 50 pass; `npm run test` — 17 pass; `npm run lint`, `npm run build` — pass. Ảnh QA giữ tại `output/reader-review/` để xem lại, không tự commit. Các tiến trình kiểm thử cổng 8010/5175 và thư mục tạm được dọn sau QA.
- Giới hạn còn lại: bảng không có đường kẻ hoàn toàn, biểu đồ vector, công thức và bố cục phức tạp cần thêm mẫu. Snapshot giữ hình thức của bảng nhưng font trong ảnh dùng zoom; chỉ phần chữ ngoài snapshot reflow theo setting. Không tự sửa nội dung/diễn đạt bằng LLM. DOCX chưa triển khai.
