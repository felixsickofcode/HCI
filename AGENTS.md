# Hướng dẫn cho coding agent

## Mục đích dự án

Repo xây dựng ứng dụng đọc tiếng Việt dễ tiếp cận, gồm API backend và frontend web. Backend hiện tập trung vào tài khoản người dùng và cài đặt hiển thị; frontend hiện có các màn hình mẫu đọc và đăng nhập/đăng ký.

## Stack và phiên bản chính

- Backend: Python 3.12+, FastAPI 0.152, SQLAlchemy 2.1, Alembic 1.20, PostgreSQL, Pydantic 2, Uvicorn.
- Frontend: Node 24.x hiện dùng, Vite 8, React 19, TypeScript 6, TailwindCSS 3, ESLint 10.
- Đây là monorepo gồm `app/` + `tests/` và `frontend/`; chưa thấy CI config.

## Lệnh thường dùng

Backend, chạy từ thư mục gốc sau khi có `.env` và PostgreSQL:

```powershell
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
python -m pytest
python -m pytest tests/test_display_settings.py
```

Frontend, chạy từ `frontend/`:

```powershell
npm ci
npm run dev
npm run build
npm run lint
npx tsc -b
```

`npm run build` đã bao gồm `tsc -b`. Chưa có script/config lint, format hoặc typecheck riêng cho backend.

## Cấu trúc thư mục

- `app/api`: route và dependency injection; `app/services`: nghiệp vụ; `app/repositories`: truy cập DB; `app/models`: bảng SQLAlchemy; `app/schemas`: validation/API model.
- `app/core`: config, security, lỗi; `app/db`: engine, session, Base.
- `alembic/`: migration; `tests/`: integration test với PostgreSQL database riêng hậu tố `_test`.
- `frontend/src`: React app, screens, components, context và API client; `frontend/public`: asset tĩnh; `frontend/design`: tài liệu/mockup thiết kế.

## Quy ước code

- Giữ luồng endpoint → service → repository → model; endpoint không tự truy cập DB và repository không chứa nghiệp vụ.
- Schema Python dùng `snake_case`, JSON API dùng alias `camelCase` qua `CamelModel`; token OAuth giữ `access_token`/`token_type`.
- Mật khẩu phải hash bằng `app/core/security.py`, không trả `hashed_password`; lỗi nghiệp vụ dùng lớp con của `AppError`.
- Thay đổi schema DB phải thêm/import model, tạo migration và kiểm tra migration trước khi chạy.
- Không dùng header giả danh người dùng; endpoint cần auth dùng dependency `CurrentUser`.

## Bẫy & lưu ý

- `.env` chứa secret/DB URL, không commit; mẫu là `.env.example`. `DATABASE_URL` bắt buộc khi import app.
- Test tự tạo/dọn database tên kết thúc `_test`; có thể dùng `TEST_DATABASE_URL` nhưng không được trỏ vào DB thật.
- `alembic/versions/` phải giữ một migration head; đọc migration sinh tự động trước khi chia sẻ.
- `frontend/src/lib/api.ts` mặc định gọi `http://localhost:8000`; đổi bằng `VITE_API_URL`/`VITE_API_PREFIX`.
- `frontend/` hiện dùng mock articles/pillars cho màn hình đọc; chưa coi mock là backend persistence.

## Quy trình làm việc cho agent

1. Đọc `docs/handoff.md` đầu phiên.
2. Khi sửa phần phức tạp, đọc tài liệu tương ứng trong `docs/modules/`.
3. Chạy test/lint phù hợp trước khi báo xong; ghi rõ lệnh không chạy được và lý do.
4. Cập nhật `docs/handoff.md` cuối phiên.
5. Không commit nếu người dùng không yêu cầu.

## Đọc thêm

- Kiến trúc và luồng request: `docs/architecture.md`.
- Quy ước chi tiết: `docs/conventions.md`.
- Khi sửa auth/user: `docs/modules/auth-users.md`.
- Khi sửa cài đặt hiển thị: `docs/modules/display-settings.md`.
- Khi sửa model/migration/test DB: `docs/modules/database-migrations.md`.
- Khi sửa frontend: `docs/modules/frontend.md` và `frontend/AGENTS.md`.
