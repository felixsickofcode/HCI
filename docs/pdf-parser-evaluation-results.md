# Kết quả đánh giá PDF sơ bộ — 2026-11-15

## Phạm vi

- B0 (parser hiện tại), P0 (PyMuPDF 2.1) và M0 (Marker 2.2.0, fast, không LLM) đều chạy offline trên `sample_pdf/easy.pdf` (5 trang) và `sample_pdf/difficult.pdf` (17 trang). Hai tệp chỉ được phép dùng local; output và ảnh QA nằm trong thư mục bị Git ignore.
- Người dùng đã xác nhận check nguồn ở easy trang 2 (hai bảng), difficult trang 4 (chỉ đầu/chân trang), trang 6 (một bảng, hai công thức). Đây là check chọn lọc ở ba trang, không phải ground truth toàn văn. So sánh có SHA đầu vào trùng nhau nằm trong `output/pdf-evaluation/local-comparison.md`.
- Cùng `ReadingText`/`SnapshotFigure` của ứng dụng được xem trong Chrome tại 390×844 và 1440×1000, với sáu cặp engine/tài liệu (12 lượt). Ảnh và số đo local: `output/pdf-evaluation/browser-qa/`.

## Quan sát trực quan

| Engine | Easy, trang 2 | Difficult, trang 6 |
| --- | --- | --- |
| B0 | Đoạn và tiêu đề liền mạch; hai bảng đúng vị trí, ảnh giữ ô và caption. | Bảng đúng vị trí, chữ xung quanh reflow; có một dòng `fit` đứng riêng trước bảng. |
| P0 | Nhiều chữ bị dính, như `Ví dụcụthể`; ảnh bảng vẫn rõ khi tải xong. | Nhiều từ dính nhau trong đoạn; bảng và caption vẫn ở vị trí hợp lý. |
| M0 | Tách `1.2` và tên mục thành hai heading lớn; bảng có ảnh. | Tạo thêm ảnh số trang `4` rất lớn; bảng có ảnh; công thức lộ mã LaTeX trong đoạn và ngắt chữ. |

Ở cả 12 lượt, không có lỗi JavaScript, ảnh figure tải được và trang không tràn ngang. Trên mobile, ảnh bảng mặc định nhỏ; hộp phóng mở/đóng bằng Escape, phóng tới 300% cho chữ rõ và cuộn ngang trong hộp để xem cột còn lại. B0 cũng được xem với nền tối và cỡ chữ 32px: tương phản rõ, tiêu đề tự xuống dòng, số đo tràn ngang vẫn bằng 0. Desktop có hai cột đối chiếu với PDF gốc, mobile xếp dọc.

## Chấm check nguồn và quyết định tạm thời

| Tài liệu | B0 | P0 | M0 |
| --- | ---: | ---: | ---: |
| easy | 9/9 | 7/9 | 9/9 |
| difficult | 6/8 | 7/8 | 5/8 |

Giữ B0 trong ứng dụng lúc này. Các điểm trên chưa đủ để tuyên bố parser nào tốt hơn trên PDF tiếng Việt nói chung. P0 cần xử lý khoảng trắng từ native output; M0 cần xử lý heading, ảnh thừa và công thức trước khi thử tích hợp. B0 còn cần kiểm tra công thức và dòng văn bản lẻ trên tài liệu khó. Chưa đo cold/ba lần warm, chưa có corpus đủ loại tài liệu hay ground truth toàn trang. M1 chưa chạy; không cần LLM để dùng B0/P0/M0.

## Bổ sung sửa B0 — 2026-11-15

Đã sửa parser runtime B0, không thay engine: ghép chữ đổi font/chỉ số, giữ thứ tự cột qua khoảng cách đoạn lớn và heading ngang trang, tránh nối paragraph xuyên hình, nối heading xuống dòng, sửa marker danh sách và caption trên/dưới/nhiều dòng. Công thức độc lập được snapshot bằng heuristic font/ký hiệu toán; ảnh crop tôn trọng CropBox/trang xoay. OCR phân biệt trang ngắn thuần chữ với scan có footer, giữ ảnh nếu không OCR được và chặn tài nguyên render. Xem quy tắc/giới hạn ở [module trình đọc](modules/document-reader.md).

Chạy lại hai PDF local thành công; easy vẫn có 3 snapshot (trang 2 có hai bảng), difficult trang 6 hiện có một bảng và hai snapshot công thức. Đã xem ảnh crop hai công thức, gồm tổng/chỉ số/phân số. Chấm cùng ground truth cũ: easy 9/9, difficult 7/8 (trước sửa 6/8). Check heading ở trang 4 vẫn không đạt; ảnh nguồn có dòng duy nhất phía trên, cần xem lại cách nhận dạng mục lục/header trước khi quyết định loại bỏ. Không sửa ground truth để nâng điểm.

Đây là check chọn lọc và QA ảnh crop, chưa phải QA browser toàn bộ lại sau bản sửa hay đánh giá CER toàn văn. Text thay thế của công thức vẫn có thể sai thứ tự; snapshot giữ hình thức nhưng không bổ sung MathML/TTS toán. Tesseract chưa có trên máy, nên OCR mới được kiểm tra bằng mock và raster fixture. Không thay đổi P0/M0/M1 hoặc kết luận xếp hạng tổng quát.
