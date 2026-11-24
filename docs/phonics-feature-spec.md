# Đặc tả tính năng: Học Phonics đa giác quan (tiếng Việt) cho người dyslexia

> File này dành cho AI agent lập trình và người phát triển.
> Mô tả **toàn bộ nghiệp vụ** để agent hiểu bối cảnh, nhưng **chỉ được làm phần ở Mục 8**.

---

## 0. Quy tắc làm việc cho agent (đọc trước khi làm bất cứ điều gì)

1. **Phạm vi:** chỉ làm Mục 8. Các mục còn lại là bối cảnh để viết code dễ mở rộng, **không implement**.
2. **Chỉ làm FE.** Không sửa BE, không sửa chức năng user CRUD hiện có, không tạo bảng/API mới.
3. **Chưa code ngay.** Việc đầu tiên:
   - Đọc FE hiện tại và **DESIGN.md**: stack, cấu trúc thư mục, routing, cách tổ chức component, component dùng chung (Button, Card...).
   - Báo cáo ngắn những gì tìm thấy.
   - Đề xuất kế hoạch: sẽ tạo/sửa file nào, vì sao. **Chờ người dùng duyệt rồi mới code.**
4. **Giao diện theo DESIGN.md** (màu, phông chữ, cỡ chữ, bo góc, đổ bóng). Bố cục sidebar, thanh 4 bước, nav con và chân trang theo các màn Stitch đã tải (bai01-1 đến bai01-6). Đặc tả này không quy định lại style. Dùng lại component sẵn có; trước khi tạo component mới, kiểm tra xem đã có component tương đương chưa.
5. Không thêm thư viện mới nếu chưa nói trước lý do. Ưu tiên thứ có sẵn của trình duyệt (Web Audio/HTMLAudioElement, SVG, Pointer Events, CSS animation). **Ngoại lệ đã được duyệt:** Vivus.js cho hoạt hình nét ở Bước 1 (Mục 8.5 và 8.8), cài qua npm và đóng gói cùng app, không dùng CDN.
6. Làm theo từng bước nhỏ. Sau mỗi bước, nói cho người dùng cách chạy và cách tự kiểm tra bằng mắt.
7. Khi gặp điểm chưa rõ trong đặc tả: dùng giả định hợp lý, ghi lại giả định, và liệt kê ở cuối báo cáo. Không tự mở rộng phạm vi.

---

## 1. Tổng quan

**Sản phẩm:** app giúp người dyslexia học đọc tiếng Việt theo phương pháp phonics đa giác quan (hướng Orton-Gillingham).

**Nguyên lý:** mỗi âm/chữ được học đồng thời qua 3 kênh:

| Kênh | Ví dụ |
|---|---|
| Nhìn | chữ lớn, tô màu theo loại âm |
| Nghe | phát âm vị chuẩn, nghe chậm, nghe lặp lại |
| Vận động/xúc giác | viết theo nét bằng tay hoặc chuột, kéo thả ô âm, cảm nhận miệng khi phát âm |

**Mục tiêu học tập:** người học nhận biết âm, gắn âm với chữ, ghép âm thành tiếng, tách tiếng thành âm, rồi tự đọc những tiếng chưa được làm mẫu.

---

## 2. Người dùng và thiết bị

- **Người dùng:** nhiều độ tuổi (trẻ nhỏ, tiểu học, thiếu niên, người lớn).
- **Thiết bị:** laptop và PC, chuột và bàn phím. Màn hình cảm ứng/bút là tuỳ chọn, **không được phụ thuộc**.
- **Hệ quả thiết kế:** màn hình không cho xúc giác thật, nên người học viết theo nét bằng tay (trên bàn hoặc trong không khí) hoặc bằng chuột, app đóng vai người hướng dẫn bằng hoạt hình và âm thanh.

---

## 3. Nguyên tắc về hành vi (áp dụng cho mọi màn hình)

> Màu sắc, phông chữ, cỡ chữ, bo góc, đổ bóng và bố cục theo **DESIGN.md**. Mục này chỉ nêu quy tắc về hành vi.

- Mỗi màn hình chỉ có **một mục tiêu**. Ít chữ, câu đơn giản.
- Phụ âm và nguyên âm có màu khác nhau (chọn từ bảng màu trong DESIGN.md), nhất quán toàn app. **Không chỉ dựa vào màu** để truyền thông tin: luôn kèm biểu tượng, nhãn hoặc hình dạng (ví dụ đúng = dấu tích).
- Chữ tiếng Việt (ă â ê ô ơ ư đ và 5 dấu thanh) hiển thị đầy đủ.
- **Không tính giờ. Không "game over". Không hiển thị điểm kiểu phần trăm.**
- Làm sai là bình thường: cho thử lại không giới hạn, không dấu X đỏ, không âm báo lỗi, không từ "sai/thua/thất bại".
- Lời phản hồi ấm, ngắn, xưng "bạn". Ví dụ chưa đúng: "Chưa đúng, mình nghe lại nhé."
- Bài học chia thành 4 bước ngắn, có thể dừng bất cứ lúc nào (Bài 01 dự kiến khoảng 40 phút, chỉ là thông tin).
- Dùng được hoàn toàn bằng bàn phím (Tab, Enter, Space, phím số); focus nhìn rõ.
- Tôn trọng `prefers-reduced-motion`: tắt/giảm hoạt hình, thay bằng thay đổi tĩnh.
- Không vỡ layout khi trình duyệt zoom tới 200%.
- Mọi nút/biểu tượng có nhãn chữ hoặc `aria-label`.

---

## 4. Giáo trình tổng thể (bối cảnh; chỉ Bài 01 được làm)

> Thứ tự bài lấy theo phần Học vần của sách **Tiếng Việt 1 Cánh Diều** (mục lục trên VietJack: https://www.vietjack.com/tieng-viet-1-cd/index.jsp). Việc gộp thành **28 bài, 7 chương** là do nhóm làm. Cần đối chiếu với sách giáo khoa thật; bài 137 "Vần ít gặp" của sách chưa rõ nội dung chi tiết. Bài ôn tập cuối mỗi chương (trộn nhiều bài) không tính vào 28 bài.

### Phần A: Chữ cái và âm

| Bài | Bài Cánh Diều | Âm và vần |
|---|---|---|
| **Chương 1** | | |
| 1 | 1, 2, 4, 5 | a, c, o, ô; thanh huyền, sắc, hỏi, nặng (cà, cá, cỏ, cọ) |
| 2 | 6, 7, 10 | ơ, d, đ, e, ê, l |
| 3 | 11, 12, 13 | b, g, h, i, ia; thanh ngã (bễ) |
| 4 | 16, 17, 18 | gh, gi, k, kh, m |
| **Chương 2** | | |
| 5 | 19, 22 | n, nh, ng, ngh |
| 6 | 23, 24, 25 | p, ph, qu, r, s, x |
| 7 | 28, 29 | t, th, tr, ch |
| 8 | 30, 31, 34, 35 | u, ư, ua, ưa, v, y; chữ hoa |

### Phần B: Vần

| Bài | Bài Cánh Diều | Vần |
|---|---|---|
| **Chương 3: vần có âm cuối -m, -p** | | |
| 9 | 36, 37, 40 | am, ap, ăm, ăp, âm, âp |
| 10 | 41, 42, 43 | em, ep, êm, êp, im, ip |
| 11 | 46, 47, 48 | iêm, yêm, iêp, om, op, ôm, ôp |
| 12 | 49, 52, 53, 54 | ơm, ơp, um, up, uôm, ươm, ươp |
| **Chương 4: vần có âm cuối -n, -t** | | |
| 13 | 55, 58, 59 | an, at, ăn, ăt, ân, ât |
| 14 | 60, 61, 64 | en, et, ên, êt, in, it |
| 15 | 65, 66, 67, 70 | iên, iêt, yên, yêt, on, ot, ôn, ôt |
| 16 | 71, 72, 73, 76 | ơn, ơt, un, ut, ưt, uôn, uôt, ươn, ươt |
| **Chương 5: vần có âm cuối -ng, -c, -nh, -ch** | | |
| 17 | 77, 78, 79 | ang, ac, ăng, ăc, âng, âc |
| 18 | 82, 83, 84, 85 | eng, ec, iêng, yêng, iêc, ong, oc, ông, ôc |
| 19 | 88, 89, 90, 91 | ung, uc, ưng, ưc, uông, uôc, ương, ươc |
| 20 | 94, 95, 96 | anh, ach, ênh, êch, inh, ich |
| **Chương 6: vần có âm cuối i, y, o, u** | | |
| 21 | 97, 100, 101 | ai, ay, oi, ây, ôi, ơi |
| 22 | 102, 103, 106, 107 | ui, ưi, uôi, ươi, ao, eo, au, âu |
| 23 | 108, 109, 112 | êu, iu, iêu, yêu, ưu, ươu |
| **Chương 7: vần có âm đệm** | | |
| 24 | 113, 114, 115 | oa, oe, uê, uơ, uy, uya |
| 25 | 118, 119, 120, 121 | oam, oăm, oan, oat, oăn, oăt, uân, uât |
| 26 | 124, 125, 126, 127 | oen, oet, uyên, uyêt, uyn, uyt, oang, oac |
| 27 | 130, 131, 132, 133 | oăng, oăc, oanh, oach, uênh, uêch, uynh, uych |
| 28 | 136, 137 | oai, oay, uây; các vần ít gặp |

**Độ phủ:** 29 chữ cái (ă và â học ở bài 9), 11 phụ âm ghép (gh, gi, kh, ng, ngh, nh, ph, qu, th, tr, ch), 6 thanh điệu và 140 vần (137 vần ở bài 9-28, cộng ia, ua, ưa ở Phần A).

**Mỗi bài gồm 2-4 bài của Cánh Diều;** mỗi bài Cánh Diều (2-3 âm) là một lượt nhỏ trong Bước 1 của bài học (Mục 5).

---

## 5. Cấu trúc một bài học (bối cảnh)

Mỗi bài trong giáo trình (Mục 4) gồm 4 bước, theo thứ tự:

| Bước | Tên | Nội dung |
|---|---|---|
| 1 | Multisensory Learning | Học đa giác quan các âm của bài |
| 2 | Guided Blending | Xem và nghe một vài cách ghép các âm |
| 3 | Elkonin Boxes | Nghe và tự ghép lại bằng ô âm |
| 4 | Independent Decoding | Tự đọc những tiếng chưa được làm mẫu trực tiếp |

Bài học không có hoạt động nào khác ngoài 4 bước này.

---

## 6. Nội dung Bài 01 – Âm và chữ (bài demo)

**Âm và chữ: a – c – o – ô.** Thời lượng dự kiến: 40 phút.

### Bước 1. Multisensory Learning (12 phút)
Học lần lượt 4 chữ: a, c, o, ô. Với mỗi chữ:
- Nhìn chữ và nghe âm mẫu.
- Tự phát âm.
- Dùng tay/chuột viết theo nét chữ.

Sau đó làm quen 4 thanh qua nghe và quan sát dấu: huyền, sắc, hỏi, nặng.

### Bước 2. Guided Blending (8 phút)
Giáo viên làm mẫu cách ghép:
- c + a → ca
- c + o → co
- c + ô → cô
- ca + huyền → cà

Người học quan sát chữ xuất hiện, nghe từng âm và nghe tiếng sau khi ghép.

### Bước 3. Elkonin Boxes (12 phút)
Người học nghe một từ (không nhìn từ mẫu), rồi ghép lại bằng ô âm: [ phụ âm ] + [ nguyên âm ] → [ từ ]. Các thẻ âm gồm cả âm gây nhiễu để kiểm tra; dấu thanh chọn từ 4 dấu (huyền, sắc, hỏi, nặng). Ví dụ nghe "cà": chọn c, a và dấu huyền, bấm Kiểm tra; khi đúng thì đọc thành tiếng "cà". Dấu thanh không tạo thêm âm vị nên không nằm trong các ô âm.

### Bước 4. Independent Decoding (8 phút)
Người học tự đọc những tiếng chưa được giáo viên làm mẫu trực tiếp. Mỗi câu: đọc tiếng và chọn cách viết đúng.

| Câu | Nghe | Chọn | Đáp án |
|---|---|---|---|
| 1 | /ca/ với thanh sắc | cà, cá, ca | cá |
| 2 | /co/ với thanh hỏi | co, cỏ, cô | cỏ |
| 3 | /co/ với thanh nặng | cọ, có, cô | cọ |
| 4 | /cô/ | co, cô, cỏ | cô |

---

## 7. Định dạng dữ liệu bài học

Bài 01 dùng **một file JSON viết cứng** (tên và vị trí theo quy ước của project, ví dụ `lessons/bai-01.json`). Cấu trúc đề xuất (có thể điều chỉnh cho hợp project, nhưng giữ đủ các trường để về sau thay bằng API mà không phải sửa UI):

```json
{
  "id": "bai-01",
  "number": 1,
  "title": "Âm và chữ",
  "estimatedMinutes": 40,
  "source": { "book": "Tiếng Việt 1 Cánh Diều", "lessons": [1, 2, 4, 5] },
  "step1": {
    "minutes": 12,
    "sounds": [
      { "symbol": "a", "type": "vowel", "readAs": "a",
        "audio": { "normal": "/assets/audio/a/phoneme.mp3", "slow": "/assets/audio/a/phoneme-slow.mp3" } },
      { "symbol": "c", "type": "consonant", "readAs": "cờ",
        "audio": { "normal": "/assets/audio/c/phoneme.mp3", "slow": "/assets/audio/c/phoneme-slow.mp3" } },
      { "symbol": "o", "type": "vowel", "readAs": "o",
        "audio": { "normal": "/assets/audio/o/phoneme.mp3", "slow": "/assets/audio/o/phoneme-slow.mp3" } },
      { "symbol": "ô", "type": "vowel", "readAs": "ô",
        "audio": { "normal": "/assets/audio/o-mu/phoneme.mp3", "slow": "/assets/audio/o-mu/phoneme-slow.mp3" } }
    ],
    "tones": [
      { "name": "huyền", "example": "cà", "audio": "/assets/audio/words/ca-huyen.mp3" },
      { "name": "sắc", "example": "cá", "audio": "/assets/audio/words/ca-sac.mp3" },
      { "name": "hỏi", "example": "cỏ", "audio": "/assets/audio/words/co-hoi.mp3" },
      { "name": "nặng", "example": "cọ", "audio": "/assets/audio/words/co-nang.mp3" }
    ]
  },
  "step2": {
    "minutes": 8,
    "examples": [
      { "parts": ["c", "a"], "result": "ca", "audio": "/assets/audio/words/ca.mp3" },
      { "parts": ["c", "o"], "result": "co", "audio": "/assets/audio/words/co.mp3" },
      { "parts": ["c", "ô"], "result": "cô", "audio": "/assets/audio/words/co-mu.mp3" },
      { "base": "ca", "tone": "huyền", "result": "cà", "audio": "/assets/audio/words/ca-huyen.mp3" }
    ]
  },
  "step3": {
    "minutes": 12,
    "items": [
      { "word": "cà", "audio": "/assets/audio/words/ca-huyen.mp3",
        "consonant": "c", "vowel": "a", "tone": "huyền",
        "chips": ["o", "a", "ô", "c"] },
      { "word": "cò", "audio": "/assets/audio/words/co-huyen.mp3",
        "consonant": "c", "vowel": "o", "tone": "huyền",
        "chips": ["a", "c", "ô", "o"] },
      { "word": "cổ", "audio": "/assets/audio/words/co-mu-hoi.mp3",
        "consonant": "c", "vowel": "ô", "tone": "hỏi",
        "chips": ["o", "ô", "c", "a"] },
      { "word": "ca", "audio": "/assets/audio/words/ca.mp3",
        "consonant": "c", "vowel": "a", "tone": null,
        "chips": ["ô", "c", "a", "o"] }
    ]
  },
  "step4": {
    "minutes": 8,
    "items": [
      { "heard": "/ca/", "tone": "sắc", "audio": "/assets/audio/words/ca-sac.mp3", "options": ["cà", "cá", "ca"], "answer": "cá" },
      { "heard": "/co/", "tone": "hỏi", "audio": "/assets/audio/words/co-hoi.mp3", "options": ["co", "cỏ", "cô"], "answer": "cỏ" },
      { "heard": "/co/", "tone": "nặng", "audio": "/assets/audio/words/co-nang.mp3", "options": ["cọ", "có", "cô"], "answer": "cọ" },
      { "heard": "/cô/", "tone": null, "audio": "/assets/audio/words/co-mu.mp3", "options": ["co", "cô", "cỏ"], "answer": "cô" }
    ]
  }
}
```

> Âm thanh của từng âm ở Bước 2 lấy từ `step1.sounds[].audio` theo `symbol`. Mỗi chữ trong `step3.items[].chips` phải có trong `step1.sounds` (để lấy loại âm và âm thanh). `tone: null` nghĩa là từ không có dấu thanh. Từ ví dụ của 4 dấu thanh (cà, cá, cỏ, cọ) lấy từ tên các bài của Cánh Diều. Bước 3 có 4 bài tập (cà, cò, cổ, ca) do nhóm đề xuất, cần xác nhận (Mục 9). Bài 01 chỉ có một phụ âm (c) nên chip gây nhiễu chỉ là các nguyên âm của bài; 4 dấu thanh luôn có đủ ở hàng dấu.

> Dữ liệu nét **không nằm trong file bài học** mà trong dữ liệu glyph dùng chung (Mục 8.8). Cờ `verified: false` trong từng glyph nghĩa là toạ độ nét chỉ là giá trị tạm để chạy thử luồng. Thứ tự và hình dạng nét thật phải được người có chuyên môn (giáo viên tiểu học) xác nhận trước khi dùng cho người học.

---

## 8. Phạm vi làm ngay: trang Bài 01

### 8.1 Mục tiêu
Một **trang bài học cho Bài 01 – Âm và chữ (a, c, o, ô)** theo đúng 4 bước ở Mục 6, chỉ FE, dữ liệu viết cứng. Trang này là bài mẫu để về sau thêm bài khác chỉ bằng dữ liệu. Dùng để demo cho giảng viên; các bài khác chỉ hiện tên trong sidebar để thấy phạm vi giáo trình.

### 8.2 Trong phạm vi
- Một trang bài học gồm 4 bước và một màn kết thúc (Mục 8.4 và 8.5).
- Sidebar trái liệt kê giáo trình 28 bài theo 7 chương (tên bài và âm mới). Chỉ Bài 01 có nội dung; bấm bài khác hiện thông báo nhẹ "Bài này sắp có".
- Một component chữ cái dùng chung cho mọi chữ, nhận loại âm (phụ âm/nguyên âm) để đổi màu.
- Âm thanh phát từ file mp3 trong dữ liệu.
- Trạng thái chỉ lưu trong state của trang, mất khi tải lại.

### 8.3 Ngoài phạm vi (không làm)
- BE, API, database, đăng nhập, lưu tiến độ
- Các bài khác ngoài Bài 01 (chỉ cần tên trong sidebar)
- Các trang khác của app (Trang chủ, Hỗ trợ đọc, Thư viện)
- Mọi hoạt động ngoài 4 bước ở Mục 6
- Chấm đúng/sai cách viết nét chữ của người học
- Thu âm giọng người dùng

### 8.4 Bố cục chung (desktop)
Bố cục giống hệt nhau ở mọi màn, chỉ đổi nội dung:
- **Không có navbar.** Sidebar trái theo các màn Stitch đã tải, thu gọn được.
- **Tiêu đề bài:** "Bài 01 – Âm và chữ" và dòng chữ tĩnh "Khoảng 40 phút".
- **Thanh tiến trình 4 bước:** "Học đa giác quan", "Xem và nghe cách ghép", "Nghe và tự ghép", "Tự đọc"; hiển thị "Bước x / 4", các bước trước có dấu tích. Cùng vị trí và cùng kiểu ở mọi màn.
- **Thanh nav con** ngay dưới thanh 4 bước, cùng vị trí ở mọi màn:
  - Bước 1: 5 tab "a", "c", "o", "ô", "Dấu thanh", chuyển qua lại tự do; tab đã xem có dấu tích.
  - Bước 2: không có.
  - Bước 3: các ô số của bài tập, chuyển qua lại tự do; bài tập đã đúng có dấu tích.
  - Bước 4: chữ "Câu x / 4".
  - Màn kết thúc: không có.
- **Khu vực nội dung.**
- **Chân trang cố định:** "Quay lại" (trái) và "Tiếp tục" (phải). Ở Bước 1, "Tiếp tục" đi tuần tự qua các tab, hết tab thì sang bước kế. Bước 3 có chân trang riêng (Mục 8.5). Màn kết thúc không có "Quay lại / Tiếp tục".
- Mỗi màn vừa màn hình 1366×768 mà không phải cuộn dọc, kể cả khi sidebar đang mở.

### 8.5 Chi tiết từng bước

#### Bước 1: Multisensory Learning
**Màn âm** (một tab cho mỗi âm trong `step1.sounds`, cùng một bố cục, hai cột: cột trái 2/3, cột phải 1/3):
- **Cột trái:** một chữ lớn đặt chính giữa, vẽ bằng **Vivus.js** (`type: 'oneByOne'`): vẽ xong dứt điểm từng nét rồi mới sang nét kế, nét đều. Nét là đường đơn đi giữa thân chữ (Mục 8.8). Có chấm bắt đầu mỗi nét và số thứ tự nét. Ngay dưới chữ là **một nút duy nhất "Phát lại"** (biểu tượng phát lại): bấm thì **phát âm và chạy lại hoạt hình cùng lúc** (`reset().play()`). Không có phần nào khác trong cột này.
- **Cột phải:**
  1. Đoạn hướng dẫn bằng chữ: "Bạn hãy vừa viết theo bằng tay, vừa đọc to âm "{readAs}" nhé." (lấy từ dữ liệu, không viết cứng). Người học viết theo bằng tay (trên bàn hoặc trong không khí) hoặc bằng chuột; app chỉ hiện hoạt hình hướng dẫn, không chấm đúng/sai.
  2. Nút **"Tuỳ chỉnh nét"** (biểu tượng bánh răng) mở một **popup** gồm: chọn **màu nét** (5 sắc xanh, lấy từ bảng màu trong DESIGN.md, ô đang chọn có dấu tích), thanh trượt **tốc độ vẽ** (số frame), thanh trượt **độ dày nét** (`stroke-width`), chọn **kiểu font nét** (Script Bay Bổng, Italic Nghiêng, Sans Hiện Đại, Mono Kỹ Thuật) và nút "Xong".
- Mặc định: màu nét theo loại âm, font Sans Hiện Đại. Mọi tuỳ chỉnh chỉ lưu trong state.
- Vào màn thì chữ hiện đầy đủ; hoạt hình và âm thanh **không tự chạy**.
- Khi `prefers-reduced-motion`: bỏ hoạt hình, hiện sẵn toàn bộ chữ (`finish()`) với số thứ tự nét tĩnh; nút "Phát lại" chỉ phát âm.

**Màn dấu thanh** (tab "Dấu thanh"):
- Hiện 4 thẻ từ `step1.tones`: huyền, sắc, hỏi, nặng. Mỗi thẻ có dấu thanh, tên dấu bằng chữ, từ ví dụ (cà, cá, cỏ, cọ) với dấu được nhấn mạnh, và nút nghe.
- Bấm thẻ thì phát từ đó. Người học nghe và quan sát dấu.

#### Bước 2: Guided Blending
- **Một màn duy nhất, không có nav con.** Hiện lưới 4 ô từ `step2.examples`: ca, co, cô, cà.
- Mỗi ô có phép ghép nhỏ phía trên ("c + a", "c + o", "c + ô", "ca + dấu huyền") và từ kết quả lớn ở giữa. Chữ tô màu theo loại âm.
- Dưới mỗi ô có nút **"Nghe"** (biểu tượng loa): phát lần lượt từng âm của phép ghép rồi phát cả tiếng (với ví dụ có dấu: phát tiếng gốc rồi tiếng có dấu). Âm thanh không tự phát khi vào màn.

#### Bước 3: Elkonin Boxes
Nội dung từ `step3.items`; mỗi phần tử là một bài tập, chuyển qua lại bằng nav con.
- Trên cùng: nút **"Nghe lại"** (biểu tượng loa). Vào bài tập thì tự phát từ một lần. **Không hiện chữ của từ.**
- **Hàng ghép:** [ô phụ âm] + [ô nguyên âm] → [ô kết quả]. Ba ô là hình vuông cùng kích thước; ô kết quả hiện "?" cho tới khi đúng. Phía trên ô nguyên âm có **ô "Dấu thanh"** riêng, hình vuông, nhỏ hơn.
- **Hàng chip âm:** mỗi chip là hình vuông, **kích thước đúng bằng ô trống** mà nó được kéo lên. Gồm chữ đúng và **âm gây nhiễu** từ `chips`, **trộn vị trí** mỗi lần vào bài tập. Chip nguyên âm và phụ âm khác màu.
- **Hàng dấu thanh:** 4 hình vuông nhỏ hơn chip âm (cùng kích thước ô "Dấu thanh"): huyền, sắc, hỏi, nặng, mỗi ô có dấu và tên dấu bằng chữ.
- Vào bài tập thì **tất cả chip và dấu đều chưa được kéo lên**.
- Thao tác (hỗ trợ cả ba cách): (1) kéo thả (Pointer Events); (2) click chip/dấu rồi click ô; (3) bàn phím: Tab tới chip/dấu, Enter để chọn, Tab/mũi tên tới ô, Enter để đặt. Chip đã kéo lên thì ở vị trí cũ hiện mờ; chip có thể lấy xuống hoặc thay bằng chip khác. Dấu thanh chỉ đặt được vào ô "Dấu thanh". Từ không có dấu thanh (`tone: null`) thì để trống ô này.
- **Chân trang gồm 3 nút:** "Bài tập trước", "Kiểm tra", "Bài tập tiếp theo".
  - "Kiểm tra" sáng khi cả hai ô âm đã có chip; mờ khi chưa.
  - **"Bài tập tiếp theo" chỉ sáng lên sau khi kiểm tra đúng.** Ở bài tập cuối, nút này đổi thành "Sang bước 4".
- **Kiểm tra đúng** (ô phụ âm, ô nguyên âm và ô dấu thanh khớp dữ liệu): ô kết quả hiện từ với dấu thanh trên nguyên âm, phát cả từ, hiện "Đúng rồi!" và dòng "Bạn hãy đọc to: {word}". Bài tập được đánh dấu tích trên nav con.
- **Kiểm tra chưa đúng:** hiện "Chưa đúng, mình nghe lại nhé." và tự phát lại từ; các chip giữ nguyên để người học chỉnh. Thử lại không giới hạn.

#### Bước 4: Independent Decoding
- Có 4 câu từ `step4.items`, nav con hiển thị "Câu 1 / 4". Vào câu thì tự phát âm cần nghe một lần, có nút "Nghe lại". Giao diện chỉ hiện "Đọc tiếng và chọn cách viết đúng", **không hiện** `heard` hay tên thanh để không lộ đáp án.
- Hiện 3 thẻ chữ từ `options` (ví dụ cà, cá, ca), chọn bằng click hoặc phím **1, 2, 3**.
- **Chọn đúng:** thẻ được đánh dấu tích, phát lại âm, hiện "Đúng rồi!" kèm từ đúng, rồi hiện nút sang câu tiếp.
- **Chọn chưa đúng:** thẻ đó được làm nhạt (không đỏ, không dấu X, không âm báo lỗi), hiện "Chưa đúng, mình nghe lại nhé." và **tự phát lại âm**. Cho chọn lại **không giới hạn**.

#### Màn kết thúc
- Thanh 4 bước: cả 4 bước đều có dấu tích. Không có nav con.
- Lời khen cố định, ấm áp, **không hiển thị điểm số**; tóm tắt "Hôm nay bạn đã học: âm a, c, o, ô; dấu huyền, sắc, hỏi, nặng." (lấy từ dữ liệu).
- Hai nút: **"Học lại"** (về Bước 1, xoá state) và **"Bài tiếp theo"** (Bài 02 chưa có nội dung nên hiện thông báo nhẹ "Bài này sắp có").
- Ghi chú trong code: `// TODO: gửi kết quả lên BE khi có API tiến độ`.

### 8.6 Âm thanh tạm
- **Âm thanh thật chưa có.** Agent tạo chỗ để file theo đường dẫn trong JSON và dùng file tạm (im lặng hoặc âm bíp rất ngắn) để chạy thử luồng. Nếu file thiếu: nút vẫn hiện, bấm thì hiện thông báo nhẹ "Chưa có file âm thanh" và ghi cảnh báo ở console, **không làm vỡ trang**.
- **Không dùng giọng tổng hợp của trình duyệt (Web Speech/TTS) làm bản chính**, vì phát âm vị và thanh điệu tiếng Việt thường không chuẩn. Giọng chuẩn sẽ là **thu âm người thật** (người dùng tự thu).
- Chỉ một âm phát tại một thời điểm.

### 8.7 Tiêu chí hoàn thành (checklist nghiệm thu)
- [ ] Trang truy cập được qua route theo quy ước routing của project và có đường dẫn từ trang chủ.
- [ ] Giao diện theo DESIGN.md, trông thuộc cùng một app với homepage.
- [ ] Sidebar liệt kê đủ 28 bài trong 7 chương và thu gọn được; chỉ Bài 01 mở được, bấm bài khác hiện thông báo nhẹ, không vỡ trang.
- [ ] Thanh 4 bước và thanh nav con có cùng vị trí, cùng kiểu ở mọi màn; không có đồng hồ, điểm phần trăm hay màn hình "thua".
- [ ] Bước 1: chữ đúng màu theo loại âm; nút "Phát lại" phát âm và chạy hoạt hình cùng lúc; Vivus vẽ xong từng nét rồi mới sang nét kế; chế độ giảm chuyển động hiển thị bản tĩnh.
- [ ] Bước 1: popup tuỳ chỉnh nét đổi được màu xanh, tốc độ, độ dày và 4 kiểu font; dùng được bằng bàn phím.
- [ ] Bước 1: tab "Dấu thanh" có 4 thẻ phát đúng từ, tên dấu hiện bằng chữ.
- [ ] Bước 2: lưới 4 từ, nút "Nghe" dưới mỗi ô phát đúng, không có nav con.
- [ ] Bước 3: chip và ô âm cùng kích thước hình vuông; dấu thanh là hình vuông nhỏ hơn; tất cả chưa kéo lên khi vào bài tập; có âm gây nhiễu; kéo thả, click-click và bàn phím đều hoạt động.
- [ ] Bước 3: "Bài tập tiếp theo" chỉ sáng sau khi kiểm tra đúng; ở bài tập cuối đổi thành "Sang bước 4"; nút "Nghe lại" phát lại từ; đúng/chưa đúng không dùng đỏ, dấu X hay âm báo lỗi.
- [ ] Bước 4: 4 câu chọn đúng/chưa đúng đúng hành vi mô tả, thử lại không giới hạn.
- [ ] Màn kết thúc không có điểm số; "Học lại" và "Bài tiếp theo" hoạt động.
- [ ] Mỗi màn vừa 1366×768 không cuộn dọc; không vỡ layout khi zoom 200%.
- [ ] Dùng được hoàn toàn bằng bàn phím.
- [ ] Thiếu file âm thanh không làm vỡ trang.
- [ ] Không sửa code BE và không làm hỏng chức năng user CRUD/homepage hiện có (kiểm tra diff).
- [ ] Thêm một bài mới chỉ cần thêm một file JSON bài học và dữ liệu glyph cho chữ mới (không sửa component).

### 8.8 Dữ liệu glyph nét đơn và Vivus.js
- **Thư viện:** Vivus.js, cài qua npm, dùng bản ổn định và ghi rõ phiên bản trong báo cáo. Lý do: vẽ từng nét nối tiếp theo thứ tự.
- **Dữ liệu glyph:** tự định nghĩa trong code FE (vị trí theo quy ước project), **không** dùng font viền rỗng ruột, **không** tải file font ngoài. Mỗi ký tự có dạng `{ "advance": số, "verified": false, "strokes": [ { "order": 1, "d": "..." } ] }`, chiều cao cố định; mỗi `d` đi dọc **đường giữa thân chữ**.
- **4 kiểu font** (mỗi kiểu một bộ glyph): `script` (Script Bay Bổng, viết tay mềm mại), `italic` (Italic Nghiêng), `sans` (Sans Hiện Đại, không chân, mặc định), `mono` (Mono Kỹ Thuật, nét đều, góc vuông).
- **Mỗi nhịp đưa bút là một `<path>` riêng** với `fill="none"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Thứ tự path trong DOM là thứ tự vẽ.
- **`viewBox`** tự tính từ tổng `advance` của chuỗi ký tự cần vẽ cộng lề. Nếu thiếu dữ liệu nét của ký tự thì hiện thông báo nhẹ "Chưa có nét cho chữ này", không vỡ trang.
- **Vivus:** `new Vivus(svg, { type: 'oneByOne', duration: <frame>, animTimingFunction: Vivus.LINEAR, start: 'manual' })`. Gia tốc cố định là `LINEAR` (nét đều), người học không được chọn. Nút "Phát lại" gọi `reset().play()`.
- **Khi đổi tuỳ chọn trong popup:** đổi kiểu font hoặc tốc độ thì huỷ instance cũ (`destroy()`), tạo lại và chạy lại hoạt hình (không phát âm). Đổi độ dày nét hoặc màu thì cập nhật thuộc tính SVG, không cần tạo lại.
- **Bài 01 bắt buộc có dữ liệu glyph** cho a, c, o, ô (chữ thường), cho cả 4 kiểu font (dấu mũ của ô là một nét riêng). Các chữ khác làm khi thêm bài.

---

## 9. Câu hỏi mở (người dùng cần quyết/nhờ chuyên môn xác nhận)

1. **Kiểu chữ viết dạy:** chữ in thường hay kiểu chữ viết chân phương theo mẫu chữ của Bộ GD&ĐT? Bài 01 mặc định Sans Hiện Đại (chữ in thường); các kiểu còn lại chỉ là tuỳ chọn.
2. **Thứ tự và hình dạng nét viết** của các glyph (`verified` đang là `false` trong dữ liệu glyph).
3. **Bài tập Bước 3** (cà, cò, cổ, ca) và chip gây nhiễu do nhóm đề xuất, chỉ dùng âm và dấu thanh của Bài 01, tránh trùng đáp án Bước 4 (cá, cỏ, cọ); cần xác nhận.
4. **Bước 2:** nút "Nghe" đang được hiểu là phát từng âm rồi cả tiếng, không có hoạt hình ghép chữ.
5. **Nguồn thu âm giọng chuẩn** (ai thu, định dạng, độ dài file).
6. **Cách gộp 28 bài từ sách Cánh Diều** (Mục 4) cần đối chiếu với sách giáo khoa; bài 137 "Vần ít gặp" chưa rõ nội dung.
7. **Đối tượng thử nghiệm:** 3-5 người dyslexia và một chuyên viên để góp ý sau khi Bài 01 chạy được.
8. **"Dùng tay/chuột viết theo nét chữ"** đang được hiểu là người học viết theo hoạt hình hướng dẫn, app không chấm đúng/sai.