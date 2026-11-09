# Module frontend

## Vai trò

Frontend là Vite + React + TypeScript tại `frontend/`. `src/App.tsx` định tuyến các màn hình; `src/context/` quản lý auth context; `src/lib/api.ts` gom HTTP client; `src/mocks/` cung cấp dữ liệu mẫu.

## Invariant và bẫy

- `VITE_API_URL` mặc định là `http://localhost:8000`; `VITE_API_PREFIX` mặc định `/api/v1`.
- Token lưu ở `localStorage` key `token` và được tự động thêm thành Bearer header bởi `apiFetch`.
- Build gồm `tsc -b` rồi Vite; lint dùng ESLint config tại `frontend/eslint.config.js`.
- Các route `/auth`, `/login`, `/register` dùng cùng `Auth` với mode khác nhau; route không biết redirect về `/`.
- Chưa thấy test frontend hoặc script test trong `frontend/package.json`.

## Lệnh

Chạy trong `frontend/`: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`; typecheck tương đương bước đầu của build là `npx tsc -b`.
