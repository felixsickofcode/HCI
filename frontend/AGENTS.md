# Hướng dẫn frontend

Đọc [AGENTS.md](../AGENTS.md) trước; tài liệu chi tiết ở `../docs/modules/frontend.md`.

- Chạy lệnh từ thư mục này: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`.
- Typecheck: `npx tsc -b` (cũng là bước đầu của build). Test: `npm run test` (Vitest + React Testing Library).
- Route tập trung ở `src/App.tsx`; gọi backend qua `src/lib/api.ts` để giữ base URL/token/error handling nhất quán.
- Trang đọc dùng `DocumentProvider` với văn bản dán/tệp thật; `src/mocks/` chỉ là dữ liệu mẫu. Tài liệu chưa lưu qua refresh hoặc lên backend.
- Parser, hợp đồng block, snapshot bảng/ảnh và QA: đọc `../docs/modules/document-reader.md`.
- Backend dev mặc định ở `http://localhost:8000`; CORS phải khớp `.env` backend.
