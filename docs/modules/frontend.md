# Module frontend

## Vai trò

Frontend là Vite + React + TypeScript tại `frontend/`. `src/App.tsx` định tuyến các màn hình; `src/context/` quản lý auth context; `src/lib/api.ts` gom HTTP client; `src/mocks/` cung cấp dữ liệu mẫu.

## Invariant và bẫy

- `VITE_API_URL` mặc định là `http://localhost:8000`; `VITE_API_PREFIX` mặc định `/api/v1`.
- Token lưu ở `localStorage` key `token` và được tự động thêm thành Bearer header bởi `apiFetch`.
- Build gồm `tsc -b` rồi Vite; lint dùng ESLint config tại `frontend/eslint.config.js`.
- Các route `/auth`, `/login`, `/register` dùng cùng `Auth` với mode khác nhau; route không biết redirect về `/`.
- Test frontend dùng Vitest + React Testing Library, chạy `npm run test`; setup ở `src/test/setup.ts`.
- FR-05: bôi chọn chữ trong một block rồi bấm **Đọc phần đã chọn** ở popup để đọc riêng vùng chọn, không cần đăng nhập. Dùng chung `SpeechController`/player với đọc toàn bài; `ReadingSegment.sourceOffset` ánh xạ highlight về offset UTF-16 trong block và được trừ khi restart sau đổi giọng/tốc độ. Sự kiện từ lượt đọc đã hủy được bỏ theo generation. Chọn xuyên nhiều block chưa hỗ trợ; bấm phát player sau kết thúc vẫn đọc toàn bài. Test mock speech tại `src/lib/speech.test.ts`; cần nghe thử Web Speech trên browser để đánh giá giọng thực tế.
- `ReadingBlock` hỗ trợ `snapshot`: PNG inline do backend tạo, bbox/số trang, kích thước và text thay thế. `SnapshotFigure` hiện ảnh trong trang đọc; nút “Phóng to” mở cửa sổ riêng (lightbox) giữa màn hình với nền mờ, zoom 100–300% và phần chữ mở rộng; `ReadingText` vẫn render paragraph/heading/list để reflow và dùng TTS. Không nhúng HTML từ PDF.
- FR-06/FR-07: `ReadingText` gắn `data-segment-id` và offset UTF-16 lên block/token chữ; chọn bằng click, bôi chọn hoặc bàn phím (Tab tới block, Enter vào từ, ←/→ chuyển từ, Enter chọn từ) rồi mở `WordExplanationPopover`. Popup có Giải nghĩa và Lưu từ; pointerdown ngoài, Escape hoặc X đóng popup. `useWordExplanation` hủy request cũ, dùng chung request cùng selection và đối chiếu `documentId`, `contentVersion`, segment/range trước khi trả kết quả. `useSaveSelectedWord` nối nghĩa hợp lệ vào `useVocabulary().save()`, giữ nghĩa để retry lỗi lưu, bổ sung nghĩa cho dedupe không có nghĩa mà không ghi đè ghi chú đã có; thao tác được giới hạn theo tài liệu, vùng chọn và scope tài khoản. Lưu từ kèm nghĩa trong popup yêu cầu đăng nhập; thư viện khách đã lưu tiếp tục dùng được ở `/vocabulary`. Key Groq chỉ ở backend. Snapshot/bảng chưa có vùng chọn chữ trực tiếp trong ảnh.
- Route dev `/dev/pdf-review` chỉ có khi chạy Vite dev: nạp `normalized.json` benchmark và PDF gốc từ file input local, dùng lại `ReadingText`/`SnapshotFigure` để QA ở hai viewport với cỡ chữ/cột/nền nhất quán. Route bị loại khỏi production build; không thêm selector parser vào app thật.

## Lệnh

Chạy trong `frontend/`: `npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run test`; typecheck tương đương bước đầu của build là `npx tsc -b`.
