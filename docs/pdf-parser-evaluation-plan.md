# Kế hoạch đối chiếu parser PDF: pipeline hiện tại, PyMuPDF4LLM và Marker

Ngày lập: **2026-11-14**, múi giờ Asia/Bangkok. Cập nhật **2026-11-15**: đã có harness B0/P0/M0 và smoke test; xem [README benchmark](../benchmarks/pdf/README.md). Bộ mẫu/ground truth tiếng Việt và phép so sánh chất lượng chính thức vẫn chưa hoàn tất.

## 1. Quyết định và mục tiêu

Người dùng chốt ưu tiên đánh giá **PyMuPDF4LLM + Marker**, lấy pipeline hiện tại làm mốc. Công việc tiếp theo là thử nghiệm có thể tái lập và báo cáo bằng chứng trước khi quyết định tích hợp. FR-06 vẫn nằm trong kế hoạch sản phẩm nhưng triển khai sau đợt đánh giá này; tài liệu này không triển khai FR-06.

Câu hỏi cần trả lời:

1. Trên PDF tiếng Việt, phương án nào giữ chữ, dấu, thứ tự đọc và ranh giới đoạn tốt hơn?
2. Bảng, ảnh, biểu đồ và công thức còn đầy đủ, có thể đối chiếu nguồn và đọc trên điện thoại không?
3. Marker có thêm LLM cải thiện những lỗi cụ thể nào so với cùng cấu hình không thêm LLM, với thời gian/chi phí bao nhiêu?
4. Có nên giữ nguyên, sửa parser hiện tại, thay parser hoặc xử lý riêng một nhóm tài liệu?

Kết quả mong đợi là **báo cáo so sánh và quyết định có điều kiện**, không mặc định parser mới sẽ thắng. Vẻ đẹp thị giác phải được kiểm tra trên cùng renderer và cùng cài đặt; lỗi typography không được quy thành lỗi extraction.

## 2. Mốc code và phạm vi

### 2.1 Hiện trạng đã đọc

- Nhánh local khi lập kế hoạch: `feature/hong-quan`; HEAD `c1721b1182ef5a6d98b3939b9d2eb11edeecf9a8`. Working tree có thay đổi chưa commit, gồm việc gỡ chỉnh bố cục thủ công và đổi lightbox; HEAD không đại diện đầy đủ UI đang có.
- `app/services/text_extraction_service.py`: pypdf kiểm tra file/trang; quyết định OCR theo trang; Tesseract cho scan; parser tọa độ cho trang có chữ; ghép thành `ExtractionResult`.
- `app/services/layout_pdf.py`: pdfplumber lấy text/layout, PDFium chụp bảng/ảnh; parser hiện có bốn test trong `tests/test_layout_pdf.py`.
- `app/services/text_blocks.py`: `TextBlock`, parser text và `blocks_to_text`; schema API ở `app/schemas/text_extraction.py`.
- Frontend dùng `doc.blocks`, giữ file gốc trong phiên, render qua `ReadingText` và `SnapshotFigure`; tài liệu mất sau refresh. Không có chức năng sửa block thủ công.
- Mặc định hiện tại: upload 10 MB, PDF 100 trang, tối đa 10 trang OCR; snapshot 200 dpi, tối đa 8 triệu pixel/vùng. Đo lịch sử trên một PDF 5 trang không phải kết quả benchmark mới.

### 2.2 Phạm vi đợt thử

- Thêm công cụ offline, adapter, fixture, dữ liệu chuẩn và báo cáo. API đang dùng tiếp tục chạy pipeline hiện tại.
- Đánh giá PDF chữ, scan và mixed; ảnh rời, DOCX/EPUB/Markdown/LaTeX để sau.
- Giữ “Trang đọc” là mặc định, “Bản gốc” dùng đối chiếu; tiếp tục dùng snapshot khi cần bảo toàn bảng/hình.
- Chưa thay renderer sản phẩm, chưa tạo migration, queue, thư viện tài liệu hoặc tự động định tuyến parser trong runtime.
- Không phục hồi chức năng chỉnh bố cục; không cho LLM viết lại toàn bài để làm đẹp, sinh HTML/CSS cho trang đọc hoặc tự sửa nghĩa của tài liệu.

Trước lượt đo đầu, ghi `git rev-parse HEAD`, trạng thái working tree và SHA-256 các file baseline liên quan trong metadata. Lưu patch local nếu cần tái lập working tree; không đưa secret hoặc tài liệu cá nhân vào patch/báo cáo công khai. Nếu sửa baseline trong quá trình thử, tạo run mới cho mọi phương án trên cùng bộ mẫu; không ghi đè run cũ.

## 3. Nguồn public và điểm phải xác minh khi code

Đã đọc nguồn chính thức ngày 2026-11-14; đây là thông tin upstream, chưa xác nhận chạy thành công trên máy dự án.

| Phương án | Căn cứ | Việc cần xác minh ở bước đầu |
| --- | --- | --- |
| PyMuPDF4LLM / PyMuPDF | [Tổng quan](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) mô tả phân tích layout không cần GPU và output JSON/Markdown/text. [API](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/api.html) cho biết chức năng đã chuyển vào `Document` của PyMuPDF 2.x. [Repo](https://github.com/pymupdf/pymupdf4llm) hiện là package chuyển tiếp. | Chọn release cụ thể; xác nhận `Document.to_json()` và cấu trúc tọa độ/thứ tự đọc của release đó. Không viết adapter từ tutorial 1.x rồi giả định tương thích 2.x. |
| Marker | [README](https://github.com/datalab-to/marker#readme) mô tả output JSON, chế độ xử lý và `use_llm` tùy chọn. [Metadata package](https://github.com/datalab-to/marker/blob/master/pyproject.toml) dùng tên `marker-pdf`, có dependency model/inference. | Chọn release cụ thể, xem CLI/schema thật, chốt mode và backend chạy được trên máy. Không dùng mode mặc định theo thiết bị trong phép so sánh. |
| Phương pháp đánh giá | [OmniDocBench](https://github.com/opendatalab/OmniDocBench) đánh giá text, bảng, công thức và thứ tự đọc riêng. | Tham khảo cách chia tiêu chí; bộ mẫu tiếng Việt của dự án vẫn cần người xác nhận. Không lấy điểm benchmark upstream làm điểm của ứng dụng. |

Ghi URL/tag/commit nguồn cùng run; pin package và dependency sau khi smoke test. Kiểm tra giấy phép code, thành phần layout và model weights của **đúng phiên bản** trước lựa chọn tích hợp; không suy ra toàn bộ dependency có cùng giấy phép với repo chính. Đây là bước xác minh lựa chọn công cụ, không phải kết luận pháp lý.

## 4. Ma trận thử nghiệm

| Mã | Cấu hình | Vai trò |
| --- | --- | --- |
| B0 | `TextExtractionService.extract()` hiện tại, với config ghi lại đầy đủ | Baseline end-to-end, bao gồm OCR/mixed; không chỉ gọi `parse_layout_pdf()` cho mọi tài liệu |
| P0 | PyMuPDF/PyMuPDF4LLM release đã pin, layout/JSON, không thêm LLM hậu xử lý | Đối chiếu extraction/layout; OCR chỉ bật khi release và môi trường có hỗ trợ đã xác minh |
| M0 | Marker release đã pin, mode/backend/model cố định, `use_llm=false` | Đối chiếu Marker không thêm bước LLM tùy chọn |
| M1 | Giữ nguyên M0, chỉ bật bước LLM tùy chọn với provider/model/prompt cố định | Đo tác động riêng của LLM trên bộ trang khó được chốt trước |

`use_llm=false` không đồng nghĩa Marker hoàn toàn không dùng model ML/VLM; ghi mọi model OCR/layout/inference thực tế. Nếu cần đổi mode/backend để chạy M1, đặt mã cấu hình khác và chạy lại một cặp bật/tắt tương ứng; không gọi đó là phép đo tác động riêng của LLM trên M0.

Mỗi hàng báo riêng các nhóm PDF chữ/scan/mixed. P0 không OCR được thì ghi `unsupported` ở scan, không coi output rỗng là thành công, không âm thầm dùng Tesseract của B0. Nếu muốn thử P0 + Tesseract, thêm biến thể P1 có nhãn rõ, không thay định nghĩa P0 giữa chừng.

M1 thực hiện sau M0, khi đã ghi lựa chọn provider, quyền sử dụng bộ mẫu, giới hạn chi phí và cách đo usage. Chưa có các thông tin đó thì đánh dấu `not_run`, tiếp tục B0/P0/M0 và nêu rõ câu hỏi về LLM còn mở. Không tự chọn mặc định cloud hoặc tự gửi PDF cá nhân đi. Model chạy local cũng phải ghi model/version/backend và tài nguyên.

## 5. Môi trường và ranh giới công cụ

- Baseline dùng môi trường backend hiện tại. P0 và Marker dùng virtual environment riêng; không thêm dependency thử nghiệm vào `requirements.txt` của app ở vòng đầu.
- Harness gọi worker bằng đường dẫn interpreter và argument list; mỗi worker đọc tệp, ghi output JSON vào thư mục run, trả exit code. Không ghép lệnh shell từ tên file; không truyền PNG base64 lớn qua stdout.
- Ghi OS, Python, package freeze, CPU/RAM, GPU/VRAM nếu có, model revision, inference backend, OCR language, flags, DPI, seed nếu hỗ trợ và timeout. Tải model/setup tách khỏi thời gian parse.
- Smoke test CPU trước. Nếu dùng GPU/WSL/Docker, ghi thành cấu hình riêng; không gộp tốc độ với CPU. Không mặc định máy có CUDA hoặc Marker dùng được native Windows ngay.
- Chạy tuần tự ở vòng đầu để tránh tranh tài nguyên/PDFium. Không dừng server của người dùng hoặc thay môi trường đang chạy API.
- Phân biệt model cache với cache kết quả: warm run được giữ model đã tải/nạp theo cấu hình, nhưng phải thực sự parse lại input, không trả kết quả đã cache.
- Trạng thái chuẩn: `success`, `partial`, `unsupported`, `timeout`, `error`, `not_run`; lưu lỗi đã loại secret. File lỗi vẫn nằm trong mẫu số, không loại khỏi bảng tổng hợp.
- Giới hạn thử nghiệm ban đầu đề xuất: 300 giây/tài liệu ngắn, 900 giây/tài liệu dài, một worker; ngừng cả process tree khi timeout và ghi chi phí/usage có thể vẫn phát sinh ở provider. Đây là budget đo, không phải SLA hay timeout API. Chốt budget bộ nhớ/chi phí theo máy/provider trước chạy, giữ nguyên trong cùng đợt so sánh.

## 6. Bộ mẫu và dữ liệu chuẩn

### 6.1 Bộ chính đề xuất

Chuẩn bị khoảng **12 tài liệu ngắn, 20–30 trang**, có thể mang nhiều nhãn. Chốt manifest trước khi xem kết quả candidate; ghi rõ nhóm nào chưa có mẫu.

| Nhóm | Tình huống cần phủ | Điều cần đánh dấu thủ công |
| --- | --- | --- |
| Chữ đơn cột | Tiếng Việt có dấu, heading dài, danh sách, quote, đầu/chân trang | Text đúng; ranh giới đoạn; tiêu đề cần giữ và phần lặp được bỏ |
| Nhiều cột | Hai cột, heading/caption bắc qua cột, đổi bố cục giữa trang | Các cặp block phải đọc trước/sau; đoạn không được trộn cột |
| Bảng | Có viền, booktabs, không đường kẻ, hai bảng cùng chiều rộng | Vùng bảng/caption; giá trị quan trọng; chữ không được lặp ngoài bảng |
| Hình/biểu đồ | Ảnh raster, biểu đồ vector có chú giải | Vùng cần giữ, caption, nhãn/số liệu và vị trí trong luồng đọc |
| Công thức | Công thức độc lập và công thức giữa câu | Vùng công thức, liên kết câu xung quanh; không mất ký hiệu quan trọng |
| Scan/mixed | Scan tiếng Việt và PDF xen kẽ trang chữ/scan | Text được kiểm tra, ngôn ngữ OCR, trang khó, thứ tự xuyên trang |

Thêm một bài kiểm tra tài nguyên 30–50 trang, trong giới hạn upload hiện có, báo riêng với bộ chất lượng. Có thể sinh file lặp cho phép đo tài nguyên nhưng phải ghi là synthetic; không dùng nó để tuyên bố chất lượng trên 50 trang độc lập. Tài liệu vượt giới hạn OCR của B0 phải được ghi nhận là partial có chủ ý, không nâng giới hạn riêng cho một engine.

### 6.2 Manifest và ground truth

Khi kiểm tra workspace cuối phiên, đã thấy `sample_pdf/easy.pdf` (98.801 byte) và `sample_pdf/difficult.pdf` (1.292.423 byte). Dùng hai tệp này làm **ứng viên smoke test local đầu tiên** ở mốc A; phiên planning mới kiểm tra tên/kích thước, chưa mở nội dung, đếm trang hay xác nhận đúng mức dễ/khó. Cần phân loại thực tế, tính SHA-256 và kiểm tra quyền chia sẻ/gửi provider trước đưa vào manifest. Hai tệp đang untracked; không tự commit hoặc gửi ra ngoài. Chúng không thay thế bộ fixture có thể chia sẻ ở checkout mới.

Mỗi tài liệu có `caseId`, SHA-256, số trang, tập trang chấm, nhãn, nguồn/quyền sử dụng, phạm vi được gửi provider, kỳ vọng hỗ trợ và lý do nếu chỉ chấm một phần. Ground truth tạo trước khi xem output, từ PDF gốc có người kiểm tra; không dùng B0 làm đáp án đúng.

Ground truth theo trang gồm text tham chiếu, các block/vùng, quan hệ trước/sau, bảng/hình/caption và từ/số liệu quan trọng. Đánh dấu riêng header/footer được phép bỏ. Giữ dấu tiếng Việt, phủ định, số và đơn vị đo. Font tiếng Việt trong fixture tự sinh phải nhúng đúng và có quyền phân phối; fixture chữ Latin hiện tại chưa đủ chứng minh OCR tiếng Việt.

Không cắt tất cả PDF thành từng trang trước parse vì sẽ làm mất tín hiệu header/footer lặp và bảng xuyên trang. Engine xử lý cùng tài liệu đầu vào; chỉ giới hạn tập trang **chấm**. Nếu dùng bản rút gọn để giảm chi phí M1, tạo case riêng với ngữ cảnh/caption đủ và đo lại cặp bật/tắt trên cùng bản đó.

Fixture tự sinh hoặc được phép chia sẻ đặt trong repo; tài liệu cá nhân, output, model cache và ảnh QA giữ local, gitignore trước khi tạo. `test.pdf` có thể là case local bổ sung nhưng không là điều kiện để checkout mới chạy được. Không tải bộ mẫu lớn hoặc cài cả benchmark upstream chỉ để bắt đầu.

## 7. Output chung và adapter

Giữ hai tầng output cho mỗi run:

1. **Native:** JSON/text/ảnh nguyên bản của engine để truy vết lỗi.
2. **Normalized:** chuyển sang hợp đồng `TextBlock`/`ReadingBlockRead` hiện có để dùng cùng renderer; metadata đánh giá nằm trong sidecar, không thêm field API sản phẩm ở vòng đầu.

Quy tắc adapter:

- B0 giữ output hiện tại. Candidate tạo ID duy nhất, ổn định khi nhập lại cùng output; lưu mapping `nativeBlockId → normalizedBlockId`. ID không bắt buộc giống B0; matching giữa engine dựa ground truth, trang/vùng/text, không dựa equality ID.
- Chuyển paragraph/heading/list/quote bằng dữ liệu cấu trúc. Clamp heading về level 2/3 theo hợp đồng hiện có, ghi thông tin gốc trong sidecar. Không đưa toàn bộ Markdown qua regex `parse_blocks()` rồi coi là bảo toàn layout.
- Marker có thể chứa HTML và `content-ref` trong JSON: parse cấu trúc inert, resolve tham chiếu nội bộ có giới hạn, decode text/entity và giữ ranh giới dòng. Không render HTML upstream trực tiếp, không fetch tài nguyên từ HTML. Lưu kiểu block không hỗ trợ thay vì âm thầm bỏ.
- Chuẩn hóa `pageNumber` bắt đầu từ 1, bbox `[x0, top, x1, bottom]` theo PDF point. Xử lý scale, rotation, cropbox và polygon theo schema release đã pin. Thiếu bbox thì để thiếu, ghi coverage; không đoán từ vị trí chữ hoặc luôn dùng toàn trang rồi báo bbox đúng.
- Để so sánh trong renderer hiện tại, vùng bảng/hình/công thức không biểu diễn an toàn được sẽ chụp bằng PDFium dùng cùng thông số crop/DPI/giới hạn pixel như B0, khi có bbox hợp lệ. Công thức dùng snapshot image trong vòng này; nhãn công thức giữ ở sidecar, chưa cần thêm BlockType.
- Lưu bảng native ở sidecar, tách kết quả chất lượng nhận dạng bảng native khỏi chất lượng snapshot trong UI. Nếu native giữ được cell/row tốt, báo riêng để quyết định pha sau; không đổi renderer bảng riêng cho một engine trong phép QA chung.
- Snapshot/caption chỉ xuất hiện một lần trong luồng chính; tránh crop cắt chữ, trùng caption hoặc kéo paragraph bên cạnh vào ảnh. Bảng kéo qua trang giữ provenance từng phần; chưa gộp thành một ảnh có bbox giả trên một trang.
- `text` dẫn xuất từ chính blocks đã normalize, không từ một output text khác. Snapshot không có chữ vẫn được giữ. Thiếu alternative text phải hiện trong báo cáo accessibility.
- Nếu adapter không giữ được nội dung engine, ghi lỗi adaptation và lưu native để phân biệt với lỗi extraction. Không âm thầm thay output candidate bằng B0.

Sự khác nhau giữa native và normalized là một kết quả cần báo: candidate tốt ở native nhưng không ánh xạ được sang hợp đồng hiện tại chưa đủ điều kiện tích hợp. Thay đổi văn bản/ID sau normalize phải tạo phiên bản tài liệu mới trước khi dùng TTS/FR-06; không thay nội dung giữa phiên rồi giữ offset cũ.

## 8. Cách chấm và đo

### 8.1 Chất lượng nội dung

| Tiêu chí | Phép kiểm tra | Cách báo |
| --- | --- | --- |
| Text | CER `(S+D+I)/N` trên vùng text có ground truth; NFC và chuẩn whitespace theo rule cố định | Theo trang/nhóm; giữ dấu, chữ hoa/thường, số và dấu câu trong bản chấm chính; N=0 báo N/A |
| Nội dung thiếu/lặp/thêm | Kiểm tra các câu/số liệu quan trọng và đối chiếu text toàn trang | Liệt kê lỗi; không chỉ đếm tổng ký tự hoặc số block |
| Reading order | Tỉ lệ cặp trước/sau đúng trong những block match được | Báo cả coverage match và block mất; thiếu block không được biến thành điểm order hoàn hảo |
| Paragraph/heading/list | Ghép/tách đúng vùng và đúng loại theo ground truth | Đúng/sai theo case; có ví dụ cụ thể, không dùng số block làm đại diện chất lượng |
| Bảng/hình/công thức | Đủ vùng, caption đúng, không crop/lặp, đúng vị trí | Chấm snapshot UI; cấu trúc native chấm riêng nếu có dữ liệu chuẩn |
| Provenance/accessibility | Đúng trang/vùng, chữ thay thế, thứ tự TTS | Coverage và lỗi; snapshot đẹp chưa tương đương bảng ngữ nghĩa cho screen reader |

Để tránh tính sai do bảng, CER vùng văn bản chính không trộn text snapshot với thứ tự cell chưa được chuẩn hóa; text trong bảng có bộ kiểm tra nội dung riêng, và việc bỏ bảng vẫn là lỗi nghiêm trọng. Nếu có ground truth cấu trúc bảng mới dùng TEDS; B0 snapshot không có cell tree thì TEDS là N/A, không giả lập cây để lấy điểm.

Lưu cả raw text và text đã chuẩn hóa khi chấm. Quy tắc bỏ header/footer, nối gạch cuối dòng và line break phải công bố trước, áp dụng như nhau; có thể thêm điểm phụ với chuẩn hóa rộng hơn nhưng không thay điểm chính. Người kiểm tra xác nhận lỗi số liệu, công thức và phủ định; không dùng LLM làm trọng tài duy nhất.

### 8.2 Hiệu năng và chi phí

- Một cold run và ba warm run/tài liệu/cấu hình sau smoke test. Ghi rõ cold là process/model chưa nạp, không khẳng định OS disk cache đã được xóa.
- Đo elapsed time tổng gồm parse + normalize + render snapshot chung; lưu riêng từng phần nếu tách được. Setup/tải model, đo native-only và thời gian reviewer xem UI là các số riêng.
- Báo median và min–max warm, cold, giây/trang, peak RAM process tree, VRAM nếu đo được, tổng bytes ảnh và JSON/response. Nếu không đo được tài nguyên server/provider thì ghi unknown, không cộng số đo local như thể toàn hệ thống.
- Không báo p95 từ ba lần chạy. Không so trực tiếp số tốc độ quảng cáo của upstream với máy local.
- M1 ghi provider/model/version, prompt/config hash, trang/ảnh gửi, usage và chi phí thực nếu provider trả được; nếu chỉ ước tính, ghi cách ước tính và giới hạn. Lỗi/timeout vẫn có thể mất phí.

### 8.3 QA trên cùng trang đọc

Nhập normalized output của từng engine vào một harness chỉ dùng local, dùng lại `ReadingText`/`SnapshotFigure`. Không thêm selector parser vào UI sản phẩm hoặc endpoint công khai. Nếu cần route preview, chỉ bật dev và chỉ nhận fixture local đã chọn; kế hoạch file cụ thể ở mục 10.

Kiểm tra tại 390×844 và 1440×1000, cùng font/theme/cỡ chữ và cùng case: paragraph reflow, heading/list, font lớn/cột hẹp, theme tối, thứ tự TTS, zoom snapshot, bản gốc, focus bàn phím và tràn ngang. Ghi ảnh chụp thật kèm engine/run/case; ảnh PDF gốc là đối chiếu, không phải tiêu chí buộc trang đọc giống từng pixel.

## 9. Tiêu chí lựa chọn

Các ngưỡng sau là **đề xuất nghiệm thu vòng thử**, không phải chất lượng đã đạt:

1. Candidate được chọn phải chạy lặp lại, có config/version đầy đủ, chuyển được sang blocks và không tạo lỗi nghiêm trọng mới trên nhóm PDF đơn giản mà B0 đã xử lý đúng.
2. Lỗi nghiêm trọng gồm mất/thêm nội dung, đổi số/phủ định, đảo cột làm sai nghĩa, mất bảng/hình hoặc crop làm sai giá trị. Một lỗi loại này không được che bằng điểm trung bình đẹp hơn.
3. Trên tập khó đã chốt, mục tiêu giảm ít nhất 30% số lỗi nghiêm trọng so với B0 khi B0 có lỗi, đồng thời không tăng CER đáng kể ở nhóm sạch. Báo số đếm tuyệt đối; khi số lỗi nhỏ, ưu tiên review từng case và bổ sung mẫu, không khẳng định ý nghĩa thống kê từ phần trăm.
4. Chỉ coi M1 có lợi khi sửa được lỗi mà M0 còn mắc trên cùng input/config và không tạo lỗi nội dung mới; chi phí/độ trễ nằm trong budget đã chốt trước lượt chạy. Chưa có M1 thì chưa kết luận LLM giúp hay không giúp.
5. Có thể chọn riêng cho PDF chữ hoặc scan, nhưng nhóm lựa chọn phải nhận biết được trước khi chạy bằng quy tắc khả thi; không xây router dựa vào việc đã biết trước ground truth. Việc triển khai router là pha sau.
6. Báo cáo phải có kết quả UI, coverage, lỗi không hỗ trợ và chi phí môi trường. Chưa kiểm chứng Windows hoặc giấy phép/model thì đánh dấu điều kiện tích hợp còn mở.

Kết luận được phép: giữ B0; sửa một lỗi B0; đưa một candidate vào thử tích hợp; hoặc cần thêm mẫu. Không bắt buộc thay parser khi chưa có bằng chứng.

## 10. Thứ tự code và file dự kiến

Một phần đường dẫn dưới đây đã được tạo trong phiên code đầu. Ưu tiên module nhỏ theo trách nhiệm, chưa đưa framework plugin/parser tổng quát vào app.

| Mốc | Công việc | File dự kiến | Hoàn tất khi |
| --- | --- | --- | --- |
| A | Chốt mẫu, ground truth, môi trường, release/mode; smoke test tối thiểu mỗi candidate | `benchmarks/pdf/README.md`, `benchmarks/pdf/manifest.json`, `benchmarks/pdf/ground_truth/`, `benchmarks/pdf/requirements-*.txt`, `.gitignore` | Mẫu có nguồn và scope; mỗi tool có một output thật hoặc lỗi setup được ghi; dependency freeze theo môi trường |
| B | Harness, schema artifact, worker baseline, đo thời gian/tài nguyên | `benchmarks/pdf/run.py`, `benchmarks/pdf/contracts.py`, `benchmarks/pdf/workers/baseline.py` | B0 chạy offline không import app server/DB; ghi native/normalized/config/status; timeout cleanup hoạt động |
| C | Adapter P0 và M0, test tọa độ/text/table/caption | `benchmarks/pdf/workers/pymupdf.py`, `benchmarks/pdf/workers/marker.py`, `benchmarks/pdf/adapters/`, `tests/test_pdf_benchmark_adapters.py` | Output thật qua adapter giữ được block/provenance; lỗi chuyển đổi phân biệt rõ |
| D | Chấm chất lượng, tổng hợp số liệu, kiểm tra hai viewport | `benchmarks/pdf/evaluate.py`, `benchmarks/pdf/report.py`, harness dưới `frontend/src/dev/pdf-review/` nếu cần | Báo cáo B0/P0/M0 theo case/nhóm; QA dùng cùng renderer, không sửa flow sản phẩm |
| E | Thử M1 trên bộ khó và cặp đối chứng | Tham số worker Marker, config M1 local, test fake worker | Có provider/model/budget; kết quả M1 so đúng cặp, kèm usage và lỗi |
| F | Kết luận và đề xuất tích hợp có điều kiện | `docs/pdf-parser-evaluation-results.md`, cập nhật module/handoff | Đủ bằng chứng chọn/giữ/hoãn; chỉ rõ thay đổi sản phẩm cần làm ở phiên code sau |

Thứ tự bắt đầu phiên code: **A → B → C → D → E → F**. A chỉ smoke test để pin tool; các lượt đo chính thức phải chạy qua harness sau B/C. Có thể hoàn tất D và ghi E chưa chạy khi thiếu provider/budget, nhưng toàn bộ thử nghiệm LLM chưa được coi là hoàn tất.

Unit test offline dùng output nhỏ đã kiểm tra/synthetic, không gọi provider hay tải model. Smoke/benchmark thật là lệnh opt-in riêng, không chạy trong `pytest` mặc định. Nếu adapter test cần package nặng chỉ để import, tách parser JSON thuần khỏi worker để test không phụ thuộc môi trường Marker/PyMuPDF.

## 11. Artifact và cách chạy dự kiến

Đầu ra local theo cấu trúc:

```text
output/pdf-evaluation/<run-id>/
  environment.json
  manifest.snapshot.json
  <engine>/<case-id>/
    native/
    normalized.json
    provenance.json
    metrics.json
    status.json
    screenshots/
  summary.json
  report.md
```

Trước khi tạo output, thêm ignore có phạm vi cho `output/pdf-evaluation/`, corpus riêng tư và environment/model cache thử nghiệm. Manifest công khai dùng đường dẫn tương đối/ID; không có token, đường dẫn hồ sơ cá nhân hoặc nội dung riêng tư. Artifact native để local có thể chứa toàn văn; không log chúng ra stdout và không commit tự động.

Interface CLI dưới đây là **đề xuất cần hiện thực ở B–D, chưa phải lệnh đang chạy được**:

```powershell
python -m benchmarks.pdf.run --manifest benchmarks/pdf/manifest.json --engine baseline --config <local-config>
python -m benchmarks.pdf.run --manifest benchmarks/pdf/manifest.json --engine pymupdf --config <local-config>
python -m benchmarks.pdf.run --manifest benchmarks/pdf/manifest.json --engine marker --config <local-config>
python -m benchmarks.pdf.evaluate --run <run-directory>
```

`local-config` chỉ rõ interpreter worker, pinned mode, model/cache và resource budget. Key lấy từ biến môi trường, không đặt trực tiếp trong CLI/config được chia sẻ. Harness và worker có thể dùng Python khác nhau; metadata phải ghi cả hai.

Lệnh kiểm tra đã có trong repo, cần chạy khi code tương ứng:

```powershell
python -m pytest tests/test_text_blocks.py tests/test_layout_pdf.py
```

Sau khi thêm adapter tests, chạy thêm `python -m pytest tests/test_pdf_benchmark_adapters.py`; test mới mang marker `no_db`, không import router/deps tạo DB. Nếu đụng app backend, chạy suite phù hợp trên DB `_test`; không chạy migration vì đợt thử không đổi schema.

Nếu thêm harness React hoặc sửa renderer, chạy trong `frontend/`: `npm run test`, `npm run lint`, `npm run build`; thực hiện QA ảnh chụp thật ở hai viewport. Không cần lặp build/test ứng dụng chỉ vì chỉnh tài liệu kế hoạch.

## 12. Checklist sẵn sàng cho phiên code

- [x] Ghi fingerprint baseline từ working tree thực tế; không reset thay đổi có sẵn.
- [x] Có manifest mẫu công khai/synthetic chạy được ở checkout mới và danh sách mẫu local bổ sung.
- [ ] Có ground truth được kiểm tra và rule chấm text/order/table thống nhất.
- [x] Chốt package release, API/schema và mode cho P0/M0 sau smoke test; version/model revision được ghi trong artifact. Giới hạn tài nguyên đo chính thức còn cần chốt theo bộ mẫu.
- [ ] Chạy B0/P0/M0 trên cùng input, lưu native và normalized; báo partial/unsupported đúng nghĩa.
- [x] QA cùng renderer, cùng setting, cùng viewport trên hai PDF local; ghi lỗi quan sát được và nguồn native khi kiểm tra được. Xem [kết quả sơ bộ](pdf-parser-evaluation-results.md).
- [ ] M1 có provider/model/budget/phạm vi dữ liệu trước khi gửi; nếu chưa có ghi chưa chạy.
- [ ] Báo cáo kết luận theo nhóm tài liệu, các case thất bại và điều kiện tích hợp; cập nhật handoff.

Trạng thái 2026-11-15: đã chạy smoke B0/P0/M0 trên fixture synthetic và hai PDF local, viết adapter từ JSON thật. Hai PDF local chỉ được dùng tại máy; người dùng đã xác nhận các check trang gốc trong `benchmarks/pdf/local/ground_truth/` cho easy trang 2 và difficult trang 4, 6. Đây là điểm check giới hạn, chưa có CER toàn trang hoặc corpus đủ 12 tài liệu. Chưa QA cùng renderer hoặc đo cold/3 warm; pipeline sản phẩm và provider LLM chưa đổi.

Cập nhật cuối 2026-11-15: đã QA cùng renderer bằng Chrome ở 390×844 và 1440×1000 cho cả ba engine trên hai PDF local. Ảnh và metric giữ local; [báo cáo](pdf-parser-evaluation-results.md) ghi rõ lỗi hiển thị/nội dung. Chưa đo cold/3 warm; chưa đổi pipeline sản phẩm.
