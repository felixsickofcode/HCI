# Tiến độ Dự án: Học Phonics Đa Giác Quan (LexiEase)

> Tài liệu theo dõi tiến độ (Tracking Process) cho tính năng **Học Phonics Đa Giác Quan cho người Dyslexia** theo đặc tả tại [docs/phonics-feature-spec.md](./docs/phonics-feature-spec.md).
> Xem tài liệu chi tiết tại [docs/process.md](./docs/process.md).

---

## 📌 Tổng quan Trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| **Stitch UI Screens** | ✅ Đã hoàn thành | Đồng bộ 4 màn hình HTML + Screenshot từ Stitch Project `8818153691167113130` |
| **Phase 1 (Mục 8): Bài mẫu âm "m"** | ✅ Đã hoàn thành | Hoàn thiện cả 5 bước học tập, audio engine, tương tác kéo thả & phím |
| **Kiểm tra Linter & Build** | ✅ Đã kiểm tra | `eslint .` (0 lỗi), `npm run build` (thành công) |
| **Phase 2 (Mục 9)** | ⏳ Chưa bắt đầu | Thêm nhiều âm, A5 tách âm, A6 thao tác âm, A7 blending slider |
| **Phase 3 (Mục 9)** | ⏳ Chưa bắt đầu | A8 bảng tô chữ dung sai rộng, A9 chính tả, A10 đọc có kiểm soát... |
| **Phase 4 - BE & Lưu tiến độ** | ⏳ Chưa bắt đầu | Database, API lưu tiến độ theo người dùng, spaced repetition |

---

## 🚀 Chi tiết Phase 1: Bài luyện tập mẫu âm "m" (Mục 8)

### Checklist Nghiệm thu (Mục 8.8)

- [x] **Routing & Điều hướng:**
  - Route bài học: `/phonics` và `/phonics/:lessonId`
  - Alias hỗ trợ: `/hoc-da-giac-quan`, `/hoc-am`
  - Đã gắn liên kết *"Học đa giác quan"* trên thanh Header trang chủ.
- [x] **Đồng bộ Giao diện:**
  - Kế thừa toàn bộ design tokens của LexiEase (`#FAF7F2` nền giấy kem dịu, font `Lexend`, card `rounded-3xl`, shadow chuẩn).
- [x] **Quy ước màu Âm vị (LetterDisplay):**
  - Phụ âm: Xanh dương `#1F5FBF`.
  - Nguyên âm: Cam đỏ `#C2410C`.
  - Hỗ trợ đổi linh hoạt cho mọi ký tự (ví dụ: `m`, `a`, `M`, `A`) mà không cần sửa component.
- [x] **Bộ điều khiển Âm thanh (usePhonicsAudio):**
  - **Chỉ một âm thanh phát tại một thời điểm** (dừng âm cũ trước khi phát âm mới).
  - Hỗ trợ phát thường (1.0x) và phát chậm (0.75x).
  - Fallback bằng bộ tổng hợp âm sắc Web Audio (soft synthesizer chime) kèm cảnh báo mềm, không làm crash hay vỡ giao diện khi thiếu file `.mp3`.
- [x] **Bước 1: Làm quen âm (A1):**
  - Chữ "m" hiển thị hero cực lớn, công tắc chữ thường/chữ hoa (`m` / `M`).
  - Nút "Nghe" và "Nghe chậm" đổi trạng thái khi phát; nhấp vào chữ cái cũng phát âm.
  - Thẻ từ khoá mèo (`meo.svg`) kèm chữ "mèo" tô màu chữ `m` đầu tiên.
  - Dòng mẹo vận động khẩu hình từ `sound.tip`.
- [x] **Bước 2: Hướng dẫn tô chữ ngoài đời (A2):**
  - Hoạt hình nét chữ SVG tuần tự theo thứ tự nét (`pathLength="100"` & `strokeDashoffset`).
  - Chấm ngón tay ảo di chuyển theo nét, chấm tròn xuất phát, mũi tên chỉ hướng, số nét.
  - Nút "Xem lại", nút đổi tốc độ "Chậm / Bình thường", nút "Nghe âm".
  - Nút "Mình làm xong rồi" ghi nhận trạng thái và hiện lời khen ấm áp mà không chặn nút Tiếp tục.
  - Tôn trọng chế độ `prefers-reduced-motion` (hiển thị bản tĩnh đầy đủ nét).
- [x] **Bước 3: Nghe và chọn (A3):**
  - 3 lượt câu hỏi từ dữ liệu `listenAndChoose`.
  - Hỗ trợ cả Click và phím số **1, 2, 3**.
  - Chọn đúng: Viền xanh lá dịu + dấu tích `check_circle`, phát âm chuẩn, hiện nút sang lượt tiếp.
  - Chọn chưa đúng: Thẻ mờ nhẹ (không màu đỏ, không dấu X, không âm lỗi), tự phát lại âm, cho thử lại không giới hạn.
  - Gợi ý: Tự động nổi viền sáng thẻ đúng sau 2 lần chọn chưa đúng liên tiếp.
- [x] **Bước 4: Ghép âm bằng ô Elkonin (A4):**
  - 3 lượt từ: `ma` → `mo` → `me`.
  - Hỗ trợ 3 phương thức tương tác:
    1. Kéo thả chip vào ô (Pointer Events).
    2. Click chip rồi click ô trống.
    3. Phím Tab tới chip, Enter chọn, Tab tới ô, Enter đặt.
  - Đặt đúng: Chip nằm vào ô + phát âm riêng của chip đó.
  - Đặt sai: Chip nhẹ nhàng về chỗ cũ, không báo lỗi.
  - Cả 2 ô đúng: Lần lượt tô sáng từng âm theo giọng đọc → phát cả từ hoàn chỉnh → hiện lời khen `Giỏi lắm! m + a = ma` → nút sang từ tiếp.
- [x] **Bước 5: Hoàn thành:**
  - Lời khen ấm áp, không tính điểm số %, không màn hình thua.
  - Tóm tắt kiến thức đã học trong buổi.
  - Nút "Học lại bài này" (reset state) và "Về trang chủ".
  - Đặt comment `// TODO: gửi kết quả lên BE khi có API tiến độ`.
- [x] **Khả năng tiếp cận & Thiết bị (A11y & Responsiveness):**
  - Vừa vặn màn hình desktop 1366×768 không cần cuộn dọc.
  - Không vỡ layout khi zoom trình duyệt lên 200%.
  - Tương tác hoàn toàn bằng bàn phím (Tab, Enter, Space, phím số 1-3).
- [x] **Phạm vi mã nguồn:**
  - Hoàn toàn ở FE, không can thiệp BE, không làm ảnh hưởng các tính năng đọc sách hay đăng nhập hiện có.

---

## 📂 Danh mục File Đã Tạo / Chỉnh Sửa

```
frontend/
├── design/
│   ├── DESIGN.md                                 # Thiết kế hệ thống từ Stitch
│   ├── html/
│   │   ├── 01-minimal-homepage.html             # HTML Stitch Trang chủ
│   │   ├── 02-reading-library.html              # HTML Stitch Thư viện bài đọc (đồng bộ sidebar)
│   │   ├── 03-reading-workspace.html            # HTML Stitch Hỗ trợ đọc / Không gian đọc
│   │   └── 04-multisensory-learning.html        # HTML Stitch Học đa giác quan
│   └── screens/                                 # Ảnh chụp màn hình tương ứng
├── public/
│   └── assets/
│       └── images/m/meo.svg                     # Vector minh họa từ khoá "mèo"
└── src/
    ├── types/
    │   └── phonics.ts                           # Khai báo kiểu TypeScript & SOUND_COLORS
    ├── data/
    │   └── lessons/
    │       └── am-m.json                        # Dữ liệu bài mẫu âm "m" (Mục 7.3)
    ├── hooks/
    │   └── usePhonicsAudio.ts                   # Hook quản lý phát âm thanh & Web Audio fallback
    ├── components/
    │   └── phonics/
    │       ├── LetterDisplay.tsx                # Chữ cái lớn tô màu (xanh/cam)
    │       ├── AudioButton.tsx                  # Nút nghe âm thanh ≥ 48px
    │       ├── LessonStepper.tsx                # Thanh tiến trình 5 bước dịu mắt
    │       ├── FeedbackBanner.tsx               # Phản hồi nhẹ nhàng (role="status")
    │       ├── KeywordCard.tsx                  # Thẻ từ khoá & mẹo vận động
    │       ├── StrokeGuide.tsx                  # Hoạt hình nét chữ SVG
    │       ├── ListenAndChoose.tsx              # Bài tập A3: Nghe & chọn
    │       ├── SoundBoxes.tsx                   # Bài tập A4: Ghép ô âm Elkonin
    │       └── index.ts                         # Barrel export
    ├── screens/
    │   ├── PhonicsPractice/
    │   │   └── PhonicsPracticeView.tsx          # Màn hình chính bài học Phonics
    │   └── index.ts                             # Export PhonicsPracticeView
    ├── App.tsx                                  # Đăng ký routes /phonics
    └── mocks/
        └── navigation.ts                        # Gắn nav link "Học đa giác quan"
```

---

## 🗺️ Kế hoạch các Giai đoạn Tiếp theo

### Phase 2: Mở rộng Dữ liệu & Hoạt động Âm tiết
- [ ] Thêm các file JSON cho nhóm nguyên âm đơn: `a.json`, `o.json`, `e.json`...
- [ ] Hoạt động **A5: Tách âm** (Nghe từ, kéo chip vào ô theo từng âm).
- [ ] Hoạt động **A6: Thao tác âm** (Thêm/bớt/đổi âm).
- [ ] Hoạt động **A7: Nối âm bằng thanh trượt** (Blending slider).
- [ ] Cơ chế lộ trình tích luỹ và tiêu chí qua bài học.

### Phase 3: Hoạt động Vận động & Đọc kiểm soát
- [ ] Hoạt động **A8: Bảng tô chữ trên màn hình** (Dung sai rộng, hỗ trợ chuột/cảm ứng).
- [ ] Hoạt động **A9: Chính tả** (Nghe và gõ Telex/VNI).
- [ ] Hoạt động **A10: Đọc từ/câu có kiểm soát** (Cửa sổ đọc và tô sáng từng từ).
- [ ] Hoạt động **A11: Đếm âm tiết bằng nhịp phím Space**.
- [ ] Hoạt động **A12: Cử chỉ thanh điệu** (Hoạt hình cử chỉ trên không).

### Phase 4: Backend & Tiến độ người học
- [ ] Xây dựng Database & API: `sounds`, `lessons`, `exercises`, `progress`, `attempts`.
- [ ] Lưu tiến độ học tập trên đám mây đồng bộ với tài khoản user.
- [ ] Thuật toán ôn lặp ngắt quãng (Spaced Repetition).
- [ ] Bảng điều khiển theo dõi tiến độ cho phụ huynh và giáo viên.

### Phase 5: Nâng cao & Đa phương tiện
- [ ] Hoạt động **A13: Ghi âm giọng đọc và nghe lại đối chiếu**.
- [ ] Hoạt động **A14: Viết trên không qua Webcam (MediaPipe)**.
- [ ] Hỗ trợ chế độ ngoại tuyến (Offline PWA/Cache).

---

## ❓ Câu hỏi & Điểm cần Chuyên gia xác nhận (Mục 10)

1. **Kiểu chữ viết:** Hiện đang dùng mẫu chữ in thường; cần giáo viên chuyên môn xác nhận có chuyển sang kiểu chữ tiểu học nét thanh nét đậm của Bộ GD&ĐT hay không.
2. **Thứ tự nét chữ thật:** Kiểm tra toạ độ và thứ tự các nét trong SVG chữ "m" (`strokes.verified: true`).
3. **Từ khoá chuẩn:** Thống nhất từ khoá cho âm "m" là "mèo", "mẹ" hay từ khác phù hợp hơn.
4. **Nguồn thu âm:** Cần file thu âm người thật phát âm vị chuẩn tiếng Việt để thay thế file âm thanh mô phỏng tạm thời.
