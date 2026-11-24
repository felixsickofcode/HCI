# Kế hoạch FR-06 → FR-09 — đối chiếu với code HCI

**Yêu cầu sửa mới 2026-11-20:** xem [kế hoạch tương tác FR-06/FR-07](docs/fr06-fr07-interaction-plan.md): đóng popup khi bấm ngoài; một popup có Giải nghĩa và Lưu từ; Lưu từ tự lấy và lưu kèm nghĩa; bỏ thanh QuickSaveWord. Đây là kế hoạch chưa triển khai và thay thế phần luồng chọn/lưu cũ khi thực hiện đợt sửa này.

**Trạng thái hiện tại (2026-11-19):** tạm chấp nhận FR-02. FR-06 đã có code backend/frontend và test với **Groq** `openai/gpt-oss-120b`, chưa smoke test provider thật. FR-07 đã merge local từ `origin/feature/fr07-vocabulary` vào `feature/hong-quan` ở commit `1a8d651`; FR-08/09 là bước sau. Các mục kế hoạch bên dưới giữ bối cảnh đối chiếu cũ, trạng thái mới nhất ở dòng này và `docs/handoff.md`.

**Ngày đối chiếu:** 13/11/2026 (giờ Việt Nam).  
**Repo:** https://github.com/felixsickofcode/HCI  
**Nhánh được đọc:** `main`.  
**Commit:** `a4084f23bae7e370542ac5d17dbc88c05086b006` — merge PR #4, ngày 10/11/2026.  
**Đầu vào:** `ke-hoach-fr06-09(1).md`. Bản này bổ sung và sửa kế hoạch dựa trên mã nguồn ở commit trên.

**Giới hạn xác minh của bản đối chiếu 13/11:** đã clone repo và đọc mã frontend/backend, router, model, migration, cấu hình, test và tài liệu liên quan. Đây là đối chiếu tĩnh tại commit nêu trên; chưa chạy ứng dụng, PostgreSQL, trình duyệt hay dịch vụ AI ở lần đối chiếu đó. Không bao gồm nhánh chưa merge. Không tìm thấy `HCI.md` hoặc bộ 6 bài đọc 600–800 từ được nói đến trong bản nháp tại snapshot này; các mã NFR và quyết định trong tài liệu đó cần nhóm đối chiếu bổ sung.

## 1. Kết luận và phạm vi giữ lại

| Yêu cầu | Kết quả đọc code | Hướng triển khai |
|---|---|---|
| FR-06: tra từ theo ngữ cảnh | Đã có API/service Groq, vùng chọn trong `ReadingText` và popover tại working tree 18/11; chưa thử provider thật/QA browser | Cấu hình key backend, smoke test và QA trước khi coi hoàn tất |
| FR-07 mới: thư viện từ khó | Đã merge local ngày 19/11: model/migration, API `/me/vocabulary`, trang `/vocabulary` và lưu local cho khách | Kiểm tra kết hợp FR-06/07 đã qua; chưa push hoặc QA E2E Playwright |
| FR-08: tóm tắt có nguồn | Chưa có API, nút hoặc panel tóm tắt. Đã có văn bản và các đoạn đọc | Dùng chung LLM service với FR-06, endpoint riêng; từng ý trả ID đoạn nguồn |
| FR-09 mới: ghi âm và đối chiếu | Chưa có ghi âm, ASR, alignment hoặc lưu kết quả. TTS chỉ là đọc văn bản ra tiếng | Xây pipeline ghi âm → ASR → alignment riêng; tái sử dụng renderer sau khi mở rộng annotations |

Giữ thay đổi phạm vi của bản nháp: FR-07 chuyển thành thư viện từ khó; FR-09 chuyển thành ghi âm đọc to và đối chiếu. FR-06 và FR-08 vẫn là hai yêu cầu, hai luồng và hai nhóm kiểm thử riêng dù dùng chung service. Giữ FR-09 ở mức **C — có thể làm sau**, trừ khi nhóm chủ động nâng ưu tiên. Chưa triển khai bài tập theo từ đọc lệch, phonics hay kiểm tra đọc hiểu tự động.

## 2. Bằng chứng trong repo và chỗ cần sửa trong bản nháp

Các liên kết dưới đây cố định theo commit đã đọc. Đường dẫn được dùng trong phần hướng dẫn sau đều tính từ thư mục gốc repo.

| Bằng chứng | Code hiện tại | Hệ quả cho kế hoạch |
|---|---|---|
| [E1 — màn hình đọc](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx#L68) | Lấy `doc` từ `useDocument()`, tách `doc.text` thành `paragraph-N`, gọi `ReadingText` ở dòng 505 | Thay `ArticleViewer` trong nháp bằng hai component thực tế này |
| [E2 — renderer](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/components/common/ReadingText.tsx#L24) | `tokenize()` tách bằng khoảng trắng; `StaticHighlight` tìm cụm bằng `indexOf`; chưa có callback chọn từ | Chưa có NLP gom “sinh học” thành một từ ghép; highlight chuỗi không phân biệt đúng lần xuất hiện |
| [E3 — TTS](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/lib/speech.ts#L1) | `ReadingSegment`, `SpeechBoundaryEvent`, `SpeechController`; dùng `speechSynthesis`; xử lý boundary không đáng tin cậy | Tái sử dụng cấu trúc đoạn và renderer, không xem TTS là ASR |
| [E4 — tài liệu đang mở](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/context/DocumentProvider.tsx#L17) | `useState<ReadingDocument \| null>(null)`; không lưu tài liệu xuống localStorage hoặc DB | Refresh mất tài liệu; không thể hứa mở lại tài liệu nguồn từ thư viện từ |
| [E5 — cấu trúc tài liệu](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/lib/document.ts#L4) | ID sinh ở frontend; `toParagraphs()` trim/lọc đoạn; dán tối đa 200.000 ký tự | ID này không phải khóa ngoại DB. Offset trong đoạn không thể dùng trực tiếp cho `doc.text` gốc |
| [E6 — xác thực](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/app/api/deps.py#L46) | `get_current_user()` xác thực Bearer JWT, kiểm tra user còn tồn tại/hoạt động; có `CurrentUser` | API thư viện lấy `current_user.id`, không lấy `userId` do client tự khai |
| [E7 — các router](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/app/api/v1/router.py#L1) | Chỉ gắn `auth`, `users`, `display_settings`, `text_extraction` | FR-06→09 chưa được đăng ký |
| [E8 — API client](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/lib/api.ts#L56) | `apiFetch` gắn Bearer, nhận `signal`, phân biệt `FormData`, xử lý 204 và `ApiError` | Dùng lại cho JSON và audio upload; không tự đặt Content-Type cho multipart |
| [E9 — cài đặt](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/context/DisplaySettingsProvider.tsx#L94) | Lưu display settings local; đồng bộ server khi đăng nhập | Chỉ là mẫu luồng. FR-05 chưa lưu vị trí đọc; không gộp từ vựng vào JSON cài đặt |
| [E10 — route frontend](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/App.tsx#L1) | Có trang chủ, `/reading`, các route auth; chưa có thư viện | Phải tạo route thật, không chỉ đổi nhãn nút |
| [E11 — tủ sách mẫu](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/frontend/src/screens/MinimalHomepage/sections/CuratedReadingsSection.tsx#L6) | Card mẫu chỉ điều hướng `/reading`, không nạp bài tương ứng | Không xem card mẫu là thư viện tài liệu hoặc bộ bài kiểm thử chuẩn |
| [E12 — kiểm thử](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/tests/conftest.py#L1) | PostgreSQL test riêng; fixture `client`, `create_user`; suite hiện có cho display settings | Tái sử dụng fixture tích hợp; chưa có test FR-06→09 |
| [E13 — CRUD user](https://github.com/felixsickofcode/HCI/blob/a4084f23bae7e370542ac5d17dbc88c05086b006/app/api/v1/endpoints/users.py#L9) | List/get/update/delete user chưa khai báo dependency xác thực tại endpoint; router tổng cũng không thêm dependency | Cần bảo vệ trước khi công bố thư viện cá nhân, đặc biệt thao tác sửa/xóa tài khoản |

### 2.1 Các sửa đổi cụ thể so với bản nháp

1. **`app/services/llm_assist_service.py` là vị trí hợp lý nhưng là file mới.** Repo đã dùng `services/`, `schemas/`, `repositories/`, `models/` và lắp dependency ở `app/api/deps.py`. Không đặt toàn bộ xử lý LLM trong endpoint.
2. **Không có `ArticleViewer`.** Màn hình điều phối là `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx`; render đoạn/token là `frontend/src/components/common/ReadingText.tsx`.
3. **Không coi pipeline NLP là đã làm.** MVP cho click một token và bôi chọn cụm từ. Tự động gom từ ghép là mở rộng, cần thêm tokenizer tiếng Việt và mapping vị trí nếu triển khai sau.
4. **FR-05 không bao gồm nhớ vị trí đọc.** Bỏ FR-07 cũ là quyết định phạm vi; không ghi “đã gộp vào FR-05” như thể repo đã đáp ứng.
5. **Sửa mâu thuẫn tự lưu/nhấn lưu ở FR-07.** Chỉ lưu khi bấm “Lưu vào thư viện”. Tra cứu đơn thuần không tạo bản ghi lâu dài. Cache ngắn hạn và thư viện người dùng là hai việc khác nhau.
6. **FR-08 cần citation ngay trong hợp đồng service.** Không để “nếu có” như docstring cũ. MVP dùng ID đoạn, chưa cần LLM tự sinh offset ký tự.
7. **FR-09 cần đổi cách gọi kết quả.** ASR khác bản gốc chỉ là “chỗ nhận dạng khác văn bản”, chưa chứng minh người đọc phát âm sai. UI phải cho xem transcript và nêu giới hạn này.
8. **Nguồn đọc tự chọn vẫn có văn bản tham chiếu.** Đoạn đang mở có thể làm expected text; điểm khác bài chuẩn là mức kiểm duyệt nội dung, lỗi OCR và khả năng so sánh bài đánh giá, không phải “không có bản gốc”.
9. **Phần riêng tư:** mô tả audio là dữ liệu giọng nói có thể chứa thông tin cá nhân; không khẳng định mọi ghi âm đương nhiên là dữ liệu sinh trắc học. Quy định pháp lý cụ thể cần đánh giá riêng nếu sản phẩm triển khai thực tế.
10. **README chưa đồng nhất với code:** các bảng cũ vẫn ghi thiếu FR-01/02/04 hoặc dùng `X-User-Id`, nhưng code đã có JWT, extract text và TTS frontend. `requirements.txt` đã có `pydantic-settings`, `pwdlib[argon2]`, `PyJWT`; không thêm lại vì dòng TODO cũ trong README.

## 3. Kiến trúc chung và quy ước dữ liệu

### 3.1 Phân trách nhiệm

- `MinimalReadingView`: điều phối tài liệu, lựa chọn, panel, trạng thái yêu cầu; giữ vai trò màn hình đọc.
- `ReadingText`: render, vị trí đoạn/token, tương tác chọn và lớp đánh dấu. Không gọi API trực tiếp.
- Hook riêng: quản lý tra từ, tóm tắt, ghi âm và hủy yêu cầu; tránh dồn thêm mọi logic vào màn hình 561 dòng.
- `frontend/src/lib/api.ts`: tiếp tục giữ `apiFetch`. File API mới của từng tính năng gọi helper này.
- Endpoint FastAPI: validate request, dependency, status code; gọi service.
- Service: prompt, kiểm tra output, cache, alignment, quy tắc lưu.
- Repository/model: chỉ khi cần dữ liệu bền vững, bắt đầu với FR-07. FR-06/08 không bắt buộc có bảng DB.

**Quy ước hiện có cần giữ:** Python dùng snake_case, JSON mới dùng camelCase qua `app/schemas/base.py::CamelModel`; lỗi nghiệp vụ kế thừa `AppError`; tiền tố `/api/v1` đã gắn trong `app/main.py`, không gắn lặp trong endpoint.

### 3.2 Một nguồn đoạn đọc cho cả bốn FR

Tạo `frontend/src/lib/reading.ts` để chứa type/hàm dùng chung, chuyển `ReadingSegment` khỏi `speech.ts` và re-export tạm để giữ tương thích import. Tạo `buildReadingSegments(blocks)` từ chính `ReadingBlock[]` đã sanitize, giữ nguyên `block.id` và `block.text` như màn hình đọc/TTS hiện tại; memo hóa theo `blocks`. Không tách lại `doc.text` thành `paragraph-N`: thao tác đó làm mất ID block của PDF/ảnh, sai vị trí TTS và vùng chọn. FR-08 sau này dùng cùng tập block/segment này.

**Hợp đồng đề xuất:**

```ts
interface TextRange {
  segmentId: string;
  start: number;
  end: number;
}

interface TextSelection {
  documentId: string;   // ID tài liệu frontend, không phải DB foreign key
  contentVersion: string;
  range: TextRange;
  selectedText: string;
  contextText: string;  // chính xác text của đoạn được tham chiếu
}
```

- `[start, end)` là offset **UTF-16 code units** trong đúng `segment.text` đang render, phù hợp `slice()` JavaScript. Không dùng offset của bản PDF hoặc của `doc.text` chưa tách đoạn.
- `contentVersion` là SHA-256 của biểu diễn chuẩn `JSON.stringify(segments.map(s => [s.id, s.text]))`, UTF-8. Backend tái tạo serialization tương thích hoặc xác minh qua helper chung có fixture; không tin digest do client tự khai cho cache.
- Không normalize riêng nội dung render sau khi đã chốt vị trí. Nếu cần chuẩn hóa để so khớp, giữ mapping về bản hiển thị ban đầu.
- Python đếm Unicode code points khác JavaScript khi có emoji/ký tự ngoài BMP. Viết helper chuyển UTF-16 ↔ code point trước khi slice/kiểm tra hoặc trả kết quả từ backend. Test cả emoji trước từ, dấu tiếng Việt dạng tổ hợp và NFC.
- Với MVP, chọn từ/cụm trong **một đoạn**; chọn nhiều đoạn thông báo giới hạn. Tóm tắt có thể tham chiếu nhiều đoạn bằng nhiều `segmentId`.
- Gắn `data-segment-id` ở cả `<p>` và `<blockquote>`; gắn `data-start`, `data-end` trên phần token. Không dùng chỉ `key={segment.id}` để tìm DOM: React key không thành thuộc tính DOM.
- Khi đổi tài liệu: hủy request bằng AbortController; chỉ áp dụng response nếu `documentId`, `contentVersion`, request sequence còn khớp. Hủy ở client không bảo đảm hủy được công việc provider đã nhận.

### 3.3 Tô sáng và cuộn

Mở rộng `ReadingTextProps` với `onSelectionChange` và `annotations`. Annotation dùng `id`, `kind`, `range`; insertion của FR-09 có anchor riêng. Giữ `activeBoundary` độc lập cho TTS.

Renderer hiện có return sớm cho token TTS active, khiến lớp đánh dấu khác không xuất hiện đồng thời. Khi bổ sung, render thống nhất một token/span rồi kết hợp style theo ưu tiên: TTS dùng nền/outline; chỗ khác bản gốc dùng gạch chân + nhãn; nguồn tóm tắt dùng nhấn tạm. Cắt span theo ranh giới range nếu range chỉ phủ một phần token. Không thay nội dung chữ để thêm trạng thái.

`StaticHighlight` theo phrase chỉ phù hợp tô chuỗi chung; không dùng cho lỗi tại một lần xuất hiện của từ lặp lại. Thước đọc là overlay khác, phải giữ `pointer-events-none`.

Cuộn nguồn trong `mainRef` đang có `overflow-y-auto`, không gọi `window.scrollTo()`. Tìm DOM đoạn qua ref/`data-segment-id`, tính vị trí tương đối trong main, cuộn main và đánh dấu tạm; không làm thay đổi cỡ chữ/khoảng cách hoặc con trỏ TTS. Khi popover/modal có focus, keyboard handler ↑/↓ của thước đọc phải nhường phím cho thành phần đó.

## 4. FR-06 — tra từ/cụm từ theo ngữ cảnh

### 4.1 Giao diện và luồng

1. Click token hoặc bôi chọn cụm trong đoạn; lấy range chính xác, giữ nguyên dấu và vị trí.
2. Hiện hành động “Giải nghĩa”. Có cách thực hiện bằng bàn phím và cảm ứng, không chỉ chuột phải. Bản hiện tại có dòng hướng dẫn chuột phải nhưng chưa có `onContextMenu`; sửa nội dung đó cho khớp tính năng đã làm.
3. Mở `WordExplanationPopover` với trạng thái đang tải, kết quả, lỗi/thử lại. Popover neo vào `Range.getBoundingClientRect()`, dùng portal để tránh bị container `overflow-hidden` cắt, cập nhật/đóng khi cuộn hoặc đổi selection.
4. Gửi đoạn ngữ cảnh và range. Backend kiểm tra selected text có khớp slice của đoạn; không dùng lần xuất hiện đầu tiên từ `indexOf` khi có từ lặp.
5. Hiển thị nghĩa ngắn, ví dụ và nhãn AI. Ví dụ là ví dụ minh họa được tạo mới, không ghi như trích dẫn nguyên văn tài liệu. Nút “Lưu vào thư viện” chỉ xuất hiện khi FR-07 đã có API/luồng lưu thật.
6. Escape đóng, trả focus về hành động tra từ; không đẩy toàn bộ bài đọc xuống và không mất vùng lựa chọn khi bấm nút.

Nút nghe phát âm là tùy chọn. Nếu làm, điều phối với `SpeechController` hiện có để dừng/tạm dừng bài trước khi đọc từ; tránh hai controller cùng tranh `window.speechSynthesis`.

### 4.2 API đã triển khai

`POST /api/v1/assist/explain` → 200.

```json
{
  "documentId": "client-document-id",
  "contentVersion": "digest-of-current-segments",
  "segmentId": "paragraph-0",
  "contextText": "Em học sinh học.",
  "selectedText": "sinh học",
  "start": 7,
  "end": 15
}
```

```json
{
  "documentId": "client-document-id",
  "contentVersion": "digest-of-current-segments",
  "segmentId": "paragraph-0",
  "start": 7,
  "end": 15,
  "term": "sinh học",
  "meaning": "Môn học tìm hiểu về các sinh vật và sự sống.",
  "example": "Trong giờ sinh học, em tìm hiểu cách cây lớn lên.",
  "cached": false
}
```

`contentVersion` ở endpoint này giúp frontend đối chiếu response; vì chỉ gửi một đoạn, backend không thể xác minh hash của toàn tài liệu. Cache FR-06 phải dựa vào chính `contextText`, range và term đã được backend kiểm tra, không dựa duy nhất vào hash client.

### 4.3 Backend

- `schemas/llm_assist.py`: request/response kế thừa `CamelModel`, kiểm tra đoạn không rỗng, `0 <= start < end`, range đúng UTF-16 và selected text khớp.
- `services/llm_assist_service.py`: đợt FR-06 chỉ triển khai `explain_word(request)` với output có schema rõ ràng. `summarize_text(request)` là phần FR-08 sau này, không tạo hàm rỗng trước.
- `services/llm_provider.py`: adapter Groq với fake adapter cho test. Gọi Chat Completions qua `https://api.groq.com/openai/v1`, model `openai/gpt-oss-120b`, `response_format` JSON Schema strict cho `{meaning, example}`; validate lại bằng Pydantic và giới hạn độ dài trước khi trả UI. Với model này dùng `reasoning_effort: low` cho tác vụ tra từ ngắn, `include_reasoning: false`; không gửi `reasoning_format` vì Groq không hỗ trợ tham số đó cho GPT-OSS.
- `api/deps.py`: tạo `LLMAssistServiceDep`; endpoint `api/v1/endpoints/llm_assist.py`; đăng ký router ở `api/v1/router.py`.
- `core/config.py`, `.env.example`: `GROQ_API_KEY`, model, timeout, giới hạn đầu vào/đầu ra; key chỉ ở backend, không đặt biến `VITE_*` chứa bí mật. Dùng `.env` local hoặc secret manager khi deploy; không ghi key, đoạn đọc hay output thô vào log.
- Prompt coi đoạn người dùng là dữ liệu cần giải nghĩa, không làm theo chỉ dẫn chèn trong đoạn. Yêu cầu đúng ngữ cảnh, ngắn gọn; parse và validate response trước khi trả UI. Render plain text, không dùng HTML từ model.

### 4.4 Cache và giới hạn đề xuất cho MVP

Các con số dưới đây là **mặc định đề xuất**, chưa phải kết quả benchmark: term tối đa 120 UTF-16 units; đoạn ngữ cảnh tối đa 4.000 UTF-16 units; timeout provider 20 giây; TTL cache 15 phút; tối đa 500 mục mỗi process.

Cache key gồm task, term, hash đoạn, range, model, prompt version và scope người dùng/phiên khách. Cùng từ ở ngữ cảnh khác phải được giải nghĩa riêng. Cache dùng lại qua các request: nếu mỗi dependency tạo service mới thì không đặt cache chỉ trong instance đó; inject cache có vòng đời ứng dụng. Cache bộ nhớ không đồng bộ giữa nhiều worker; nếu triển khai nhiều instance phải thay bằng store chia sẻ hoặc chấp nhận miss cache.

Đợt FR-06 đầu tiên yêu cầu `CurrentUser` để kiểm soát sử dụng API key; giao diện khách hiện lời mời đăng nhập tại chỗ. MVP local dùng quota cấu hình mặc định **20 lượt/user/giờ**, đếm phía server và trả 429 khi vượt; state nằm trong process cùng cache nên chỉ dùng một worker ở giai đoạn này. Trước khi triển khai nhiều worker/public phải chuyển quota sang store chia sẻ hoặc giới hạn ở tầng gateway. Mở cho khách là bước sau nếu có giới hạn server theo phiên/IP và đánh giá chi phí. Không dùng `documentId` do client tự tạo làm danh tính hay quota.

Không tự cắt ngữ cảnh làm mất từ đang chọn. Vượt giới hạn thì báo người dùng chọn đoạn ngắn hơn. Trả 422 cho range sai, 413 cho payload vượt hạn mức đã công bố, 429 khi hết quota, 502 cho output provider không hợp lệ, 503 khi chưa cấu hình/không khả dụng, 504 khi timeout; mã 413 cần validation riêng, không mặc định mọi `max_length` của Pydantic đều trả 413.

### 4.5 Tiêu chí hoàn thành

- Tra được từ đơn và cụm nhiều âm tiết; từ lặp lại dùng đúng ngữ cảnh/range.
- Đổi selection/tài liệu nhanh không hiện kết quả cũ ở lựa chọn mới.
- Có loading, lỗi, thử lại và trạng thái không đủ ngữ cảnh; không hiện success giả.
- Font, theme, focus line, TTS tiếp tục hoạt động; popover không bị che trên mobile.
- Cache phân biệt ngữ cảnh/model/prompt, có TTL và giới hạn bộ nhớ.

### 4.6 Kế hoạch triển khai FR-06 trong đợt này

1. **Chốt nguồn chữ và vùng chọn:** dùng `ReadingBlock.id/text` làm segment duy nhất cho TTS và tra từ; chỉ cho chọn trong block chữ đang render (`paragraph`, `heading`, `listItem`, `quote`). Gắn `data-segment-id`/offset cho DOM; xác định selection theo DOM Range, không `indexOf`. Với `snapshot`/bảng, chưa tra trực tiếp trên ảnh; phần text thay thế chỉ tra khi hiện thành chữ có thể chọn và mapping rõ. Test cụm nhiều âm tiết, từ lặp, emoji, dấu tổ hợp và chọn qua nhiều span.
2. **Dựng hành động và popover:** click từ hoặc bôi chọn cụm sẽ hiện nút “Giải nghĩa”; có đường dùng bàn phím/cảm ứng. Popover portal có loading, nghĩa, ví dụ, lỗi/thử lại, Escape và quản lý focus. Đổi selection, đổi tài liệu hoặc chuyển “Bản gốc” hủy request và bỏ response cũ. Không làm gián đoạn highlight TTS hay thước đọc.
3. **Làm API và Groq adapter:** thêm schema, endpoint `POST /assist/explain`, service, dependency và cấu hình backend. Kiểm tra range UTF-16/selectedText trước khi gọi Groq; prompt tiếng Việt tách dữ liệu tài liệu khỏi chỉ dẫn, chỉ trả nghĩa trong ngữ cảnh và ví dụ mới. Dùng JSON Schema strict, giới hạn output, timeout; ánh xạ lỗi 422/413/429/502/503/504. Không thêm migration cho FR-06.
4. **Kiểm soát chi phí và dữ liệu:** đăng nhập bắt buộc ở MVP, quota theo user phía server; cache TTL theo term, context, range, model và prompt version, không lưu nội dung bền vững. Chỉ gửi đoạn ngữ cảnh cần thiết tới Groq; UI cho biết nội dung chọn/ngữ cảnh được gửi tới dịch vụ AI. API key chỉ nằm ở backend.
5. **Kiểm thử và nghiệm thu:** backend fake provider cho input/range, structured output sai, timeout, quota/cache và prompt injection; smoke test thật một số câu tiếng Việt với key local, không dùng tài liệu riêng tư. Frontend test selection, stale response, lỗi, focus/Escape, TTS; chạy `python -m pytest`, `npm run test`, `npm run lint`, `npm run build`, QA desktop/mobile với PDF và văn bản dán. Chỉ coi FR-06 xong khi kết quả đúng lần xuất hiện được chọn và các trạng thái lỗi không tạo nghĩa giả.

**Phụ thuộc sau FR-06:** FR-07 mới bổ sung lưu từ; FR-08 dùng lại provider nhưng có schema/prompt/kiểm chứng nguồn riêng. Không dựng trước API lưu từ hoặc tóm tắt trong đợt này.

**Tham chiếu Groq:** [model GPT-OSS 120B](https://console.groq.com/docs/model/openai/gpt-oss-120b), [Structured Outputs](https://console.groq.com/docs/structured-outputs), [reasoning parameters](https://console.groq.com/docs/reasoning). Kiểm lại các tham số và giới hạn tài khoản trên Groq lúc tích hợp vì chúng có thể thay đổi.

## 5. FR-08 — tóm tắt toàn bài có trỏ về nguồn

### 5.1 Thiết kế phù hợp repo

Thêm nút “Tóm tắt” ở vùng hành động cạnh khu vực audio; mở `SummaryPanel` riêng, có thể thu gọn. Không đặt kết quả tóm tắt vào `DisplaySettingsProvider` hoặc tab cài đặt hiển thị.

Frontend gửi **cùng danh sách segments đang render**. Mỗi ý tóm tắt có ít nhất một nguồn. Bấm nguồn gọi helper cuộn trong main. Khi đổi bài, xóa trạng thái tóm tắt cũ hoặc lấy đúng cache theo phiên bản nội dung.

### 5.2 API đề xuất

`POST /api/v1/assist/summarize` → 200.

```json
{
  "documentId": "client-document-id",
  "contentVersion": "digest-of-current-segments",
  "segments": [
    {"id": "paragraph-0", "text": "Cây cần ánh sáng để quang hợp."},
    {"id": "paragraph-1", "text": "Cây cũng cần nước để phát triển."}
  ],
  "maxItems": 3
}
```

```json
{
  "documentId": "client-document-id",
  "contentVersion": "digest-of-current-segments",
  "items": [
    {
      "id": "summary-1",
      "text": "Cây cần ánh sáng để quang hợp và cần nước để phát triển.",
      "sources": [
        {"segmentId": "paragraph-0", "quote": "Cây cần ánh sáng để quang hợp."},
        {"segmentId": "paragraph-1", "quote": "Cây cũng cần nước để phát triển."}
      ]
    }
  ],
  "cached": false
}
```

ID và quote do model gợi ý phải được backend kiểm tra: ID nằm trong request; quote là substring nguyên văn không rỗng của đoạn tương ứng; mỗi ý có nguồn. Không hợp lệ thì thử sửa output có giới hạn hoặc trả lỗi, không trả citation giả. MVP cuộn tới toàn đoạn; không cần xác định lần xuất hiện của quote.

**Citation đúng hình thức chưa chứng minh ý tóm tắt đúng nghĩa.** Vẫn cần review thủ công: ý được đoạn nguồn hỗ trợ, không thêm người/số liệu/kết luận, không đổi phủ định, giữ điều kiện và ngoại lệ quan trọng. Prompt hoặc JSON schema không đủ để cam kết tuyệt đối không bịa.

### 5.3 Văn bản dài và chi phí

- Giới hạn đề xuất ban đầu: tối đa 20.000 UTF-16 units tổng nội dung và 100 đoạn; 3–5 ý, output khoảng 150–200 từ theo cách đếm thống nhất của nhóm.
- Giới hạn dán 200.000 ký tự hiện có không đồng nghĩa LLM phải nhận toàn bộ. Backend cũng kiểm tra giới hạn/token budget theo model thực tế; số ký tự không phải số token.
- Vượt giới hạn: báo rõ chưa hỗ trợ tóm tắt toàn bài dài đến mức đó. Không âm thầm tóm tắt vài đoạn đầu rồi gọi là “toàn bài”.
- Chia khối là pha sau: mỗi khối giữ ID đoạn gốc, tổng hợp vẫn bảo toàn nguồn và kiểm thử trường hợp lặp/mất ý. Không cần đưa vào MVP trước khi có nhu cầu.
- Cache key gồm hash segments do server tính, tham số tóm tắt, model, prompt version và scope; không dùng riêng `doc.id`.

### 5.4 Tiêu chí hoàn thành

- Mỗi ý có nguồn hợp lệ; click về đúng đoạn trong vùng cuộn thật.
- Đầu vào rỗng, vượt giới hạn, JSON hỏng, nguồn bịa hoặc timeout đều có xử lý.
- Bộ ví dụ review có phủ định, số liệu, nhiều đoạn và lỗi OCR; ghi kết quả review, không cam kết phần trăm chưa đo.
- Tóm tắt không thay đổi văn bản gốc và không làm sai mapping TTS/tra từ.

## 6. FR-07 — thư viện từ khó cá nhân

### 6.1 Luồng thống nhất

Chỉ bấm “Lưu vào thư viện” mới lưu term, nghĩa, ví dụ, đoạn ngữ cảnh tối thiểu, thời điểm lưu và metadata nguồn. Mặc định danh sách phẳng, mới nhất trước; cho tìm term, lọc ngày/nguồn, xóa từng mục hoặc xóa toàn bộ. Tự thêm từ thủ công và nhóm theo tài liệu để pha sau.

- **Khách:** lưu dưới key có version, ví dụ `lexiease:vocabulary:guest:v1`; thông báo “Chỉ lưu trên trình duyệt này”. Kiểm tra schema khi đọc, xử lý quota và storage bị chặn.
- **Đăng nhập:** lưu qua `/me/vocabulary`; lấy user từ JWT. Thất bại phải hiển thị chưa lưu, không âm thầm biến thành mục local rồi báo đã đồng bộ.
- **Đăng nhập từ chế độ khách:** MVP giữ hai kho riêng, không tự đẩy dữ liệu khách lên server. Nếu làm nhập dữ liệu, phải có thao tác “Nhập các từ đã lưu trên máy” rõ ràng và chống trùng.
- **Đăng xuất/đổi tài khoản:** hủy request cũ, xóa danh sách server trong state/cache; không trộn thư viện người trước vào khách/người sau.
- Chờ `AuthProvider.isLoading` hoàn tất rồi mới chọn nguồn dữ liệu. Token hết hạn → báo cần đăng nhập lại, không ghi vào kho khách ngoài ý muốn.

### 6.2 Model đề xuất

Thêm `app/models/vocabulary.py::VocabularyEntry`, bảng `vocabulary_entries`.

| Trường | Đề xuất |
|---|---|
| `id` | Khóa chính số nguyên, phù hợp phong cách model hiện có |
| `user_id` | FK `users.id`, index, `ON DELETE CASCADE` |
| `term`, `normalized_term` | Chuỗi gốc và bản chuẩn hóa NFC/lowercase/chuẩn khoảng trắng để tìm kiếm |
| `meaning`, `example` | Nội dung đã nhận; example có thể null |
| `context_text` | Đoạn dùng để tra, giới hạn kích thước; không lưu toàn bài |
| `source_document_id`, `source_title`, `source_kind` | Metadata nullable; ID nguồn là chuỗi client, **không phải FK documents** |
| `content_version`, `segment_id`, `start`, `end` | Range và phiên bản lúc lưu; offset theo quy ước UTF-16 |
| `dedupe_key` | Hash do backend tính từ term chuẩn hóa + context chuẩn hóa + metadata/range nguồn |
| `created_at` | Thời điểm lưu, UTC; UI hiển thị giờ địa phương |

Thêm unique constraint `(user_id, dedupe_key)` để xử lý hai request lưu đồng thời. Cùng từ nhưng ngữ cảnh khác được lưu riêng. MVP lưu trùng trả mục đã có, không tăng thêm dòng. Backend rollback khi unique conflict rồi lấy lại bản ghi đúng user.

Ngày lưu không nhất thiết là ngày tra nếu người dùng lưu sau; UI dùng nhãn “Ngày lưu”. `source_document_id` chỉ có thể giúp mở lại đoạn khi tài liệu tương ứng còn đang ở `DocumentProvider` và `contentVersion` khớp. Sau refresh hoặc đổi tài liệu, hiển thị nguồn + context đã lưu; không đưa nút “Mở tài liệu gốc” hoạt động giả.

### 6.3 API đề xuất

Tất cả endpoint server yêu cầu `CurrentUser`; request không có trường điều khiển owner.

| Method | URL | Kết quả |
|---|---|---|
| GET | `/api/v1/me/vocabulary?q=&sourceDocumentId=&from=&to=&skip=0&limit=20` | `{items, total, skip, limit}`, thứ tự `createdAt DESC, id DESC`; limit tối đa 100 |
| POST | `/api/v1/me/vocabulary` | 201 khi tạo; 200 và mục hiện có nếu trùng dedupe key |
| DELETE | `/api/v1/me/vocabulary/{entry_id}` | 204 nếu xóa; 404 nếu không thuộc user hoặc không tồn tại |
| DELETE | `/api/v1/me/vocabulary` | 204 sau xóa mọi mục của user hiện tại; UI xác nhận trước |

POST nhận các trường nội dung/nguồn ở bảng trên, trừ `id`, `user_id`, `normalized_term`, `dedupe_key`, `created_at` do server quản lý. Cho phép metadata nguồn null, nhưng các trường range phải cùng đầy đủ hoặc cùng thiếu; khi có range phải khớp context. Lọc ngày: nhận timestamp ISO có timezone, dùng khoảng `[from, to)`; frontend chuyển khoảng ngày địa phương thành mốc UTC.

Repository mọi query đọc/xóa đều scope `user_id`, kể cả thao tác bằng `entry_id`. Không chỉ `db.get(entry_id)` rồi trả dữ liệu.

### 6.4 File và tích hợp

1. Model + import ở `app/models/__init__.py`; Alembic đã import module này trong `alembic/env.py`.
2. Migration mới nối vào head hiện tại `c4f1a7d92b10`; kiểm tra head lại trước khi tạo vì main có thể tiến lên. Không sửa hai migration cũ đã có.
3. Thêm `schemas/vocabulary.py`, `repositories/vocabulary_repository.py`, `services/vocabulary_service.py`, `api/v1/endpoints/vocabulary.py`.
4. Khai báo dependency và gắn router; giữ service/repository sync với SQLAlchemy Session hiện tại.
5. Frontend thêm `lib/vocabulary.ts` (type, API, local store) và `hooks/useVocabulary.ts` (load/save/delete, auth lifecycle). Với quy mô hiện tại chưa bắt buộc thêm provider toàn ứng dụng; nếu cần chia state giữa màn hình thì nâng thành provider nằm dưới `AuthProvider`.
6. Tạo `screens/Vocabulary/Vocabulary.tsx`; export trong `screens/index.ts`, thêm route `/vocabulary` trong `App.tsx`. Trang phải mở được khi chưa có tài liệu.
7. Sidebar đọc hiện là các `div` disabled: chuyển mục phù hợp thành `Link`/`NavLink` thật, tên “Từ khó của tôi”. Cập nhật `mocks/navigation.ts` vì Header đang đọc danh sách này; thêm lối vào trên mobile vì sidebar desktop bị ẩn.
8. Không biến phần “Tủ sách tuyển chọn” thành thư viện từ chỉ bằng đổi nhãn; đó là nội dung khác.

### 6.5 Điều kiện bảo vệ dữ liệu và nghiệm thu

Trước phát hành tính năng cá nhân, xử lý CRUD `/users` đang mở trong E13: chuyển thao tác tự phục vụ sang quyền chính chủ; list/detail người khác chỉ cho vai trò quản trị nếu có, hoặc bỏ khỏi API công khai. Chỉ thêm auth cho vocabulary chưa giải quyết việc người ngoài có thể sửa/xóa user qua router cũ. Test tạo user nên dùng `/auth/register`; test xóa user phải được cập nhật theo quyền mới.

Nghiệm thu: user A không đọc/xóa mục user B; trùng request không tạo hai dòng; khách và hai tài khoản không trộn dữ liệu; lưu/xóa và lọc hoạt động; refresh giữ từ đã lưu nhưng không hứa giữ tài liệu; lỗi lưu không báo thành công; xóa toàn bộ có xác nhận và không đụng kho khác.

## 7. FR-09 — ghi âm đọc to và đối chiếu với đoạn gốc

### 7.1 Phạm vi MVP đề xuất

Giữ ưu tiên C. Trước hết chọn **một đoạn trong tài liệu đang mở**, ngắn khoảng 50–150 đơn vị cách trắng, giới hạn tối đa 60 giây và 10 MiB audio (giá trị thử nghiệm). Đây là lựa chọn đề xuất để dùng luồng nhập hiện có, chưa thay cho quyết định nhóm.

Không thấy bộ sáu bài chuẩn trong repo; nếu muốn dùng làm kiểm thử phải đưa nội dung đã duyệt và metadata vào tập fixture riêng. Bài OCR cần người dùng kiểm tra văn bản trước khi ghi âm; lỗi OCR có thể gây sai lệch khi đối chiếu.

### 7.2 Frontend

- Tạo `ReadingPracticePanel` và `hooks/useReadingRecorder.ts`.
- Trạng thái: idle → requestingPermission → recording → recorded → uploading → analyzing → result/error; có hủy và ghi lại.
- Chỉ xin micro sau hành động của người dùng. Kiểm tra hỗ trợ `mediaDevices.getUserMedia`, `MediaRecorder`, MIME codec; HTTPS hoặc môi trường localhost phù hợp. Kiểm thử thực tế trên các trình duyệt nhóm hỗ trợ.
- Khi bắt đầu, dừng TTS để tránh máy tự đọc lọt vào bản ghi. Chụp snapshot đoạn/range/contentVersion và không đổi expected text trong khi phân tích.
- Có nghe lại trước khi gửi; nói rõ audio sẽ gửi dịch vụ nhận dạng nào sau khi chốt provider.
- Sau stop/cancel/unmount, dừng mọi media track, thu hồi object URL, xóa chunk không cần; không ghi âm tiếp nền sau khi đóng panel.
- Giới hạn thời lượng/kích thước ở cả client và server. Không coi `durationMs` do client gửi là kiểm chứng audio.

### 7.3 API và backend đề xuất

`POST /api/v1/reading-practice/analyze` nhận multipart:

- `audio`: file ghi âm.
- `metadata`: chuỗi JSON gồm `documentId`, `contentVersion`, `segmentId`, `segmentText`, `start`, `end`, `language: "vi-VN"`.

Backend parse metadata bằng schema, kiểm tra range, tự lấy expected text từ segmentText theo range. Kiểm tra audio có dữ liệu, định dạng thực, duration thực, size và decoder có hỗ trợ; không chỉ tin tên file/Content-Type. Provider có thể cần chuyển codec; chỉ bổ sung công cụ chuyển đổi sau khi chọn provider, không mặc định mọi nơi đều có FFmpeg.

Các file mới:

- `schemas/reading_practice.py`: metadata, transcript, alignment, warnings.
- `services/asr_service.py`: adapter nhận dạng, tách khỏi LLM/TTS.
- `services/alignment_service.py`: chuẩn hóa, token hóa, Levenshtein và mapping; có unit test độc lập.
- `services/reading_practice_service.py`: điều phối kiểm tra → ASR → alignment.
- `api/v1/endpoints/reading_practice.py`; dependency trong `deps.py`; router tổng.
- Cấu hình provider, language, timeout, size/duration limits trong `config.py` và `.env.example`.

MVP trả kết quả trực tiếp trong request nếu thử nghiệm độ trễ đáp ứng timeout; chưa đưa queue vào mặc định. Nếu thời gian xử lý vượt ngưỡng thực tế, chuyển sang job 202 + polling ở pha sau. Hủy client không bảo đảm provider dừng; vẫn cleanup phía server.

### 7.4 Alignment và cách hiển thị

- Khởi đầu so khớp theo **đơn vị cách trắng/âm tiết**, không gọi là tách từ tiếng Việt hoàn chỉnh.
- Chuẩn hóa Unicode NFC, lowercase, khoảng trắng; dấu câu có thể bỏ qua theo rule đã công bố. **Giữ dấu thanh và dấu chữ tiếng Việt** trong bản so khớp chính.
- Giữ mapping từ token đã chuẩn hóa sang `[start,end)` của segment gốc. Khi chọn một phần đoạn, cộng offset bắt đầu vùng chọn trước khi trả range; sau đó chuyển sang UTF-16.
- Thuật toán Levenshtein trả `match`, `substitution`, `deletion`, `insertion`; định nghĩa quy tắc tie-break ổn định và test từ lặp.
- Substitution/deletion có range trong bản gốc. Insertion không có từ gốc để tô: trả `anchorOffset` (có thể bằng cuối đoạn), hiển thị chip/marker ở điểm chèn và transcript, không tô nhầm từ kế bên.
- Không dùng `StaticHighlight.phrase` hoặc `SpeechBoundaryEvent` để nhét mọi lỗi vào. Dùng annotations mới với màu + gạch chân/nhãn, không chỉ màu.
- Hiển thị bản gốc, transcript nhận dạng và các chỗ khác nhau. Nhãn “Khác văn bản / Thiếu trong bản nhận dạng / Thừa trong bản nhận dạng”; không kết luận rối loạn hoặc chẩn đoán.
- Nếu provider không trả confidence thì để null/không hiển thị; không bịa mức tin cậy. Transcript rỗng do im lặng/lỗi nhận dạng thì báo chưa nhận dạng được, không đánh giá người dùng bỏ hết bài.

Có thể ghi tỷ lệ edit theo công thức `(S + D + I) / N`, `N` là số đơn vị tham chiếu. Với tokenizer trên, phải ghi rõ là tỷ lệ theo đơn vị cách trắng; không quảng cáo thành điểm phát âm hoặc accuracy ASR đã kiểm chứng. Tỷ lệ có thể lớn hơn 1 khi có nhiều insertion; N=0 phải bị chặn.

### 7.5 Lưu dữ liệu và riêng tư

Bản nháp yêu cầu lưu kết quả để mở rộng về sau; tách thành hai mốc rõ ràng:

- **FR-09A — prototype:** không lưu bền vững audio/kết quả; hiển thị trong phiên. Không đánh dấu toàn bộ yêu cầu lưu lịch sử là xong.
- **FR-09B — lưu kết quả có đồng ý:** user bấm “Lưu kết quả”; thêm model `ReadingAttempt`, repository, migration và API `/me/reading-attempts` có quyền sở hữu. Lưu snapshot đoạn đã chọn, transcript, alignment, ngày, phiên bản tokenizer/provider; không mặc định lưu toàn tài liệu/audio. Cho xóa từng lần/toàn bộ.

Audio tạm phải cleanup cả thành công/lỗi/timeout; không log raw audio, transcript hay toàn văn. Chính sách lưu ở provider phải được kiểm tra khi chọn dịch vụ, không hứa “xóa ngay ở mọi nơi” chỉ vì server ứng dụng đã xóa file tạm. Quy trình dùng cho trẻ em cần nhóm chốt với phạm vi nghiên cứu/sản phẩm trước khi thu dữ liệu thực.

### 7.6 Nghiệm thu

Từ chối micro, không có mic, codec không hỗ trợ, im lặng, file hỏng, quá dung lượng, quá thời gian, timeout, hủy và đổi bài đều có trạng thái rõ. Không còn media track hoạt động sau khi kết thúc. Test match/substitution/deletion/insertion, từ lặp, dấu tiếng Việt, emoji và range một phần đoạn. Provider ASR cần thử trên mẫu có transcript do người kiểm tra và nhiều giọng đọc; chưa cam kết số liệu khi chưa đo. Hai luồng TTS/ghi âm không phát cùng lúc.

## 8. Danh sách file cần thêm/sửa

Bảng này là **đề xuất triển khai**, không phải danh sách các file đã tồn tại. Những path hiện có đã được kiểm tra ở mục 2.

| Nhóm | File mới | File hiện có cần sửa |
|---|---|---|
| Hạ tầng chọn/đánh dấu | `frontend/src/lib/reading.ts`, `frontend/src/lib/text-selection.ts` | `ReadingText.tsx`, `lib/speech.ts`, `MinimalReadingView.tsx` |
| FR-06/08 frontend | `lib/assist.ts`, `hooks/useWordExplanation.ts`, `hooks/useSummary.ts`, `components/reading/WordExplanationPopover.tsx`, `components/reading/SummaryPanel.tsx` dưới `frontend/src/` | Màn hình đọc; sửa hướng dẫn chuột phải hiện tại |
| FR-06/08 backend | `app/schemas/llm_assist.py`, `app/services/llm_assist_service.py`, `app/services/llm_provider.py`, `app/api/v1/endpoints/llm_assist.py`; helper cache/offset nếu cần | `app/api/deps.py`, `app/api/v1/router.py`, `app/core/config.py`, `app/core/exceptions.py`, `.env.example`; requirements nếu provider cần dependency mới |
| FR-07 frontend | `frontend/src/lib/vocabulary.ts`, `frontend/src/hooks/useVocabulary.ts`, `frontend/src/screens/Vocabulary/Vocabulary.tsx` | Popover mới, `App.tsx`, `screens/index.ts`, sidebar đọc, `mocks/navigation.ts`, lối vào mobile |
| FR-07 backend | Model/schema/repository/service/endpoint vocabulary; migration mới | `app/models/__init__.py`, deps/router; quyền ở `users.py` và test liên quan |
| FR-09A frontend | `frontend/src/components/reading/ReadingPracticePanel.tsx`, `frontend/src/hooks/useReadingRecorder.ts`, `frontend/src/lib/reading-practice.ts` | Màn hình đọc, renderer annotations, điều phối TTS |
| FR-09A backend | Schema, ASR/alignment/practice service, endpoint ở mục 7 | deps/router/config/exceptions/requirements khi cần |
| FR-09B tùy chọn | Model/repository/schema/service/endpoint reading attempts; migration | Model imports, deps/router; UI lưu/xem/xóa kết quả |
| Tài liệu/test | Tests ở mục 10; fixture văn bản/audio đã được đồng ý sử dụng | README; `HCI.md` khi nhóm cung cấp bản thật; cấu hình frontend test nếu thêm runner |

Không bắt buộc tạo mọi abstraction ngay từ PR đầu. Tách module theo trách nhiệm trên; không tạo sẵn DB cho kết quả AI/cache chỉ để đủ “4 lớp”.

## 9. Thứ tự triển khai và đầu ra từng bước

| Bước | Nội dung | Đầu ra kiểm tra được |
|---|---|---|
| 0 | Chốt hành vi lưu bằng nút, nguồn dữ liệu, chế độ khách; ghi lại giới hạn đề xuất. Sửa README sai trạng thái và quyền CRUD user trước phát hành cá nhân | Hợp đồng tính năng và quyền nhất quán, không hiểu nhầm FR-05 là lưu tiến độ |
| 1 | Gom `ReadingSegment`, hàm tạo đoạn, selection/ranges và annotation renderer; thêm test Unicode/từ lặp | Vùng chọn và vị trí được tái sử dụng; TTS/focus line vẫn chạy |
| 2 | LLM adapter + schema + endpoint explain; dùng fake provider trước; nối popover thật | Tra từ end-to-end trong môi trường kiểm thử, lỗi/cache được kiểm soát |
| 3 | Vocabulary model/migration/API + local khách + trang riêng | Tra → chủ động lưu → xem/lọc/xóa; user isolation và auth lifecycle đạt |
| 4 | Summarize endpoint + kiểm tra nguồn + panel + cuộn | Tóm tắt có nguồn, không vượt giới hạn âm thầm, review mẫu hoàn tất |
| 5 | Thử nghiệm ASR tiếng Việt/codec/độ trễ, chốt nguồn đoạn đọc | Có bằng chứng chọn provider; nhóm quyết định tiếp tục FR-09 C |
| 6 | Recorder + ASR + alignment + annotations | FR-09A hoạt động, giới hạn kết quả trình bày đúng |
| 7 | Nếu nhóm duyệt lưu lịch sử, làm FR-09B | Lưu/xóa có đồng ý và phạm vi riêng tư rõ |

Mỗi bước là một PR hoặc nhóm commit review được. LLM adapter/schema dùng chung phải thống nhất trước khi người khác làm FR-08. Người làm renderer cần bàn với người phụ trách TTS; người làm model cần thống nhất chuỗi Alembic. Không phân công tên người khi chưa có thông tin nhóm.

## 10. Kiểm thử cần bổ sung và cách xác nhận

### 10.1 Backend

- `tests/test_llm_assist.py`: fake provider qua dependency override; giải nghĩa đúng range; cache hit/miss theo context; timeout/output hỏng; tóm tắt thiếu nguồn/nguồn không tồn tại/quote bịa; giới hạn payload và quota.
- `tests/test_vocabulary.py`: fixture `create_user` sau khi sửa sang auth register; missing/expired JWT; A/B isolation; race lưu trùng; phân trang/lọc; xóa toàn bộ chỉ ảnh hưởng chính chủ; FK cascade đúng.
- `tests/test_alignment.py`: bảng input/output có match, thay, thiếu, thừa, từ lặp; mapping Unicode/UTF-16; empty reference; dấu thanh và dấu câu.
- `tests/test_reading_practice.py`: fake ASR, audio lỗi/quá lớn/quá dài, im lặng, timeout, cleanup cả error path; không ghi DB ở FR-09A.
- Nếu có FR-09B: test lưu/xóa attempt và account isolation tương tự vocabulary.
- `tests/conftest.py` hiện kết nối DB và autouse tạo/dọn schema, kể cả unit test đặt chung thư mục. Nếu muốn unit test alignment không cần DB, tách fixture integration sang thư mục con phù hợp; không tuyên bố chỉ thêm file unit là chạy offline được.
- Bộ test hiện tạo bảng bằng `Base.metadata.create_all()`, không chứng minh migration mới chạy đúng. Kiểm tra migration riêng trên database thử nghiệm trống và trên schema cũ với dữ liệu mẫu.

### 10.2 Frontend và kiểm thử thủ công

`frontend/package.json` hiện có `dev`, `build`, `lint`, `preview`, **chưa có test runner/script**. Nếu thêm automated test dùng Vitest/Testing Library hoặc công cụ nhóm chọn thì bổ sung dependency/script/config trước; không hướng dẫn chạy `npm test` như thể đã có.

Các tình huống bắt buộc:

- Tra “sinh học” nhiều âm tiết; từ “đường” trong hai ngữ cảnh; chọn lần xuất hiện thứ hai; chọn có dấu câu; emoji/dấu tổ hợp trước vùng chọn.
- Chuyển bài hoặc selection trong lúc chờ; logout trong lúc lưu; refresh ở trang vocabulary; token hết hạn; storage đầy.
- Tóm tắt click đúng đoạn; bài vượt hạn mức; nguồn sai; không có provider; mạng đứt.
- TTS cùng annotations; thay font/cỡ chữ/theme; thước đọc; ↑/↓ khi popover có focus; mobile/touch và Escape.
- Ghi âm xin quyền/từ chối/hủy/đóng panel, mic ngừng; tiếng TTS không lọt vào audio; insertion hiển thị đúng điểm neo.

### 10.3 Lệnh kiểm tra sau khi triển khai (chưa chạy trong lần đối chiếu này)

Từ root repo, sau khi cấu hình môi trường và PostgreSQL test riêng:

```bash
python -m alembic heads
python -m pytest
```

Kiểm tra migration bằng `python -m alembic upgrade head` trên database thử nghiệm dành riêng; không dùng production để thử upgrade/downgrade. Khi thêm model, xác nhận `app/models/__init__.py` đã import và migration không rỗng.

Frontend, sau khi cài dependency theo lockfile hiện có:

```bash
cd frontend
npm ci
npm run build
npm run lint
```

Đây là kế hoạch xác nhận khi code tính năng, không phải báo cáo test pass. Không cần API key thật cho test tự động; test provider thật chạy riêng trên dữ liệu đã được đồng ý gửi.

## 11. Các quyết định còn cần nhóm chốt

| Quyết định | Đề xuất trong plan | Ảnh hưởng nếu chọn khác |
|---|---|---|
| Có giữ nhớ vị trí đọc? | Tách thành backlog riêng; chưa nằm trong FR-05 và chưa triển khai | Muốn giữ phải thêm persistence tài liệu/position, không chỉ đổi nhãn FR |
| Thư viện tự lưu hay bấm lưu? | Bấm lưu; đáp ứng luồng đồng ý trong bản nháp | Tự lưu cần thiết kế đồng ý riêng và thay tiêu chí nghiệm thu |
| Khách dùng LLM? | Có, kèm quota server; nếu chưa kiểm soát chi phí thì giới hạn cho login | Thay UX của chế độ ẩn danh, phải ghi rõ |
| Provider/model LLM và ASR? | Chưa chốt; adapter + fake test trước | Ảnh hưởng schema output, token budget, chi phí, dữ liệu gửi đi, codec |
| Nguồn FR-09? | Một đoạn tự chọn đã kiểm tra trong tài liệu đang mở | Bài chuẩn cần dữ liệu đã duyệt, metadata và luồng nạp bài mới |
| FR-09 có lưu lịch sử ngay? | FR-09A trước, FR-09B sau khi duyệt | Nếu yêu cầu lưu ngay thì FR-09B bắt buộc trước khi coi FR-09 hoàn tất |
| Bộ 6 bài chuẩn và `HCI.md` ở đâu? | Bổ sung tài liệu nguồn trước khi xác nhận NFR/bộ đánh giá | Chưa thể khẳng định đã có dữ liệu/test coverage tương ứng |
| Bài tập theo lỗi và kiểm tra đọc hiểu? | Tiếp tục để ngoài phạm vi | Cần yêu cầu và bộ dữ liệu/tiêu chí đánh giá mới |

**Phạm vi kết quả của lần làm này:** cập nhật kế hoạch, đối chiếu đường dẫn và luồng code tại commit đã nêu; chưa sửa mã ứng dụng, chưa commit/push hoặc triển khai FR-06→09 lên repo.
