# Handoff dự án HCI

Cập nhật hiện hành: **2026-11-25**, múi giờ Asia/Bangkok. Agent đọc phần hiện hành trước; các mục dưới “Nhật ký lịch sử” ghi diễn tiến, có quyết định đã được thay thế. Cập nhật file này cuối mỗi phiên.

## Trạng thái hiện hành và ý định người dùng

- **Trang đọc, 25/11.** Sidebar có Trang chủ, Đọc tài liệu, Thư viện từ khó và nút Cài đặt hiển thị. Bảng mở theo yêu cầu; Esc quay về nút mở. Công cụ chỉnh cỡ chữ và thước nằm cạnh bài. Kiểm tra giao diện bằng `npx playwright test e2e/reader-navigation.spec.ts e2e/fr03-ruler.spec.ts` trong `frontend/`.

- **FR-03, thước đọc cố định (2026-11-20).** Trong **Hỗ trợ đọc**, người dùng chọn cửa sổ 1, 2 hoặc 3 dòng. Bấm ↑/↓, Dòng trước/sau, lăn chuột hoặc vuốt trong văn bản để dịch một dòng hiển thị. `FixedReadingRuler` đo dòng ngay trên các token của `ReadingText` để tính cả dòng tự ngắt, tiêu đề, trích dẫn và khoảng cách đoạn. Mục `focus.lineCount` được lưu ở trình duyệt và trong JSONB của tài khoản (schema v2, dữ liệu cũ mặc định 1). Đã kiểm tra PNG và PDF scan tiếng Việt qua Tesseract và giao diện tải tệp, chuyển Bản gốc/Trang đọc, chọn từ và đổi bề rộng/cỡ chữ. Pytest 129, Vitest 42 và Playwright FR-03 3 test đạt. Chạy lại kiểm thử giao diện từ `frontend/` bằng `npx playwright test e2e/fr03-ruler.spec.ts`.
- **Bàn giao remote 2026-11-20:** người dùng yêu cầu push cả `origin/feature/hong-quan` và `origin/main`. Đã fetch lại cả hai nhánh, xác nhận cả hai là tổ tiên của HEAD sau merge `f3896d3`, có thể cập nhật fast-forward không force. Phiên này đóng gói toàn bộ code/test/docs FR05–FR07, parser/benchmark và các thay đổi giao diện đã bàn giao; không đưa `.env`, PDF cá nhân, output QA/cache vào commit. Đích hai nhánh remote là cùng commit bàn giao (xem `git log -1`/remote refs để lấy hash). Kiểm tra bản kết hợp trước bàn giao: backend **126 passed**, frontend **42 passed**, lint/build pass; không chạy lại vì không đổi code sau kiểm tra. Các mục “chưa push” phía dưới ghi trạng thái lịch sử tại thời điểm thực hiện.
- **Merge main 2026-11-20:** theo yêu cầu người dùng, fetch `origin/main` tại `aa74e75` và merge vào `feature/hong-quan` bằng commit local `f3896d3`. Main mang FR-08 extractive summary. Xung đột merge tại deps/router được xử lý giữ cả vocabulary và summary; khôi phục thay đổi chưa commit có thêm xung đột deps/router/config/exceptions, đã giữ cả FR-06 Groq và FR-08. Toàn bộ 31 thay đổi tracked cùng 46 file untracked đã đối chiếu với stash: không thiếu file; chỉ bốn file tích hợp nói trên khác nội dung có chủ đích. Các thay đổi cũ vẫn chưa staged/chưa commit. Giữ stash `pre-main-merge-2026-11-20` (`119708b`) làm dự phòng. Kiểm tra sau merge: backend **126 passed** trên `_test`, frontend **42 passed**, lint/build pass, không còn unmerged paths. Chưa push.
- **FR-05 đọc phần chọn 2026-11-20:** popup chọn chữ có nút **Đọc phần đã chọn**, dùng được cho khách và tài khoản. Bôi chọn một phần hoặc toàn bộ chữ trong một block paragraph/heading/list/quote rồi bấm nút để đọc riêng phần đó; đọc xong dừng, không chuyển sang đoạn kế. Dùng lại giọng/tốc độ và tạm dừng/tiếp tục/dừng của `AudioPlayerCapsule`; tiến độ hiển thị “Phần đã chọn”. `ReadingSegment.sourceOffset` ánh xạ offset UTF-16 về block gốc để highlight/restart khi đổi giọng/tốc độ đúng chỗ. Generation của `SpeechController` bỏ sự kiện cũ sau khi chuyển bài đọc/vùng chọn hoặc dừng. Bấm phát ở player sau khi kết thúc vẫn đọc toàn bài. Chưa hỗ trợ bôi chọn xuyên nhiều block; chưa nghe thử âm thanh/QA browser thật. Frontend **42 passed**, lint/build (gồm typecheck) pass. Không cần DB/API mới.
- **Sửa DB local thiếu migration 2026-11-20:** người dùng báo không lưu được từ. Kiểm tra `hci_db` thấy kết nối PostgreSQL thành công nhưng chỉ có `users`/`alembic_version`, revision `a15298fe70fa`; thiếu bảng thư viện từ và cài đặt. Đã đọc ba migration còn lại, xác nhận một head rồi chạy `python -m alembic upgrade head` thành công tới `af317c86e219`; hiện có `display_settings` và `vocabulary_entries` gồm cột `removed`. Kiểm tra TestClient dùng DB local trong transaction rollback: POST lưu 201, POST trùng 200, GET 200 và nghĩa khớp; đã rollback dữ liệu tạm. `python -m pytest tests/test_vocabulary.py -q -p no:cacheprovider`: **29 passed** trên DB `_test`. Không có backend lắng nghe cổng 8000 tại lúc kiểm tra; cần chạy backend để dùng frontend. Chưa kiểm tra Groq thật hoặc thao tác lưu qua browser trong phiên này.
- **FR-06/FR-07 interaction 2026-11-20:** đã triển khai [kế hoạch tương tác](fr06-fr07-interaction-plan.md). Popup có Giải nghĩa/Lưu từ, đóng bằng pointer ngoài/Escape/X; hai hành động chia sẻ request giải nghĩa; Lưu từ tự lấy nghĩa rồi lưu, giữ nghĩa để thử lưu lại, và bổ sung nghĩa cho bản ghi trùng còn thiếu mà không ghi đè ghi chú. Gỡ thanh sticky/component `QuickSaveWord`; lưu từ qua popup cần đăng nhập, thư viện khách đã lưu tại `/vocabulary` vẫn hoạt động. Test frontend **38 passed**, lint, `npx tsc -b` và build pass. Chưa chạy Playwright, QA trực quan hoặc smoke test Groq thật.
- **Merge FR-07 ngày 2026-11-19:** đã fetch `origin/feature/fr07-vocabulary` tại `cb79854` và merge vào `feature/hong-quan` bằng commit `1a8d651` (local, chưa push). Merge được thử trong worktree tạm, giữ renderer/parser và toàn bộ tài liệu hiện có; thêm API/model/migration/trang thư viện từ cùng QuickSaveWord. Đã trả lại toàn bộ thay đổi FR-06/parser/benchmark chưa commit; giữ stash `pre-fr07-merge-2026-11-19` làm bản sao an toàn. Xung đột tại deps/router/App/ReadingText đã được giải quyết theo cả hai chức năng. Kiểm tra kết hợp: backend **126 passed**, frontend **35 passed**, lint/typecheck/build pass. Migration FR-07 có một head `af317c86e219`, nâng cấp/hạ cấp thành công trên database `_test` mới rồi đã dọn database đó. Chưa chạy E2E Playwright hoặc push.
- **Môi trường local 2026-11-19:** PostgreSQL 18 (`postgresql-x64-18`) đang chạy tại cổng 5432; kết nối `DATABASE_URL` hiện đã thành công (`SELECT 1`). `.env` có cấu hình Groq, nhưng chưa smoke test provider thật. Không ghi mật khẩu/API key vào handoff.
- **FR-06 đã được code ngày 2026-11-18:** trang đọc chọn từ/cụm trong block chữ, Tab theo block và mũi tên theo từ, popover giải nghĩa có trạng thái và đăng nhập; endpoint `POST /api/v1/assist/explain` dùng `CurrentUser`, kiểm tra offset UTF-16/selectedText, adapter Groq `openai/gpt-oss-120b` JSON Schema strict, cache 15 phút/500 mục và quota 20 lượt/user/giờ trong một process. Key chỉ ở backend qua `GROQ_API_KEY`; chưa smoke test provider thật. Không có migration. Sau merge FR-07, bộ test kết hợp ở dòng trên đã qua. Vite/Vitest cần chạy ngoài sandbox vì `spawn EPERM` trên Windows. Chưa QA browser thực tế.
- **Quyết định phạm vi FR-06:** người dùng tạm chấp nhận FR-02 và chuyển sang FR-06 trong `plan.md`. Đã có API key Groq, chọn model `openai/gpt-oss-120b`; key chưa được đưa vào repo. MVP dùng `ReadingBlock.id/text` cho selection/TTS, yêu cầu đăng nhập và quota local một worker. Xem `plan.md` mục 3.2 và 4.
- **Đã cải thiện parser runtime B0 ngày 2026-11-15:** ghép font/chỉ số cùng dòng, thứ tự đọc cột và vùng có heading ngang trang, heading xuống dòng, marker danh sách, caption trên/dưới/nhiều dòng, snapshot công thức độc lập, CropBox/trang xoay, OCR scan có footer và quản lý tài nguyên PDFium. `python -m pytest -q -p no:cacheprovider --tb=short`: **87 passed**, một warning TestClient có sẵn. TestClient API trả 200 trên easy/difficult, lần lượt 57/177 block, không warnings; không phải kiểm tra backend đang chạy tại 8000. Xem mục bàn giao sửa parser bên dưới và [module trình đọc](modules/document-reader.md).

- QA trực quan benchmark đã hoàn thành 2026-11-15 bằng Chrome local ở 390×844 và 1440×1000, cả B0/P0/M0 trên easy/difficult (12 lượt), dùng cùng `ReadingText`/`SnapshotFigure`. Không tràn ngang, không lỗi JS, ảnh tải được; B0 là bản đọc tốt nhất về mặt nhìn trong các trang kiểm tra. P0 dính chữ tiếng Việt; M0 tách heading, tạo ảnh số trang thừa và lộ LaTeX thô. Xem [kết quả sơ bộ](pdf-parser-evaluation-results.md); ảnh/metrics chỉ ở `output/pdf-evaluation/browser-qa/`. Zoom, Escape, nền tối và chữ 32px đã kiểm tra trên B0 mobile. Chưa kết luận chất lượng trên mọi PDF.

- Ưu tiên hiện tại là FR-06 tra từ theo ngữ cảnh; FR-02/parser PDF tạm chấp nhận theo người dùng. Tiếp tục giữ khả năng đọc trực tiếp, thay font/cỡ/giãn dòng/giãn chữ/cột và TTS đang có.
- **Đánh giá parser PDF trước đây:** đã bắt đầu triển khai [kế hoạch đánh giá](pdf-parser-evaluation-plan.md) trong `benchmarks/pdf/`: harness B0/P0/M0, adapter, fixture synthetic và chấm CER/order ban đầu. B0/P0/M0 đã smoke test trên fixture và hai PDF local; người dùng đã xác nhận các check source giới hạn ở ba trang, báo cáo local đã chấm. API hiện tại vẫn dùng B0. M1 chưa chạy; việc chọn Groq cho FR-06 không tự cấp quyền gửi hai PDF local tới provider.
- PDF phải giữ bảng/hình rõ ràng, paragraph tự reflow. “Trang đọc” là mặc định; “Bản gốc” là đối chiếu. Không đổi về viewer PDF tĩnh mặc định.
- **Parser hiện tại là pdfplumber + PDFium, không còn Docling.** Pipeline Docling cũ từng lỗi do môi trường và gom sai ô; phần lịch sử về Docling không phải hướng dẫn triển khai hiện hành.
- Đã có upload PDF/PNG/JPEG/WebP, văn bản dán, block ngữ nghĩa, mục lục, bảng/ảnh snapshot và xem file gốc. **Tính năng chỉnh bố cục thủ công đã bị gỡ bỏ ngày 2026-11-14** theo yêu cầu người dùng; blocks không còn chỉnh sửa/khôi phục trong phiên. File/block chỉ ở bộ nhớ phiên React; refresh mất tài liệu, chưa có persistence/backend library.
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
- Frontend: `lib/document.ts`, `DocumentProvider` giữ `blocks`, `originalFile` và derive `text` (không còn sửa block, `sourceBlocks`/`sourceText` của frontend đã bỏ; API vẫn trả `sourceText`). `ReadingText` render HTML ngữ nghĩa, không render HTML đầu vào. `SnapshotFigure` giữ ảnh 100% trong trang đọc; nút “Phóng to” mở cửa sổ lightbox ở giữa màn hình với nền mờ, zoom 100–300% và phần chữ mở rộng cho TTS/sao chép. Đóng lightbox bằng nút X, Escape hoặc click nền. Mục lục liên kết tới heading; `OriginalDocumentView` thu hồi object URL.
- Letter spacing mặc định mới là 0.02em ở cả API/frontend; các tùy chọn người dùng đã lưu vẫn giữ nguyên. Không đổi schema DB, không có migration mới.
- Vitest + React Testing Library và fixture PDF sinh trong test. Test parser mang marker `no_db`; test DB tạo/dọn DB riêng hậu tố `_test`, không dùng DB phát triển.
- Tài liệu: module trình đọc mới, cập nhật kiến trúc/AGENTS/module frontend và kế hoạch trình bày; log lịch sử giữ bên dưới để hiểu các quyết định trước.
- Benchmark offline mới: worker B0 dùng service hiện tại với URL DB inert; P0 dùng PyMuPDF 2.1 `Document.to_json()` không OCR; M0 dùng Marker 2.2.0 mode `fast` CPU, không bật LLM. Môi trường riêng và cache local ignored; native JSON, normalized blocks, provenance, metadata và status nằm trong `output/pdf-evaluation/`. Không đổi `requirements.txt` của app hay UI.

## Kiểm chứng và dữ liệu local

| Kiểm tra | Kết quả cuối phiên triển khai |
| --- | --- |
| `python -m pytest -q -p no:cacheprovider --tb=short` | 87 passed (2026-11-15); một deprecation warning FastAPI/Starlette TestClient, không phải fail |
| `python -m pytest tests/test_text_blocks.py tests/test_layout_pdf.py tests/test_text_extraction_service.py` | Parser/service chạy không cần kết nối PostgreSQL; fixture PDF tự tạo, OCR được mock |
| `npm run test` | 14 passed (2026-11-14, sau khi gỡ test chỉnh bố cục) |
| `npm run lint` | Pass (2026-11-14) |
| `npm run build` | Pass (2026-11-14), gồm TypeScript |
| QA browser | Edge headless, upload PDF thật ở 1440×1000 và 390×844; paragraph reflow, 3 snapshot, zoom hoạt động, không tràn ngang trang |
| API runtime người dùng | localhost:8000 trả 200, 55 block, 3 snapshot và không warnings |
| Test benchmark offline 2026-11-15 | `python -m pytest tests/test_pdf_benchmark.py tests/test_pdf_benchmark_adapters.py tests/test_pdf_benchmark_evaluate.py tests/test_text_blocks.py tests/test_layout_pdf.py -q -p no:cacheprovider`: 20 passed; không cần DB |
| Smoke B0/P0/M0 2026-11-15 | Fixture synthetic: cả ba chạy success; CER B0/P0 0/90, M0 16/90 vì heading native rỗng. Hai PDF local 5 và 17 trang đều chạy success với cả ba engine; check được xác nhận chỉ phủ 3 trang, kết quả trong `output/pdf-evaluation/local-comparison.md`. Không kết luận engine thắng. |
| Frontend sau route review dev | Chrome local 2026-11-15: 12 lượt B0/P0/M0 × easy/difficult × mobile/desktop; không tràn ngang/lỗi JS, zoom/Escape và nền tối/chữ lớn hoạt động trên B0 mobile. Xem báo cáo sơ bộ. |

- Mẫu `test.pdf` (5 trang) và ảnh QA `output/reader-review/` giữ local, đã gitignore; không được push cùng code. Checkout mới dùng fixture trong test, không cần mẫu cá nhân này. Tab IDE `VĐ_hiện_đại (2).pdf` không tìm thấy trong workspace ở lần QA, nên chưa kiểm chứng file đó.
- Mẫu đo parser khoảng 0.6–0.8s trên máy hiện tại; chưa benchmark tài liệu dài hoặc tải đồng thời. Đã xem PNG thật của bảng khó từng bị gom sai ô và sửa caption cắt nửa chữ.
- Các server kiểm thử riêng ở 8010/5175 và script/thư mục tạm đã được dọn; không dừng backend của người dùng tại 8000. Browser tool/CUA từng không dùng được, QA thành công sau bằng Edge headless riêng.

## Việc còn lại theo ưu tiên

0. Tiếp tục kế hoạch đánh giá parser PDF: thêm bộ mẫu tiếng Việt có quyền chia sẻ và ground truth người kiểm tra; hoàn thiện metric bảng/hình/công thức, cold/warm resource và QA cùng renderer; thử M1 khi đủ provider/model/budget/quyền gửi dữ liệu; lập báo cáo quyết định. Mốc A–C và một phần D đã có code/smoke test, chưa có đánh giá chất lượng chính thức. API tiếp tục dùng pdfplumber + PDFium/Tesseract; chưa tự động chọn parser mới.
1. Thêm fixture và QA các tài liệu chưa phủ: bảng không đường kẻ, biểu đồ vector, công thức font thường/nhiều cột phức tạp, heading dài và OCR thật. Công thức độc lập có font toán, heading xuống dòng, scan/mixed với OCR mock và CropBox xoay đã có regression test. Check heading ở difficult trang 4 vẫn chưa đạt; chưa tự xóa nội dung duy nhất phía trên.
2. Kiểm tra tài liệu dài, tổng dung lượng snapshot và tải thực tế. PDFium đã có khóa chung, đóng handle tường minh và test 8 parse/4 thread; chưa coi đây là benchmark tải server. Cân nhắc worker process nếu phép đo cho thấy cần.
3. Snapshot giữ hình thức nhưng font trong ảnh không reflow: dùng zoom/text thay thế. Text thay thế chưa là bảng ngữ nghĩa đầy đủ cho screen reader, có thể sai thứ tự. Chưa tự sửa lỗi từ/ngữ nghĩa bằng LLM.
4. DOCX/EPUB/Markdown/LaTeX đầy đủ chưa hỗ trợ; Mammoth cho DOCX mới là đề xuất trong kế hoạch. Chưa triển khai Edge TTS hoặc provider TTS mới.
5. Auth/TTS mới tạm hoãn theo người dùng. Cần xử lý route CRUD users thiếu auth/phân quyền đã ghi nhận trước khi public. Web Speech cần QA giọng và word boundary trên nhiều browser.

## Bàn giao Git phiên này

- Người dùng đã yêu cầu commit/push code và toàn bộ handoff lên nhánh của họ. Tên remote branch xác minh là `feature/hong-quan`; không có branch `hong-quan` riêng.
- Base khi bắt đầu bàn giao: `a4084f2` (merge PR #4 từ nhánh này vào main); remote branch trước push ở `cd74961`. Đã fetch trước khi đóng gói, push bình thường, không force-push.
- Commit chứa các thay đổi code/test và tài liệu hiện hành; không chứa `.env`, `.venv`, mẫu PDF hay ảnh QA local. Xem hash chính xác bằng `git log -1 --oneline` sau checkout/pull.
- Phiên mới tiếp tục từ ưu tiên trình đọc, không khởi động lại hướng Docling chỉ vì thấy lịch sử cũ.

## Bàn giao sửa parser PDF — 2026-11-15

- Đã đọc handoff, architecture, conventions, module document-reader và báo cáo benchmark, đối chiếu code và hai PDF local. Giữ engine pdfplumber/PDFium, contract API và frontend hiện có; không thêm dependency, DB/migration, provider hay LLM.
- `layout_pdf.py`: ghép dòng bằng overlap thay vì chỉ so baseline, gắn chỉ số vào dòng gần nhất, loại glyph in chồng; giữ các cột qua khoảng trống lớn/heading/footer ngang trang; snapshot ngắt chuỗi nối paragraph; nối heading nhiều dòng, tách đoạn sau danh sách và không nhận số thập phân/số âm thành marker. Caption ở trên/dưới và xuống dòng được crop cùng bảng/ảnh. Heuristic công thức độc lập giữ ảnh gốc qua `snapshotKind=image`; toán inline vẫn reflow dưới dạng text tuyến tính.
- CropBox được chuyển đúng sang hệ tọa độ glyph/PDFium, gồm trang xoay đủ bốn góc và MediaBox lệch gốc. Parser giữ metadata nhẹ sau lượt phân tích, đóng cache pdfplumber từng trang. `pdf_rendering.py` dùng khóa RLock chung giữa layout/OCR, đóng native handle và copy ảnh ra khỏi bộ nhớ bitmap; giới hạn 8 triệu pixel/snapshot và 50 triệu pixel/OCR trước khi render.
- `text_extraction_service.py`: không OCR trang trắng/thuần chữ ngắn; phát hiện scan có ít chữ/footer bằng diện tích hợp ảnh (cả ảnh chia tile), nhận lớp chữ hỏng rõ ràng; giữ ảnh trang vượt giới hạn hoặc OCR rỗng kèm cảnh báo. Timeout OCR 60 giây, thiếu Tesseract giữ lỗi 503, ảnh upload được kiểm tra pixel và đóng đúng. Import service không còn khởi tạo cấu hình DB chỉ vì type annotation. Tesseract chưa có trên máy: chỉ kiểm chứng OCR bằng mock/raster fixture, chưa khẳng định độ chính xác OCR tiếng Việt.
- Tests bổ sung cho các lỗi trên, ảnh crop xoay/lệch gốc, PDF mixed/giới hạn OCR, mật khẩu/số trang, nhiều thread và timeout. Lượt full suite đầu tiên bị lỗi thứ tự import cấu hình do test mới; đã sửa import/fixture và full suite cuối **87 passed, 1 warning**. Không kết nối/xóa DB phát triển; test tích hợp dùng DB `_test` theo conftest. Frontend không sửa trong phiên này nên không chạy lại lint/build/test frontend.
- TestClient `POST /api/v1/documents/extract-text`: easy 5 trang → 57 block/3 snapshot, difficult 17 trang → 177 block/26 snapshot, cả hai HTTP 200 và không warnings. Đã xem ảnh bảng và hai công thức ở difficult trang 6, không cắt tổng/phân số/chỉ số. Paragraph tối đa hai từ của difficult giảm từ 106 xuống 4; đây là chỉ báo giảm phân mảnh, không phải metric CER/chất lượng toàn văn.
- Benchmark B0 cuối: local `output/pdf-evaluation/20261114T184836Z-baseline-2816b1a7`, synthetic `output/pdf-evaluation/20261114T184836Z-baseline-0b2feec9`; fingerprint đã bổ sung `pdf_rendering.py`. Cùng check nguồn cũ: easy **9/9**, difficult **7/8** (công thức đã đạt; heading ở trang 4 vẫn chưa đạt). Synthetic CER vẫn 0/90. Output/API JSON và ảnh crop ở `output/pdf-evaluation/parser-fixes/`, chỉ local/ignored, không gửi provider. Chưa QA browser lại sau bản sửa.
- Giới hạn: công thức font thường/inline chưa có MathML hay TTS toán; scan OCR vẫn chưa có layout bảng/công thức; bảng không đường kẻ/vector phức tạp và tổng dung lượng snapshot cần tiếp tục đánh giá. Không tự thay ground truth hay xóa nội dung độc nhất để nâng điểm. Khi thử bản sửa cần mở lại PDF trong giao diện.
- Giữ nguyên mọi thay đổi có sẵn ở frontend/benchmark/docs ngoài cập nhật liên quan; **không commit/push** trong phiên sửa parser này. Không dừng/restart backend người dùng ở 8000.

## Phiên đọc tài liệu và góp ý kế hoạch — 2026-11-14

- Người dùng yêu cầu đọc `docs/` và `plan.md` để góp ý bước tiếp theo; phiên này chỉ đối chiếu tĩnh với code local, không triển khai tính năng.
- `plan.md` dựa trên `a4084f2`, còn HEAD local là `c1721b1` và có thay đổi chưa commit. Cần sửa mục 3.2 để dùng `doc.blocks`/`block.id`, không tách lại `doc.text` thành `paragraph-N`; mục 10 cần cập nhật Vitest đã có và marker `no_db` đã hỗ trợ test không cần PostgreSQL.
- `docs/text-presentation-plan.md` còn hướng dẫn chỉnh bố cục thủ công đã bị gỡ; một số mô tả trong architecture/module document-reader cũng còn state/thao tác sửa block cũ. Đây là các chỗ cần đồng bộ tài liệu, không phải yêu cầu khôi phục tính năng.
- Góp ý (chưa phải quyết định mới của người dùng): QA có giới hạn trên bộ PDF đại diện, rồi làm FR-06 theo luồng chọn chữ → giải nghĩa; dùng ID block hiện có, offset UTF-16 và provider giả để test. Có thể làm FR-08 trước FR-07 để tận dụng service LLM khi auth mới vẫn tạm hoãn; giữ FR-09 ở backlog.
- Đã xác nhận CRUD `/users` vẫn thiếu auth/phân quyền tại endpoint và router; cần xử lý trước public hoặc phát hành tính năng cá nhân. Chưa chọn provider AI, chưa chạy lại test/lint/build vì không sửa mã ứng dụng. Giữ nguyên các thay đổi có sẵn; không commit/push.

## Phiên lập kế hoạch đánh giá parser PDF — 2026-11-14

- Đã tạo `docs/pdf-parser-evaluation-plan.md`, thêm liên kết ở docs index/module trình đọc/kế hoạch trình bày; đánh dấu hướng chỉnh bố cục cũ là lịch sử.
- Plan chốt B0 hiện tại, P0 PyMuPDF, M0 Marker không thêm LLM và M1 cùng cấu hình có thêm LLM; có corpus/ground truth, mapping về ReadingBlock, metric, budget, QA, file dự kiến và tiêu chí chọn/giữ pipeline.
- Đã đọc lại upstream: chức năng PyMuPDF4LLM đã chuyển vào PyMuPDF 2.x; Marker có nhiều mode và model/inference backend. Phiên code phải pin release/schema/mode sau smoke test, tách môi trường thử nghiệm khỏi backend.
- Cuối phiên thấy `sample_pdf/easy.pdf` và `sample_pdf/difficult.pdf` untracked; đã thêm vào plan làm ứng viên smoke test local, mới kiểm tra tên/kích thước, chưa đọc nội dung hay chạy parser. Không commit/gửi provider tự động.
- Kiểm tra tài liệu: các liên kết local tồn tại, code fence cân bằng và `git diff --check` trên các tài liệu được cập nhật pass.
- Chưa sửa mã ứng dụng hoặc dependency, chưa chạy benchmark/test/lint/build, chưa chọn provider LLM; phiên này chỉ chỉnh tài liệu. Không commit/push và giữ nguyên các thay đổi working tree trước đó.

## Phiên bắt đầu code benchmark PDF — 2026-11-15

- Người dùng cho phép `sample_pdf/easy.pdf` và `sample_pdf/difficult.pdf` **chỉ dùng local**. Hai file cùng manifest local, model cache, venv và toàn bộ output benchmark đều gitignore; không gửi provider, không commit. Working tree ban đầu đã có nhiều sửa đổi frontend/docs; không reset hoặc đụng phần đó ngoài cập nhật tài liệu.
- Thêm `benchmarks/pdf/` với fixture PDF ASCII synthetic và ground truth biết từ generator (chỉ smoke, chưa chứng minh tiếng Việt), manifest có SHA-256, harness chạy worker theo argument list với timeout/process-tree cleanup, B0 dùng `TextExtractionService` offline, P0 PyMuPDF 2.1 `Document.to_json()`, M0 Marker 2.2.0 `fast` CPU. Adapter dùng cùng snapshot PDFium và hợp đồng `ReadingBlockRead`; output có native/normalized/provenance/status, package freeze và fingerprint baseline. CLI `evaluate.py` chấm CER và coverage/order cho case có ground truth.
- PyMuPDF và Marker cài bằng `uv` vào venv riêng. Marker cần `XDG_CACHE_HOME`/`HF_HOME` local và `PYTHONUTF8=1` trên Windows; setup tải model/font riêng. Lượt chạy chính dùng cache local, không bật LLM. M0 native JSON đã trả heading rỗng ở fixture synthetic; adapter ghi block bị bỏ và CER 16/90, trong khi B0/P0 0/90. Đây không phải kết luận chất lượng trên tiếng Việt.
- Smoke B0/P0/M0 thành công trên hai PDF local 5/17 trang; người dùng đã xác nhận check ở 3 trang nhưng chưa có ground truth toàn trang/corpus đại diện. Test `no_db` liên quan: 20 passed. Đã thêm route dev `/dev/pdf-review` để dùng cùng renderer; lint/build/14 frontend tests pass nhưng chưa QA bằng mắt ở hai viewport vì browser host không truy cập được và cửa sổ đang có thao tác người dùng. Chưa đo cold/3 warm, chưa chốt corpus hoặc M1. Không đổi app runtime, DB hay migration; không commit/push.
- Sau khi người dùng nhắc dùng `sample_pdf/`, đã xem trực tiếp ảnh trang gốc: `easy.pdf` trang 2 có hai bảng; `difficult.pdf` trang 4 chỉ có đầu/chân trang; trang 6 có một bảng và hai công thức. Tạo check local có SHA PDF tại `benchmarks/pdf/local/ground_truth/`; người dùng đã xác nhận các check này. Đã sửa adapter P0 ghép khoảng trắng giữa các span dựa bbox; các cụm còn dính chữ nằm ngay trong native JSON. Báo cáo local tại `output/pdf-evaluation/local-comparison.md`: easy B0 9/9, P0 7/9, M0 9/9; difficult B0 6/8, P0 7/8, M0 5/8. Đây chỉ là phạm vi 3 trang/check, chưa phải kết luận chọn parser.

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

Ngày cập nhật cuối: 2026-11-14

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

## Cập nhật phiên 2026-11-14

- Người dùng yêu cầu gỡ toàn bộ tính năng chỉnh bố cục thủ công và đổi nút “Phóng to” của ảnh snapshot thành cửa sổ riêng ở giữa màn hình với nền mờ.
- Đã xóa: `LayoutEditor.tsx`; nút “Chỉnh bố cục” trên header trang đọc; state/portal/editor trong `MinimalReadingView`; `updateBlocks`/`restoreSource` khỏi `DocumentProvider` và `document-context`; các hàm `updateBlock`/`splitBlock`/`mergeBlockWithNext`/`moveBlock`/`cloneBlocks` khỏi `lib/document.ts`; trường `sourceText`/`sourceBlocks` của `ReadingDocument` (API backend vẫn trả `sourceText`, không đổi contract); test block-editing; tham chiếu `LayoutEditor` trong architecture/module docs.
- `SnapshotFigure`: ảnh hiển thị 100% trong trang đọc; nút “Phóng to” mở lightbox (`role="dialog"`, portal ra body) ở giữa màn hình, nền đen mờ (`bg-black/70`) khóa cuộn trang nền; trong lightbox có zoom 100–300%, nút đóng, Escape hoặc click nền để đóng; tự focus nút đóng khi mở.
- Kiểm tra: `npm run test` 14 passed; `npm run lint` pass; `npx tsc -b` pass; `npm run build` pass. Chưa QA trực quan trên trình duyệt trong phiên này.
- Backend, DB, TTS không đổi. Chưa commit.
