# LexiEase · Trợ lý đọc tiếng Việt

LexiEase là ứng dụng web của đồ án **Tương tác người – máy (HCI)**, thiết kế cho người gặp khó khăn khi đọc tiếng Việt, trong đó có người đọc mắc chứng khó đọc (dyslexia). Người dùng có thể dán văn bản hoặc mở tài liệu, chỉnh cách hiển thị, nghe đọc và lưu từ khó ngay tại dòng đang đọc.

Repo gồm **frontend React + TypeScript** trong `frontend/` và **backend FastAPI + PostgreSQL** ở thư mục gốc.

> **Chọn đúng phiên bản khi chạy demo.** README này mô tả nhánh `feature/fr07-vocabulary` tại `ecc1085` kèm bản cập nhật `fr07-hci.patch`. Nếu chỉ lấy nhánh FR07, bạn sẽ thấy giao diện lưu từ cũ. Nhánh `main` tại `aa74e75` có API tóm tắt FR-08. Hai phiên bản có tập chức năng khác nhau.

## Chạy lại dự án đã cài

Mở hai terminal **PowerShell** tại thư mục gốc `HCI`. PostgreSQL cần đang chạy. Nếu đây là lần đầu cài trên máy, xem mục **Cài đặt lần đầu** bên dưới.

**Terminal 1 · Backend**

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

**Terminal 2 · Giao diện web**

```powershell
cd frontend
npm run dev
```

Mở [giao diện web](http://localhost:5173) hoặc địa chỉ Vite in ở terminal. Backend có [Swagger UI để thử API](http://127.0.0.1:8000/docs) và [đường dẫn kiểm tra trạng thái](http://127.0.0.1:8000/health). Khi backend đã khởi động, `/health` trả về `{"status":"ok"}`.

## Cài đặt lần đầu

Bộ công cụ đã dùng để kiểm thử bản FR07 gồm Python 3.12, PostgreSQL 16 và Node.js 24 với npm. Trên Windows, dùng Python 64-bit. Các lệnh bên dưới gọi trực tiếp Python trong môi trường ảo nên có thể chạy ngay cả khi PowerShell chặn `Activate.ps1`.

**1. Lấy mã nguồn FR07**

```powershell
git clone --branch feature/fr07-vocabulary https://github.com/felixsickofcode/HCI.git
cd HCI
```

Nếu đã có repo trên máy, dùng `git fetch origin` và `git switch feature/fr07-vocabulary`. Để nâng bản demo gốc lên bản có lưu nhanh và hoàn tác, giải nén `FR07-HCI.zip`, chép `fr07-hci.patch` vào thư mục gốc repo, rồi chạy một lần:

```powershell
git switch -c feature/fr07-hci-update
git apply --check fr07-hci.patch
```

Nếu bước kiểm tra thành công, chạy `git apply fr07-hci.patch`. Nếu mã nguồn đang dùng đã có `frontend/src/components/vocabulary/QuickSaveWord.tsx` và migration `af317c86e219`, tiếp tục bước 2.

**2. Tạo database và cài backend**

Trong pgAdmin hoặc `psql`, kết nối tới database `postgres` và chạy câu lệnh sau một lần nếu máy chưa có `hci_db`:

```sql
CREATE DATABASE hci_db;
```

Quay lại PowerShell, tại thư mục chứa `requirements.txt`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Mở `.env` ở cùng cấp với `alembic.ini`. Điền mật khẩu PostgreSQL và thay giá trị mẫu của `SECRET_KEY` bằng một khóa riêng. Có thể tạo khóa bằng `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

```dotenv
DATABASE_URL=postgresql+psycopg://postgres:MAT_KHAU@localhost:5432/hci_db
SECRET_KEY=THAY_BANG_KHOA_RIENG
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**3. Cài frontend**

```powershell
cd frontend
npm ci
cd ..
```

Sau đó chạy hai terminal như mục đầu. Trên macOS/Linux, tạo môi trường bằng `python3 -m venv .venv`, dùng `.venv/bin/python` thay cho `.\.venv\Scripts\python.exe` và sao chép cấu hình bằng `cp -n .env.example .env`.

**4. Bật OCR khi cần đọc ảnh hoặc PDF scan**

Cài chương trình **Tesseract OCR** cùng dữ liệu ngôn ngữ `vie` và `eng`. Kiểm tra bằng `tesseract --list-langs`. Nếu đã cài trên Windows nhưng backend chưa tìm thấy chương trình, đặt đường dẫn thực tế trong `.env`, ví dụ `TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe`, rồi khởi động lại backend. Dán văn bản và trích chữ từ PDF có lớp văn bản có thể dùng độc lập với OCR.

## Chức năng theo phiên bản

| Mã | Chức năng | Có thể dùng ở đâu |
|---|---|---|
| FR-01 | Đăng ký, đăng nhập bằng JWT và sử dụng ứng dụng ở chế độ khách | Bản FR07 |
| FR-02 | Dán tiếng Việt, trích chữ từ PDF, nhận dạng chữ trong ảnh PNG/JPEG/WebP hoặc PDF scan | Bản FR07. Mặc định tối đa 10 MB/tệp, 100 trang/PDF và 10 trang với PDF cần OCR |
| FR-03 | Chỉnh phông, cỡ chữ, khoảng cách chữ, giãn dòng, độ rộng cột, màu nền và bật dòng tập trung | Màn hình đọc |
| FR-04 | Đọc thành tiếng, chọn giọng và tốc độ. Tô sáng theo từ khi giọng đọc cung cấp vị trí từ đáng tin cậy | Màn hình đọc, qua Web Speech API của trình duyệt |
| FR-05 | Lưu tùy chỉnh hiển thị trên trình duyệt và đồng bộ khi đăng nhập | Bản FR07 |
| FR-06 | Giải thích từ theo ngữ cảnh | Chưa triển khai trong bản FR07. Người đọc có thể tự ghi nghĩa |
| FR-07 | Thư viện từ cá nhân, tìm kiếm, lọc theo nguồn/ngày và phân trang | Nhánh FR07. Bản cập nhật bổ sung lưu nhanh, sửa ghi chú, hiện câu chứa từ, hoàn tác và quay về vị trí đọc |
| FR-08 | Tóm tắt văn bản bằng phương pháp trích xuất câu | API `POST /api/v1/assist/summarize` có trên `main` tại `aa74e75`, yêu cầu đăng nhập |
| FR-09 | Phản hồi giọng đọc của người dùng | Chưa triển khai trong bản FR07 |

## Dùng thử thư viện từ khó

1. Ở trang chủ, dán **“Em đang học sinh học. Em thích sinh học vì môn này giải thích cách cây lớn lên.”** rồi bấm **Đọc ngay**.
2. Bôi chọn cụm **“sinh học”** trong **câu thứ hai**, bấm **Lưu “sinh học”**. Ứng dụng báo kết quả ngay tại bài. Bạn có thể đọc tiếp hoặc bấm **Thêm ghi chú**.
3. Mở **Từ khó của tôi**. Thẻ từ hiển thị câu *“Em thích sinh học…”* và tô nổi đúng lần xuất hiện đã chọn. Dùng **Xem cả đoạn** để mở rộng, hoặc **Sửa ghi chú** nếu đã có ghi chú.
4. Xóa một từ rồi bấm **Hoàn tác**. Lần xóa gần nhất của thư viện đang dùng có thể khôi phục cả sau khi tải lại trang, giữ nguyên ghi chú, nguồn và ngày lưu. Trong **Quản lý thư viện**, thao tác **Xóa toàn bộ** yêu cầu xác nhận số từ của toàn kho, kể cả các từ nằm ngoài bộ lọc, và xóa cả lượt hoàn tác.
5. Bấm **Tiếp tục đọc** để quay về vị trí cuộn cũ nếu bài vẫn mở trong phiên. Sau khi tải lại trang, dùng **Mở văn bản** để chọn bài mới.

**Dữ liệu nằm ở đâu?** Khách lưu từ trong `localStorage` của trình duyệt đang dùng. Tài khoản lưu từ trên PostgreSQL theo từng người dùng. Đăng nhập không tự chuyển từ của khách sang tài khoản. Văn bản đang đọc được giữ trong phiên giao diện. Mỗi mục từ lưu đoạn ngữ cảnh và thông tin nguồn để có thể ôn lại sau khi đóng bài.

## Mã nguồn và API

| Đường dẫn | Nội dung |
|---|---|
| [`frontend/src/screens/`](frontend/src/screens/) | Trang chủ, xác thực, màn hình đọc và thư viện |
| [`frontend/src/components/vocabulary/`](frontend/src/components/vocabulary/) | Lưu nhanh, ghi chú và hiển thị ngữ cảnh |
| [`frontend/src/hooks/useVocabulary.ts`](frontend/src/hooks/useVocabulary.ts) | Chọn kho khách hoặc tài khoản và cập nhật danh sách từ |
| [`app/api/v1/endpoints/`](app/api/v1/endpoints/) | Các route FastAPI. Schema ở `app/schemas/`, nghiệp vụ ở `app/services/`, truy cập dữ liệu ở `app/repositories/` và model ở `app/models/` |
| [`alembic/versions/`](alembic/versions/) | Migration cho `users`, `display_settings` và `vocabulary_entries`. Revision `af317c86e219` bổ sung hoàn tác |
| [`tests/`](tests/) · [`frontend/e2e/`](frontend/e2e/) | Kiểm thử API trên PostgreSQL và kịch bản người dùng trên trình duyệt |

Các đường dẫn trong bảng sau có tiền tố `/api/v1`. Với route riêng tư, đăng nhập để lấy `access_token` rồi gửi header `Authorization: Bearer <access_token>`. Swagger hiển thị schema, tham số và phản hồi của **đúng phiên bản backend đang chạy**.

| Phương thức | Đường dẫn | Công dụng |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | Tạo tài khoản hoặc lấy token |
| GET | `/auth/me` | Xem tài khoản đang đăng nhập |
| POST | `/documents/extract-text` | Gửi tệp bằng `multipart/form-data`, trường `file`, nhận văn bản đã trích xuất |
| GET / PUT / DELETE | `/me/display-settings` | Đọc, thay toàn bộ hoặc đặt lại cấu hình hiển thị của tài khoản |
| GET / POST | `/me/vocabulary` | Liệt kê hoặc lưu từ. Lưu mới trả `201`, lưu lại cùng vị trí và ngữ cảnh trả `200` |
| GET | `/me/vocabulary/sources` | Liệt kê nguồn để lọc thư viện |
| PATCH | `/me/vocabulary/{entry_id}` | Cập nhật ghi chú bằng `{"meaning":"…"}`. Gửi `null` cho trường `meaning` để bỏ ghi chú |
| DELETE | `/me/vocabulary/{entry_id}?undoable=true` | Xóa một từ và giữ lượt hoàn tác. Bỏ tham số `undoable=true` sẽ xóa trực tiếp |
| POST | `/me/vocabulary/{entry_id}/restore` | Khôi phục từ vừa xóa của tài khoản |
| DELETE | `/me/vocabulary?expectedTotal=N` | Xóa cả kho. Giao diện gửi tổng đã xác nhận, máy chủ trả `409` nếu số từ đã thay đổi |

Nhóm route `/users` cũng hỗ trợ tạo tài khoản. Trên bản FR07, các thao tác đọc, sửa và xóa thông tin người dùng yêu cầu JWT và giới hạn trong tài khoản hiện tại.

## Kiểm thử và làm việc nhóm

Chạy backend test ở **thư mục gốc** với PostgreSQL đang hoạt động:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Bộ test tạo lại các bảng trong **database kiểm thử riêng** có tên kết thúc bằng `_test`, mặc định là `hci_db_test`. Dùng database dành riêng cho test. Nếu tài khoản PostgreSQL không có quyền tạo database, tạo trước database kiểm thử và cấp quyền trên đó.

Chạy các kiểm tra frontend trong `frontend/`:

```powershell
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Khi đóng góp, tách nhánh theo chức năng, dùng commit dạng `feat(fr07): …` hoặc `fix(reader): …` và mở pull request vào `main` để một thành viên khác review. Nếu sửa model, thêm migration tương ứng và kiểm tra bằng `python -m alembic heads`. Giữ thông tin kết nối và khóa JWT trong `.env` trên máy phát triển.

## Khắc phục sự cố

| Hiện tượng | Cách kiểm tra |
|---|---|
| Backend báo thiếu `DATABASE_URL` hoặc không kết nối được | Chạy từ thư mục có `alembic.ini`. Kiểm tra `.env`, dịch vụ PostgreSQL, tên database, mật khẩu và cổng |
| `Can't locate revision` khi đổi nhánh | Đối chiếu `python -m alembic current`, `python -m alembic heads` và nhánh Git. Nếu hai nhánh có lịch sử migration khác nhau, có thể dùng database phát triển riêng cho từng nhánh để giữ dữ liệu cũ |
| Dán văn bản được nhưng tải ảnh báo `503` | Kiểm tra `TESSERACT_CMD` và hai ngôn ngữ `vie`, `eng` bằng `tesseract --list-langs` |
| Giao diện mở được nhưng gọi API lỗi | Mở `/health` trên cổng backend. Nếu chạy backend trên cổng khác, đặt `VITE_API_URL` trong `frontend/.env.local`. Nếu Vite đổi cổng, thêm đúng địa chỉ frontend vào `BACKEND_CORS_ORIGINS`. Khởi động lại dịch vụ sau khi đổi cấu hình |
| Có thư viện nhưng chưa thấy **Sửa ghi chú** hoặc **Hoàn tác** | Kiểm tra đã áp dụng bản cập nhật FR07 cho cả frontend và backend, rồi chạy `python -m alembic upgrade head` bằng Python của dự án |
