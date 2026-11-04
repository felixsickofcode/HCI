# Hệ Thống Thiết Kế LexiEase (LexiEase Design System)
> **Tài liệu đặc tả phong cách giao diện trích xuất từ Stitch Project "HCI"**  
> Dự án: **HCI** (`projects/8818153691167113130`)  
> Nền tảng: **Desktop / Web Responsive**  
> Phong cách: **Auralis Architecture & Visual Scaffolding** (Tối giản êm dịu, công thái học nhận thức - Dyslexia-friendly, texture giấy cổ điển & glassmorphism nhẹ)

---

## 1. Bảng Màu (Color Palette)

Hệ màu tuân theo chuẩn Material You / Material Design 3 kết hợp với thẩm mỹ trang giấy tự nhiên (*Paper Texture & Warm Neutral*), giảm thiểu chói sáng và áp lực thị giác cho người đọc.

### 1.1 Màu Nền & Giấy (Canvas & Background)
| Tên Biến | Giá Trị Hex | Mô Tả & Ứng Dụng |
| :--- | :--- | :--- |
| `paper-texture` | `#FAF7F2` | Nền giấy ấm áp toàn trang kèm họa tiết vi hạt chấm mờ (radial-gradient) |
| `background` | `#FAF9FA` | Nền chuẩn cơ sở |
| `on-background` | `#1B1C1D` | Màu chữ chính tương phản trên nền |
| `selection-bg` | `#F9E37A` | Màu nền khi bôi đen văn bản (`selection:bg-tertiary-fixed`) |
| `selection-text` | `#211B00` | Màu chữ khi bôi đen (`selection:text-on-tertiary-fixed`) |

### 1.2 Nhóm Mặt Phẳng & Khối (Surface Containers)
| Tên Biến | Giá Trị Hex | Ứng Dụng |
| :--- | :--- | :--- |
| `surface-container-lowest` | `#FFFFFF` | Nền thẻ bài viết, trang giấy đọc chính (manuscript card), ô nhập liệu nổi |
| `surface-container-low` | `#F5F3F4` | Khối thẻ phụ, thanh nghe audio capsule, badge nền nhạt |
| `surface-container` | `#EFEDEE` | Khối trung gian, lớp giấy lót dưới, divider |
| `surface-container-high` | `#E9E8E9` | Khối nổi bật nhẹ |
| `surface-container-highest`| `#E3E2E3` | Divider, đường kẻ phân cách, thanh tiến trình |
| `surface-bright` | `#FAF9FA` | Bề mặt sáng |
| `surface-dim` | `#DBDADB` | Bề mặt trầm |
| `surface-variant` | `#E3E2E3` | Khối biến thể |
| `on-surface` | `#1B1C1D` | Màu chữ và icon tiêu chuẩn |
| `on-surface-variant` | `#434653` | Màu chữ phụ (phụ đề, mô tả, nhãn) |
| `outline` | `#737784` | Viền, placeholder input, icon phụ |
| `outline-variant` | `#C3C6D5` | Viền rất nhạt, dấu chấm phân tách metadata |

### 1.3 Nhóm Màu Chủ Đạo (Primary - Deep Sapphire / Indigo)
| Tên Biến | Giá Trị Hex | Ứng Dụng |
| :--- | :--- | :--- |
| `primary` | `#094CB2` | Nút bấm chính, chữ nhấn italic, liên kết |
| `primary-container` | `#3366CC` | Nửa chuyển sắc (gradient stop) của nút bấm chính |
| `primary-fixed` | `#D9E2FF` | Nền sáng chứa sắc lam, bóng mờ ambient backdrop |
| `primary-fixed-dim` | `#B1C5FF` | Sắc lam nhạt cố định |
| `on-primary` | `#FFFFFF` | Màu chữ/icon trên nền primary |
| `on-primary-container`| `#E7EBFF` | Màu chữ trên nền primary-container |
| `on-primary-fixed` | `#001946` | Màu chữ đậm trên nền primary-fixed |
| `on-primary-fixed-variant` | `#00419D` | Sắc thái biến thể |

### 1.4 Nhóm Màu Điểm Nhấn (Tertiary - Warm Ochre / Amber)
| Tên Biến | Giá Trị Hex | Ứng Dụng |
| :--- | :--- | :--- |
| `tertiary` | `#6D5E00` | Điểm nhấn triết lý, chấm tròn tiêu điểm, hoa văn kết bài (❦) |
| `tertiary-container` | `#BFAB49` | Khối nhấn màu vàng ấm |
| `tertiary-fixed` | `#F9E37A` | Highlight đánh dấu từ khóa, bóng sáng ambient vàng ấm |
| `tertiary-fixed-dim` | `#DCC661` | Sắc vàng mờ |
| `on-tertiary` | `#FFFFFF` | Chữ trên nền tertiary |
| `on-tertiary-container` | `#4A3F00` | Chữ trên nền tertiary container |
| `on-tertiary-fixed` | `#211B00` | Chữ đọc trên nền highlight |

### 1.5 Nhóm Màu Thứ Cấp & Báo Lỗi (Secondary & Error)
| Tên Biến | Giá Trị Hex | Ứng Dụng |
| :--- | :--- | :--- |
| `secondary` | `#5A5F63` | Sắc xám trung tính cho icon phụ |
| `secondary-container` | `#DFE3E8` | Nền khối thứ cấp |
| `on-secondary` | `#FFFFFF` | Chữ trên nền thứ cấp |
| `error` | `#BA1A1A` | Cảnh báo / lỗi |
| `error-container` | `#FFDAD6` | Khối chứa lỗi |
| `on-error` | `#FFFFFF` | Chữ trên nền lỗi |

---

## 2. Hệ Thống Kiểu Chữ (Typography)

Sử dụng 3 bộ font Google Fonts bổ trợ lẫn nhau nhằm tối ưu cho sự thoải mái của mắt khi đọc lâu và thẩm mỹ xuất bản tinh tế:

1. **`headline` / `display`:** `Noto Serif` (Serif cổ điển, thanh lịch, mang cảm xúc văn học và tri thức)
2. **`body`:** `Inter` (Sans-serif công thái học cao, chân đế cân bằng, hạn chế nhầm lẫn ký tự b/d/p/q)
3. **`label`:** `Public Sans` (Sans-serif kỹ thuật, sắc sảo cho nhãn, nút, metadata)

### 2.1 Thang Kích Thước & Ứng Dụng
| Phân Loại | Font Family | Size (px/rem) | Weight | Line Height | Letter Spacing | Ví Dụ Sử Dụng |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | Noto Serif | 36px - 60px (4xl - 6xl) | 400 (Normal) | 1.18 | -0.025em (tight) | Tiêu đề chính trang chủ |
| **Manuscript Title** | Noto Serif | 30px - 42px (3xl - 4xl) | 600 (Semibold) | 1.3 | -0.025em (tight) | Tiêu đề tác phẩm đọc |
| **Section H2** | Noto Serif | 30px - 36px (3xl - 4xl) | 400 (Normal) | 1.35 | normal | Tiêu đề các mục lớn |
| **Card H3** | Noto Serif / Inter | 20px - 24px (xl - 2xl) | 500 - 600 | 1.4 | normal | Tiêu đề thẻ bài viết, thẻ giá trị |
| **Reading Body** | Inter | 17.5px - 19px | 400 (Normal) | 2.1 (thoáng rộng) | 0.035em | Nội dung đọc văn bản chính |
| **Body Standard** | Inter | 15px - 16px (base) | 300 - 400 | 1.6 - 1.7 | normal | Đoạn văn mô tả trang chủ |
| **Label / Meta** | Public Sans | 12px - 14px (xs - sm) | 500 - 600 | 1.0 - 1.4 | 0.05em | Nút bấm, thời gian đọc, tên tác giả |
| **Folio / Overline** | Public Sans | 11px - 12px (xs) | 600 (Semibold) | 1.0 | 0.2em - 0.25em | Nhãn phân loại chữ in hoa trên cùng |

---

## 3. Bo Góc (Border Radius)

| Tên Lớp | Giá Trị | Ứng Dụng Thực Tế Trong Giao Diện |
| :--- | :--- | :--- |
| `rounded-sm` | `0.125rem` (2px) | Highlight ký tự (`mark`), chỉ mục nhỏ |
| `rounded` / `rounded-md` | `0.25rem` - `0.375rem` (4px - 6px) | Nút chọn tốc độ đọc (1.0x), thẻ chip nhỏ |
| `rounded-lg` | `0.5rem` (8px) | Thanh audio player capsule, nút chuyển chương |
| `rounded-xl` | `0.75rem` (12px) | Khung ảnh bài đọc, mục điều hướng trên header |
| `rounded-2xl` | `1rem` (16px) | Khung bài đọc giấy trung tâm (Manuscript Page) |
| `rounded-3xl` | `1.5rem` (24px) | Thẻ tuyển tập bài đọc (Reading Cards), thẻ trụ cột |
| `rounded-full` | `9999px` | Thanh tìm kiếm & nạp file, nút bấm chính (Button), nhãn tag marker |

---

## 4. Đổ Bóng & Chiều Sâu (Elevation & Shadows)

Không dùng bóng đổ gắt; hệ thống sử dụng bóng khuyếch tán đa tầng (diffused layered shadows) kết hợp với `backdrop-blur` để tạo hiệu ứng giấy bay bổng nhẹ nhàng:

| Tên Quy Chuẩn | Cấu Hình CSS | Ứng Dụng |
| :--- | :--- | :--- |
| `shadow-ambient-header` | `0 1px 12px rgba(27,28,29, 0.03)` | Header cố định trên cùng (`backdrop-blur-xl`) |
| `shadow-ambient-footer` | `0 -2px 16px rgba(27,28,29, 0.02)` | Footer chân trang (`backdrop-blur-md`) |
| `shadow-input-drop` | `0 20px 40px -15px rgba(27,28,29, 0.06)` | Thanh nạp file / nhập link trang chủ |
| `shadow-card-subtle` | `0 12px 30px -15px rgba(27,28,29, 0.05)` | Trạng thái tĩnh của thẻ bài viết / tuyển tập |
| `shadow-card-hover` | `0 24px 45px -18px rgba(27,28,29, 0.10)` | Trạng thái hover của thẻ bài viết (kèm `scale-105` ảnh) |
| `shadow-manuscript` | `0 4px 30px rgba(27,28,29,0.03), 0 18px 60px rgba(27,28,29,0.06), 0 1px 2px rgba(27,28,29,0.02)` | Tờ giấy đọc chính trong phòng đọc (3 lớp bóng vật lý) |

---

## 5. Khoảng Cách & Bố Cục (Spacing & Grid Layout)

* **Khung chứa tối đa:**
  * Toàn trang: `max-w-7xl` (1280px)
  * Khối thông điệp & CTA: `max-w-5xl` (1024px)
  * Ô nạp bài viết: `max-w-2xl` (672px)
  * Trang sách đọc tập trung: `max-w-[760px]` (chuẩn tỉ lệ vàng cho độ dài dòng văn bản)
* **Khoảng đệm phân đoạn (Section Spacing):**
  * `py-16 lg:py-24` (khoảng cách lớn tạo độ thở cho mắt)
  * Lề hai bên: `px-6 lg:px-12` (màn lớn), `px-4 sm:px-6` (di động)
* **Lưới nội dung:**
  * Lưới 3 cột: `grid grid-cols-1 md:grid-cols-3 gap-8` (Tuyển tập bài đọc & 3 trụ cột giá trị)
  * Lưới 12 cột: `grid grid-cols-1 lg:grid-cols-12 gap-8` (Tuyên ngôn thiết kế)

---

## 6. Các Thành Phần Tái Sử Dụng (Common Components)

Dựa trên cấu trúc lặp lại trong `design/html/`:

1. **Button (Nút bấm):**
   * `variant="primary"`: Gradient `from-primary to-primary-container`, chữ trắng, bo tròn `rounded-full`, hiệu ứng bóng đổ và `active:scale-[0.98]`.
   * `variant="secondary"` / `ghost`: Chữ xám đậm, nền `bg-surface-container-low` hoặc hover đổi nền, bo tròn `rounded-full` hoặc `rounded-lg`.
   * `variant="icon"`: Nút tròn 32px - 36px chứa icon Material Symbol.
2. **Input / DropZone (Thanh nhập & nạp tập tin):**
   * Thanh tìm kiếm dạng tờ giấy xếp lớp (Layered Paper Sheet), bao gồm icon `auto_stories`, input trong suốt, nút Tải file và nút Đọc ngay.
3. **Card (Thẻ bài):**
   * `ReadingCard`: Ảnh đại diện tỉ lệ chuẩn, badge chuyên mục phủ kính mờ, thời gian đọc, độ dịu mắt (100%), tên tác giả và nút mũi tên chuyển trang.
   * `PillarCard`: Khối giá trị với icon hình học, thanh tiến trình màu nhận diện (Primary / Tertiary / Neutral).
   * `ManuscriptCanvas`: Khung trang sách đọc tập trung với dải ribbon chương mục, thông tin tác giả, bài đọc và điều hướng chương.
4. **Badge & Marker (Huy hiệu & Nhãn):**
   * Tag marker: Chấm màu vàng hổ phách (`bg-tertiary`) + chữ in hoa tracking rộng.
   * Pill tag: Nền trắng mờ `backdrop-blur-md` trên nền ảnh.
5. **AudioPlayerCapsule (Thanh phát thanh AI):**
   * Trình điều khiển đọc bằng giọng nói mini gồm nút Play/Pause gradient, bộ đếm thời gian, sóng âm mô phỏng nhịp điệu và nút chuyển tốc độ đọc (1.0x).
