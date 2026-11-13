# Module nhập tài liệu và trình đọc

## Trạng thái hiện tại

Ngày 2026-11-13: ưu tiên trình bày nội dung, auth/TTS mới để sau. PDF/ảnh và văn bản dán đã nối vào trang đọc thật. Chỉ giữ dữ liệu trong phiên React, không lưu file/block vào DB. Không có migration cho tính năng này. Docling đã được thay bằng parser tọa độ nhẹ, không cần tải mô hình.

## Luồng và file chính

| Thành phần | File | Trách nhiệm |
| --- | --- | --- |
| Endpoint | `app/api/v1/endpoints/text_extraction.py` | Kiểm tra dung lượng upload, gọi service, chuyển schema camelCase |
| Extraction | `app/services/text_extraction_service.py` | Loại file, mật khẩu/số trang PDF, OCR theo trang, ghép kết quả và warnings |
| Parser tọa độ | `app/services/layout_pdf.py` | Bbox bảng/ảnh, snapshot, font/heading, ghép đoạn, reading order, header/footer |
| Parser text | `app/services/text_blocks.py` | Chuẩn hóa và tách text/Markdown cơ bản thành block; không phải parser Markdown đầy đủ |
| Hợp đồng API | `app/schemas/text_extraction.py` | `ExtractedTextRead`, `ReadingBlockRead` |
| Document model | `frontend/src/lib/document.ts` | Validate đầu vào, tạo/sanitize/clone block, sửa/tách/gộp/di chuyển |
| State | `frontend/src/context/DocumentProvider.tsx` | File/sourceBlocks bất biến, blocks đang sửa, khôi phục và derive text |
| Renderer | `frontend/src/components/common/ReadingText.tsx` | Paragraph/heading/list/quote/table/snapshot và highlight TTS |
| Snapshot | `frontend/src/components/common/SnapshotFigure.tsx` | Ảnh gốc, zoom 100–300%, vùng cuộn và text thay thế mở rộng |
| Screen | `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx` | Trang đọc mặc định, mục lục, setting, TTS adapter và đổi bản gốc |
| Editor/viewer | `LayoutEditor.tsx`, `OriginalDocumentView.tsx` cùng thư mục screen | Sửa khối và đối chiếu file gốc qua object URL |

## Hợp đồng dữ liệu

Response `POST /api/v1/documents/extract-text`: `text`, `source`, `pageCount`, `charCount`, `ocrUsed`, `sourceText`, `blocks`, `warnings`, `skippedOcrPages`. `source` là `pdf` hoặc `image`. Endpoint hiện nhận PDF, PNG, JPEG và WebP; frontend còn có nguồn `paste`.

`ReadingBlock` có `id` duy nhất, `type`, `text`, `pageNumber?`, `headingLevel?` (2/3), `listKind?` (ordered/unordered). Loại block hiện có: `paragraph`, `heading`, `listItem`, `quote`, `table`, `snapshot`. `table.rows`/`caption` vẫn được renderer hỗ trợ, nhưng parser PDF hiện xuất bảng thành `snapshot` để giữ đúng hình thức.

Snapshot có `imageSrc` PNG base64 nội tuyến, `imageWidth`, `imageHeight`, `snapshotKind` (table/image), `sourceBbox` theo `[x0, top, x1, bottom]` tính bằng PDF point và `pageNumber` bắt đầu từ 1. `text` giữ chữ trích xuất trong vùng cho TTS/sao chép, không render lặp vào nội dung chính. Ảnh không có text vẫn phải hiện. Frontend chỉ nhận PNG data URL cho snapshot, không nhúng HTML từ file.

`ReadingDocument.text` luôn tính từ block đang hiển thị. Giữ `sourceText`, `sourceBlocks` và `originalFile` để khôi phục/đối chiếu. Khi sửa bố cục phải dừng speech để tránh highlight sai offset. Snapshot/table không tách/gộp trực tiếp trong editor; có thể chuyển thành paragraph nếu muốn sửa phần chữ.

## Quy tắc parser PDF

1. pypdf kiểm tra mật khẩu, số trang và trang cần OCR. Giới hạn mặc định: `MAX_UPLOAD_MB=10`, `MAX_PDF_PAGES=100`, `MAX_OCR_PAGES=10`.
2. pdfplumber nhận diện bảng có viền; bổ sung nhóm đường ngang cùng mép trái/phải cho booktabs. Tách các bảng cùng chiều rộng nếu có caption/khoảng trắng phân cách. Ảnh raster lấy từ bbox; vùng chồng được gộp. Caption sát bảng được đưa trọn vào crop.
3. PDFium render vùng ở 200dpi, padding 5pt, tối đa 8 triệu pixel/vùng; clamp theo biên trang. Không gửi tài liệu ra API ngoài.
4. Lọc chữ bên trong snapshot khỏi paragraph. Mode cỡ chữ có trọng số theo lượng chữ làm chuẩn; cỡ lớn/bold độc lập tạo heading. Ghép dòng theo khoảng cách và thụt lề; xử lý gạch nối cuối dòng. Không dùng LLM sửa nội dung.
5. Dùng khoảng trắng chia vùng đọc để giữ cột trước khi ghép block; không chỉ sort y/x khiến hai cột bị trộn. Bỏ số trang/header/footer lặp trong dải mép 6%, giữ tiêu đề không lặp.
6. Trang scan dùng OCR Tesseract và nối dòng trong paragraph; các trang có chữ của tài liệu pha trộn vẫn chạy parser tọa độ. Báo trang OCR bị bỏ qua do giới hạn. Nếu parser lỗi, trả lỗi; không âm thầm xuất bản text cũ bị vỡ dòng.

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
python -m pytest tests/test_text_blocks.py tests/test_layout_pdf.py
```

Lệnh thứ hai chạy không cần DB (`no_db`); fixture PDF được tạo trong test bằng pypdf, không phụ thuộc file mẫu cá nhân. Integration test chỉ chạy trên DB hậu tố `_test`, tự tạo/dọn schema. Frontend: `npm run lint`, `npm run test`, `npm run build` (gồm TypeScript).

Kết quả phiên 2026-11-13: 50 test backend, 17 test frontend, lint/build pass. Edge headless upload file thật ở 1440×1000 và 390×844: paragraph reflow, 3 snapshot, zoom hoạt động và không tràn ngang trang. API cổng 8000 trả 200, 55 block, 3 snapshot, không warnings trên file mẫu 5 trang; đo trích xuất khoảng 0.6–0.8s, không coi là cam kết cho PDF khác. `test.pdf` và `output/reader-review/` là mẫu/ảnh QA local được gitignore, không có trong checkout mới.

## Giới hạn và bước tiếp theo

- Ưu tiên thêm fixture bảng không đường kẻ, biểu đồ vector, công thức, heading dài, PDF nhiều cột và scan nhiều trang. Chưa có bằng chứng parser tái tạo mọi PDF hoàn hảo.
- Snapshot giữ layout bảng nhưng không đổi font/giãn chữ trong ảnh; dùng zoom hoặc mở text thay thế. Chữ thay thế có thể sai thứ tự, chưa phải bảng ngữ nghĩa cho screen reader.
- Kiểm tra PDF lớn, giới hạn tổng dung lượng ảnh và tài nguyên; nếu cần nhiều upload đồng thời, kiểm tra việc sử dụng PDFium giữa các thread trước khi triển khai server nhiều người dùng.
- Chưa hỗ trợ upload DOCX/EPUB/Markdown/LaTeX thực thụ. Mammoth cho DOCX là bước mở rộng đã đề xuất, chưa triển khai.
- Auth/TTS mới tạm hoãn; Web Speech đang hoạt động nhưng chưa QA đầy đủ giọng/boundary trên nhiều browser. Route CRUD users thiếu kiểm soát quyền đã được ghi nhận trong handoff, cần xử lý ở phiên riêng trước khi public.
