# Module nhập tài liệu và trình đọc

## Trạng thái hiện tại

Ngày 2026-11-13: ưu tiên trình bày nội dung, auth/TTS mới để sau. PDF/ảnh và văn bản dán đã nối vào trang đọc thật. Chỉ giữ dữ liệu trong phiên React, không lưu file/block vào DB. Không có migration cho tính năng này. Docling đã được thay bằng parser tọa độ nhẹ, không cần tải mô hình.

## Luồng và file chính

| Thành phần | File | Trách nhiệm |
| --- | --- | --- |
| Endpoint | `app/api/v1/endpoints/text_extraction.py` | Kiểm tra dung lượng upload, gọi service, chuyển schema camelCase |
| Extraction | `app/services/text_extraction_service.py` | Loại file, mật khẩu/số trang PDF, OCR theo trang, ghép kết quả và warnings |
| Parser tọa độ | `app/services/layout_pdf.py` | Bbox bảng/ảnh, snapshot, font/heading, ghép đoạn, reading order, header/footer |
| Render PDF | `app/services/pdf_rendering.py` | Khóa PDFium dùng chung, giới hạn pixel trước khi render, đóng page/bitmap và trả ảnh có bộ nhớ riêng |
| Parser text | `app/services/text_blocks.py` | Chuẩn hóa và tách text/Markdown cơ bản thành block; không phải parser Markdown đầy đủ |
| Hợp đồng API | `app/schemas/text_extraction.py` | `ExtractedTextRead`, `ReadingBlockRead` |
| Document model | `frontend/src/lib/document.ts` | Validate đầu vào, tạo/sanitize block và dẫn xuất text; không có thao tác chỉnh bố cục |
| State | `frontend/src/context/DocumentProvider.tsx` | File/originalFile, blocks và derive text |
| Renderer | `frontend/src/components/common/ReadingText.tsx` | Paragraph/heading/list/quote/table/snapshot và highlight TTS |
| Snapshot | `frontend/src/components/common/SnapshotFigure.tsx` | Ảnh gốc, cửa sổ phóng to giữa màn hình với nền mờ và text thay thế mở rộng |
| Screen | `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx` | Trang đọc mặc định, mục lục, setting, TTS adapter và đổi bản gốc |
| Original viewer | `OriginalDocumentView.tsx` cùng thư mục screen | Đối chiếu file gốc qua object URL |

## Hợp đồng dữ liệu

Response `POST /api/v1/documents/extract-text`: `text`, `source`, `pageCount`, `charCount`, `ocrUsed`, `sourceText`, `blocks`, `warnings`, `skippedOcrPages`. `source` là `pdf` hoặc `image`. Endpoint hiện nhận PDF, PNG, JPEG và WebP; frontend còn có nguồn `paste`.

`ReadingBlock` có `id` duy nhất, `type`, `text`, `pageNumber?`, `headingLevel?` (2/3), `listKind?` (ordered/unordered). Loại block hiện có: `paragraph`, `heading`, `listItem`, `quote`, `table`, `snapshot`. `table.rows`/`caption` vẫn được renderer hỗ trợ, nhưng parser PDF hiện xuất bảng thành `snapshot` để giữ đúng hình thức.

Snapshot có `imageSrc` PNG base64 nội tuyến, `imageWidth`, `imageHeight`, `snapshotKind` (table/image), `sourceBbox` theo `[x0, top, x1, bottom]` tính bằng PDF point và `pageNumber` bắt đầu từ 1. `text` giữ chữ trích xuất trong vùng cho TTS/sao chép, không render lặp vào nội dung chính. Ảnh không có text vẫn phải hiện. Frontend chỉ nhận PNG data URL cho snapshot, không nhúng HTML từ file.

`ReadingDocument.text` luôn tính từ block đang hiển thị. Giữ `originalFile` để đối chiếu file gốc. Snapshot/table không chỉnh sửa nội dung trong trang đọc; text của snapshot dùng cho TTS/sao chép.

## Quy tắc parser PDF

1. pypdf kiểm tra mật khẩu và số trang. Giới hạn mặc định: `MAX_UPLOAD_MB=10`, `MAX_PDF_PAGES=100`, `MAX_OCR_PAGES=10`. Chọn OCR bằng lớp chữ kết hợp diện tích ảnh: trang dưới 80 ký tự không trắng với ảnh phủ ít nhất 35% trang (tính hợp các tile, không đếm trùng); hoặc lớp chữ có trên 20% ký tự thay thế `U+FFFD`. Trang trắng/tiêu đề ngắn thuần chữ không gọi Tesseract. Đây vẫn là heuristic, chưa phân biệt được mọi ảnh minh họa với scan.
2. pdfplumber nhận diện bảng có viền; bổ sung nhóm đường ngang cùng mép trái/phải cho booktabs. Tách các bảng cùng chiều rộng nếu có caption/khoảng trắng phân cách. Ảnh raster lấy từ bbox; vùng chồng được gộp đến khi không còn giao nhau. Caption ở trên/dưới bảng/ảnh và tối đa ba dòng liên tiếp sát nhau được đưa vào crop.
3. PDFium render vùng ở 200dpi, padding 5pt, tối đa 8 triệu pixel/vùng; tôn trọng CropBox và tọa độ trang xoay/lệch gốc. `pdf_rendering.py` khóa toàn bộ vòng đời handle PDFium giữa các request, trả PIL copy rồi đóng bitmap/page/document. OCR được gọi sau khi thả khóa. Lý do dùng khóa: [PDFium không hỗ trợ gọi đa luồng đồng thời](https://pypdfium2.readthedocs.io/en/v4/python_api.html#thread-incompatibility). Không gửi tài liệu ra API ngoài.
4. Lọc chữ bên trong snapshot khỏi paragraph. Ghép từ bằng độ chồng theo chiều dọc để chữ bold/mono và chỉ số không rơi thành đoạn lẻ; bỏ glyph in chồng khi phát hiện trùng. Mode cỡ chữ có trọng số theo lượng chữ làm chuẩn; heading xuống dòng liên tiếp cùng cỡ được nối. Marker danh sách phải có khoảng trắng, tránh nhận `3.14`/`-5` thành danh sách. Ghép dòng theo khoảng cách/thụt lề; xử lý gạch nối cuối dòng. Không dùng LLM sửa nội dung.
5. Dùng khoảng trắng chia vùng đọc để giữ cột trước khi ghép block; ưu tiên tách cột, rồi tách vùng có heading/footer ngang trang. Snapshot ngắt chuỗi ghép paragraph để không nối chữ xuyên qua hình. Bỏ số trang/header/footer lặp trong dải mép 6%, giữ tiêu đề không lặp.
6. Công thức độc lập có font toán, ký hiệu toán và tỷ lệ glyph toán đủ lớn được giữ thành `snapshotKind=image`, dùng cùng renderer/zoom hiện có. Đoạn văn có toán inline tiếp tục reflow; chỉ số trong text tuyến tính chưa có markup toán ngữ nghĩa. Không bảo đảm nhận được công thức dùng font thường hoặc bố cục toán nhiều cột.
7. Trang scan dùng OCR Tesseract và nối dòng trong paragraph; các trang có chữ của tài liệu pha trộn vẫn chạy parser tọa độ. Render OCR bị chặn ở 50 triệu pixel trước khi cấp bitmap; timeout Tesseract 60 giây/trang. Thiếu Tesseract/ngôn ngữ giữ lỗi 503, không biến thành lỗi render. Trang vượt giới hạn OCR hoặc OCR ra rỗng vẫn giữ ảnh gốc, kèm warnings; ảnh upload cũng kiểm tra pixel trước khi decode. Nếu parser lỗi, trả lỗi; không âm thầm xuất bản text cũ bị vỡ dòng.

## Thiết lập ở phiên mới

Chạy từ root, có `.env` theo `.env.example` và PostgreSQL cho app/integration test:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

OCR cần Tesseract cài riêng cùng ngôn ngữ `vie+eng`; chỉnh `TESSERACT_CMD` nếu chưa có trong PATH. PDF chữ không cần Tesseract. Quan trọng: cài requirements vào đúng Python đang chạy Uvicorn, tránh cài `.venv` nhưng khởi động backend bằng interpreter khác.

Chạy frontend từ `frontend/`:

```powershell
npm ci
npm run dev
```

API mặc định `http://localhost:8000`, đổi bằng `VITE_API_URL`; CORS backend phải chứa origin của Vite. Sau khi đổi parser, mở lại/tải lại tài liệu vì tài liệu đang đọc là kết quả cũ nằm trong bộ nhớ.

## Kiểm tra đã có

```powershell
python -m pytest
python -m pytest tests/test_text_blocks.py tests/test_layout_pdf.py tests/test_text_extraction_service.py
```

Lệnh thứ hai chạy không cần DB (`no_db`); fixture PDF được tạo trong test bằng pypdf, không phụ thuộc file mẫu cá nhân. Integration test chỉ chạy trên DB hậu tố `_test`, tự tạo/dọn schema. Frontend: `npm run lint`, `npm run test`, `npm run build` (gồm TypeScript).

Kết quả phiên 2026-11-13: 50 test backend, 17 test frontend, lint/build pass. Phiên 2026-11-14: bỏ tính năng chỉnh bố cục, thêm cửa sổ lightbox cho snapshot; frontend 14 test, lint/build pass. Edge headless upload file thật ở 1440×1000 và 390×844: paragraph reflow, 3 snapshot, zoom hoạt động và không tràn ngang trang. API cổng 8000 trả 200, 55 block, 3 snapshot, không warnings trên file mẫu 5 trang; đo trích xuất khoảng 0.6–0.8s, không coi là cam kết cho PDF khác. `test.pdf` và `output/reader-review/` là mẫu/ảnh QA local được gitignore, không có trong checkout mới.

## Giới hạn và bước tiếp theo

- Ưu tiên mới được chốt 2026-11-14: giữ pipeline hiện tại làm mốc và thử PyMuPDF4LLM + Marker theo [kế hoạch đánh giá parser PDF](../pdf-parser-evaluation-plan.md). Đây là thử nghiệm offline trước khi tích hợp, chưa thay parser runtime; FR-06 triển khai sau đợt đánh giá ưu tiên này.
- Ưu tiên thêm fixture bảng không đường kẻ, biểu đồ vector, công thức, heading dài, PDF nhiều cột và scan nhiều trang. Chưa có bằng chứng parser tái tạo mọi PDF hoàn hảo.
- Snapshot giữ layout bảng nhưng không đổi font/giãn chữ trong ảnh; dùng nút “Phóng to” để mở cửa sổ riêng (lightbox) giữa màn hình với nền mờ, hoặc mở text thay thế. Chữ thay thế có thể sai thứ tự, chưa phải bảng ngữ nghĩa cho screen reader.
- PDFium runtime đã được bảo vệ bằng khóa chung và có regression test nhiều thread. Vẫn cần đo tải thực tế, PDF dài và giới hạn tổng dung lượng snapshot (hiện mới chặn từng vùng); cân nhắc worker process nếu cần tăng throughput.
- Check local sau sửa 2026-11-15: easy trang 2 giữ 9/9; difficult trang 6 đã có bảng và hai ảnh công thức, tổng check difficult 7/8. Check còn thiếu ở trang 4: dòng duy nhất phía trên đang thành heading; không tự xóa nội dung duy nhất chỉ để đạt metric. OCR thật chưa QA vì máy hiện tại không có Tesseract; test dùng PDF raster tự tạo và mock OCR.
- Scan đã OCR vẫn là text không có tọa độ layout tin cậy, chưa tự nhận bảng/công thức trong scan. Text thay thế của ảnh công thức chưa có MathML hoặc cách đọc toán ngữ nghĩa.
- Chưa hỗ trợ upload DOCX/EPUB/Markdown/LaTeX thực thụ. Mammoth cho DOCX là bước mở rộng đã đề xuất, chưa triển khai.
- Auth/TTS mới tạm hoãn; Web Speech đang hoạt động nhưng chưa QA đầy đủ giọng/boundary trên nhiều browser. Route CRUD users thiếu kiểm soát quyền đã được ghi nhận trong handoff, cần xử lý ở phiên riêng trước khi public.
