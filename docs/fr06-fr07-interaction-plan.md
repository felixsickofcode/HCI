# Kế hoạch sửa tương tác chọn từ FR-06/FR-07

Ngày: **2026-11-20**. Trạng thái: **đã triển khai frontend**.

## 1. Yêu cầu và luồng sử dụng

- Khi chọn một từ hoặc bôi chọn cụm từ trong một block chữ, mở một popup có hai nút **Giải nghĩa** và **Lưu từ**.
- **Giải nghĩa:** lấy nghĩa theo ngữ cảnh và hiển thị trong popup. Thao tác này không tự lưu vào thư viện.
- **Lưu từ:** lưu từ cùng nghĩa của nó. Nếu vùng chọn đã có kết quả giải nghĩa hợp lệ, dùng lại kết quả đó; nếu chưa có, tự giải nghĩa rồi lưu. Người dùng không phải bấm Giải nghĩa trước.
- Bấm vùng trắng hoặc bất kỳ vị trí nào ngoài popup sẽ đóng popup. Bấm trong popup không đóng. Tiếp tục hỗ trợ nút X và Escape.
- Bỏ toàn bộ thanh `QuickSaveWord` đang chứa dòng **“Chọn từ hoặc cụm từ trong bài để lưu.”**, bao gồm khung sticky và khoảng trống của thanh. Chuyển thao tác lưu và thông báo kết quả vào popup chung.

## 2. Đóng popup khi bấm ngoài

Trước khi triển khai, `WordExplanationPopover` chỉ đăng ký Escape; screen đã có xử lý đóng khi cuộn. Hiện popup cũng đóng khi pointerdown ngoài.

1. Khi popup mở, đăng ký `pointerdown` ở document và kiểm tra target có nằm trong popup portal hay không. Nếu ở ngoài thì đóng; hỗ trợ cả chuột và chạm màn hình.
2. Không thêm lớp phủ chặn tương tác với trang đọc. Bấm từ khác phải đóng lựa chọn cũ và mở popup cho từ mới; không nuốt sự kiện click hoặc đóng nhầm popup vừa mở.
3. Phân biệt lý do đóng: X/Escape trả focus về từ đã chọn; bấm ngoài để focus theo vị trí người dùng vừa bấm. Không tự kéo focus về bài đọc khi người dùng đang bấm một nút khác.
4. Đóng hoặc thay selection hủy bước giải nghĩa đang chờ và bỏ response cũ. Giữ xử lý đổi tài liệu, chuyển Bản gốc và cuộn; gỡ listener khi popup đóng/unmount.

## 3. Hai hành động dùng chung vùng chọn và kết quả

Tái sử dụng `WordSelection` từ `ReadingText`, gồm `segmentId`, `contextText`, `selectedText`, `start/end` UTF-16. Chụp thêm `documentId`, `contentVersion` và scope tài khoản khi bắt đầu thao tác. Không duy trì listener selection riêng của `QuickSaveWord` song song với popup mới.

### Giải nghĩa

- Giữ endpoint `POST /api/v1/assist/explain` và quy tắc đăng nhập/quota hiện có.
- Hook trả được kết quả đã kiểm chứng cho luồng lưu, thay vì chỉ cập nhật state. Kiểm tra document/version/segment/range/term trước khi dùng.
- Hai nút dùng chung một request giải nghĩa đang chạy cho cùng vùng chọn. Nếu bấm Lưu từ trong lúc đang giải nghĩa, nối bước lưu vào request đó; không tạo lượt gọi Groq thứ hai.

### Lưu từ và nghĩa

1. Nếu chưa đăng nhập hoặc token hết hạn, hiển thị lời mời đăng nhập ngay trong popup, giữ đường quay lại `/reading`. Luồng lưu kèm nghĩa AI này theo điều kiện đăng nhập của FR-06; thư viện khách đã lưu trước đó vẫn truy cập được tại `/vocabulary`.
2. Chụp snapshot vùng chọn và scope. Nếu đã có nghĩa cho đúng snapshot, dùng lại; nếu chưa có thì hiện **“Đang lấy nghĩa…”** và gọi giải nghĩa.
3. Khi có nghĩa hợp lệ, tạo `VocabularyDraft` với `term`, `meaning`, `example`, `contextText`, `sourceDocumentId`, `sourceTitle`, `sourceKind`, `contentVersion`, `segmentId`, `start`, `end`. Gọi `useVocabulary().save()` để lưu vào FR-07.
4. Hiện **“Đang lưu…”**, ngăn nhấn lưu lặp. Chỉ hiện **“Đã lưu từ và nghĩa”** khi response xác nhận lưu thành công và entry thực sự có nghĩa.
5. Nếu giải nghĩa lỗi/timeout/hết quota: hiển thị lỗi và Thử lại, không tạo mục chỉ có từ. Nếu giải nghĩa thành công nhưng lưu lỗi: giữ kết quả để thử lưu lại, không gọi Groq lại.
6. Nếu bản ghi đã tồn tại: dùng kết quả dedupe của FR-07, thông báo **“Từ đã có trong thư viện”**. Nếu mục cũ chưa có nghĩa, bổ sung nghĩa bằng API cập nhật ghi chú hiện có; giữ nguyên nghĩa/ghi chú do người dùng đã lưu nếu đã có. Không coi response dedupe chứa nghĩa rỗng là đã lưu đủ từ và nghĩa.
7. Trước khi gửi bước lưu phải kiểm tra snapshot/scope còn hiệu lực. Nếu đóng popup/đổi từ/đổi tài liệu trong lúc chờ lấy nghĩa, không tiếp tục gửi lưu. Nếu request lưu đã gửi, server vẫn có thể hoàn tất dù client hủy; không hiển thị kết quả đó ở vùng chọn hoặc tài khoản khác, lần thử lại dùng cơ chế dedupe.

API FR-07 và schema hiện đã nhận nghĩa/ví dụ; dự kiến không cần bảng hoặc migration mới. Chỉ mở rộng backend nếu kiểm tra tích hợp chứng minh API hiện tại chưa đáp ứng các điều kiện trên.

## 4. File cần sửa

| File | Thay đổi dự kiến |
| --- | --- |
| `frontend/src/components/reading/WordExplanationPopover.tsx` | Hai nút; trạng thái giải nghĩa/lưu; listener bấm ngoài; thông báo thành công/trùng/lỗi; focus theo lý do đóng |
| `frontend/src/hooks/useWordExplanation.ts` | Trả kết quả cho luồng lưu; dùng chung request; giữ kiểm tra snapshot và bỏ response cũ |
| Hook điều phối lưu từ mới trong `frontend/src/hooks/` | Nối giải nghĩa → `useVocabulary().save()`; retry lưu dùng lại nghĩa; kiểm tra scope/selection |
| `frontend/src/screens/MinimalReadingView/MinimalReadingView.tsx` | Nối popup chung, bỏ import/render và khung sticky `QuickSaveWord`; chỉnh hướng dẫn thao tác |
| `frontend/src/components/vocabulary/QuickSaveWord.tsx` | Gỡ component khi không còn nơi dùng; chuyển test hành vi lưu sang popup chung |
| `frontend/src/lib/vocabulary.ts`, `frontend/src/hooks/useVocabulary.ts` | Tái sử dụng draft, save/edit, dedupe và lỗi hiện có; chỉ sửa khi cần hỗ trợ luồng chung |
| Test FR-06/FR-07 và `frontend/e2e/fr07.spec.ts` | Cập nhật thao tác theo popup và các tình huống bên dưới |

## 5. Thứ tự triển khai và nghiệm thu

1. Sửa bấm ngoài và focus trước; kiểm tra click khoảng trắng, click trong popup, click từ khác, Escape/X, touch và cuộn.
2. Gộp hai nút và luồng giải nghĩa → lưu; bỏ thanh cũ. Chọn từ bằng click, bôi chọn cụm và bàn phím đều phải có hai hành động.
3. Kiểm tra mục mới có đúng từ/nghĩa/ngữ cảnh trong `/vocabulary`; Giải nghĩa đơn thuần không lưu. Test trường hợp đã có nghĩa, chưa có nghĩa, đang gọi Groq và bấm lưu nhanh nhiều lần.
4. Kiểm tra lỗi giải nghĩa không lưu từ trống nghĩa; lỗi lưu cho thử lại với nghĩa cũ; dedupe không ghi đè ghi chú; đổi tài khoản/từ/tài liệu hoặc đóng popup không lưu nhầm.
5. Test từ lặp đúng lần xuất hiện, cụm nhiều âm tiết, emoji/dấu tổ hợp và TTS/thước đọc; QA popup ở mobile/desktop để bảo đảm nội dung dài và cả hai nút đều truy cập được.
6. Chạy `npm run test`, `npm run lint`, `npm run build`; chạy test backend vocabulary/assist nếu thay hợp đồng. Cập nhật E2E và chạy khi môi trường Playwright sẵn sàng. Ghi rõ smoke test provider thật và QA nào đã/chưa chạy trong handoff.

Đã triển khai trong frontend: popup có Giải nghĩa/Lưu từ, đóng bằng pointer ngoài/Escape/X, dùng chung request giải nghĩa, lưu kèm nghĩa và retry lưu trên cùng snapshot; gỡ thanh sticky `QuickSaveWord`. Khách được chuyển tới đăng nhập trước khi giải nghĩa/lưu từ từ popup; thư viện khách đã lưu vẫn dùng được ở `/vocabulary`. Kiểm tra frontend: test, lint, typecheck và build đều pass. Chưa chạy Playwright, QA trực quan, hoặc smoke test Groq thật.
