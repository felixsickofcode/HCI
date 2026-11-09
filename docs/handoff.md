Agent cập nhật file này cuối mỗi phiên làm việc.

## Đang làm

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

Ngày cập nhật cuối: 2026-11-07
