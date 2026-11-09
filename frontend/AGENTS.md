# Hướng dẫn frontend

Đọc [AGENTS.md](../AGENTS.md) trước; tài liệu chi tiết ở `../docs/modules/frontend.md`.

- Chạy lệnh từ thư mục này: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`.
- Typecheck: `npx tsc -b` (cũng là bước đầu của build). Chưa có frontend test script.
- Route tập trung ở `src/App.tsx`; gọi backend qua `src/lib/api.ts` để giữ base URL/token/error handling nhất quán.
- UI hiện dùng mock data trong `src/mocks/`; đừng coi đó là persistence backend.
- Backend dev mặc định ở `http://localhost:8000`; CORS phải khớp `.env` backend.
