# HCI Backend: Trợ lý đọc hiểu bao trùm đa hồ sơ cho tiếng Việt

Backend (FastAPI + PostgreSQL) của bài tập lớn môn **Tương tác người – máy (HCI)**:
*Multi-Profile Inclusive Reading Assistant for Vietnamese*.

Ứng dụng web giúp đọc văn bản tiếng Việt dễ chịu hơn: chuyển bài viết thành giao diện đọc tập trung, hỗ trợ nhiều hồ sơ đọc (đọc nhẹ nhàng, học tiếng Việt, đọc nhanh, chữ lớn), tùy chỉnh hiển thị, đọc to và tra từ ngay tại chỗ. Đây là công cụ hỗ trợ đọc theo triết lý thiết kế phổ quát, **không có chức năng chẩn đoán hay can thiệp y khoa**.

> Repo này hiện chứa **phần backend**. Frontend (React + TailwindCSS) đã nằm trong repo.

## Mục lục

1. [Công nghệ](#1-công-nghệ)
2. [Trạng thái chức năng](#2-trạng-thái-chức-năng)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cài đặt và chạy](#4-cài-đặt-và-chạy)
5. [Cơ sở dữ liệu và migration](#5-cơ-sở-dữ-liệu-và-migration)
6. [API hiện có](#6-api-hiện-có)
7. [Kiểm thử](#7-kiểm-thử)
8. [Quy ước làm việc nhóm](#8-quy-ước-làm-việc-nhóm)
9. [Việc còn tồn đọng và điểm cần chốt](#9-việc-còn-tồn-đọng-và-điểm-cần-chốt)
10. [Khắc phục sự cố](#10-khắc-phục-sự-cố)

---

## 1. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Ngôn ngữ, framework | Python, FastAPI, Uvicorn |
| Cơ sở dữ liệu | PostgreSQL (driver `psycopg` 3) |
| ORM, migration | SQLAlchemy 2, Alembic |
| Kiểm tra dữ liệu, cấu hình | Pydantic, pydantic-settings |
| Băm mật khẩu | pwdlib (argon2) |
| Kiểm thử | pytest, httpx (`TestClient` của FastAPI) |
| Frontend (dự kiến) | React.js, TailwindCSS, Web Speech API cho đọc to |

Đã chạy được với **Python 3.14 (Windows, 64-bit, cài từ python.org)** và **PostgreSQL 18**.

## 2. Trạng thái chức năng

---

## 🚀 Tính Năng Cốt Lõi (MVP & Nhánh `feature/fr-03`)

1. **Quản lý Người dùng & Xác thực (`FR-01`):**
   - Đăng ký, đăng nhập và quản lý phiên làm việc qua `AuthProvider`.
   - Hỗ trợ đồng bộ hóa hồ sơ cài đặt cá nhân trên máy chủ hoặc sử dụng chế độ khách (lưu trữ tức thì trên `localStorage`).
2. **Tùy chỉnh Hiển thị Chuyên biệt cho Dyslexia (`FR-03`):**
   - **Phông chữ thân thiện:** Hỗ trợ chuyển đổi mượt mà giữa `OpenDyslexic`, `Lexend`, `Arial`, và `Verdana`.
   - **Kiểm soát khoảng cách chống "Dính chữ" (Anti-Crowding):** Tùy chỉnh cỡ chữ (`16px – 36px`), độ giãn dòng (`1.2 – 3.0`), độ giãn chữ (`0.0em – 0.3em`) và giới hạn độ rộng cột đọc (`45ch – 75ch`, căn lề trái tuyệt đối).
   - **Bảng màu chống chói (Anti-Irlen / Visual Stress):** Loại bỏ nền trắng thuần gây mỏi mắt, cung cấp các chủ đề màu pastel đạt độ tương phản chuẩn WCAG (Vàng kem `#FBF0D9`, Xanh dịu `#E8F5E9`, Xanh dương nhạt `#EBF8FF`, và Chế độ tối `#1A202C`).
   - **Phản hồi tức thì (`NFR-03`):** Mọi thay đổi hiển thị có hiệu lực ngay lập tức trên giao diện đọc (`MinimalReadingView`) thông qua React Context & CSS Variables mà không cần tải lại trang.
3. **Chế độ Tập trung – Thước Đọc Bám Dòng (`FR-03 Focus Mode`):**
   - Tô sáng `100%` dòng văn bản đang đọc và làm mờ `70%` các dòng xung quanh để chống hiện tượng nhảy dòng (regression).
   - Hỗ trợ di chuyển tiêu điểm dòng bằng con trỏ chuột hoặc phím điều hướng `↑` / `↓`.
4. **Lưu & Đồng bộ Hồ sơ Cài đặt (`FR-05`):**
   - RESTful API `/api/v1/me/display-settings` cho phép lưu trữ, truy xuất và tự động áp dụng cấu hình hiển thị yêu thích của từng người dùng cho mọi bài đọc tiếp theo.

---

## 3. Cấu trúc thư mục

```
HCI/
├── app/                                      # Toàn bộ mã nguồn Backend (Clean Layered Architecture)
│   ├── main.py                               # Khởi tạo ứng dụng FastAPI, gắn router, xử lý lỗi chung, /health
│   ├── api/
│   │   ├── deps.py                           # Dependency Injection: DB session -> Repository -> Service -> Current User
│   │   └── v1/
│   │       ├── router.py                     # Gom các nhóm endpoint v1
│   │       └── endpoints/
│   │           ├── users.py                  # Quản lý người dùng (/users)
│   │           └── display_settings.py       # Quản lý cấu hình hiển thị (/me/display-settings)
│   ├── schemas/                              # Pydantic Schemas (kiểm tra kiểu và dải giá trị đầu vào/đầu ra)
│   │   ├── user.py
│   │   └── display_settings.py
│   ├── services/                             # Tầng xử lý luật nghiệp vụ (Business Logic)
│   │   ├── user_service.py
│   │   └── display_settings_service.py
│   ├── repositories/                         # Tầng truy xuất Database trực tiếp (Data Access Layer)
│   │   ├── user_repository.py
│   │   └── display_settings_repository.py
│   ├── models/                               # Định nghĩa bảng cơ sở dữ liệu (SQLAlchemy ORM)
│   │   ├── user.py
│   │   └── display_settings.py
│   ├── db/
│   │   ├── base.py                           # Lớp cha Base của toàn bộ SQLAlchemy models
│   │   └── session.py                        # Khởi tạo kết nối PostgreSQL & dependency get_db
│   └── core/
│       ├── config.py                         # Đọc cấu hình hệ thống từ biến môi trường (.env)
│       ├── exceptions.py                     # Định nghĩa ngoại lệ ứng dụng kèm mã HTTP chuẩn
│       └── security.py                       # Băm mật khẩu và xác thực bảo mật
├── alembic/                                  # Quản lý phiên bản và migration cho PostgreSQL
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── tests/                                    # Bộ kiểm thử tự động Backend
│   ├── conftest.py                           # Cấu hình fixture DB *_test và dọn dữ liệu sau mỗi test
│   └── test_display_settings.py              # Unit/Integration test cho API FR-03 Display Settings
├── frontend/                                 # Toàn bộ mã nguồn Frontend (React + TypeScript)
│   ├── design/                               # Bản thiết kế giao diện tĩnh (HTML, ảnh chụp màn hình & DESIGN.md)
│   ├── public/                               # Tài nguyên tĩnh (favicon.svg, icons.svg)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                       # Các component dùng chung: AudioPlayerCapsule, Badge, Button, Card, Input
│   │   │   └── layout/                       # Bố cục khung: Header, Footer
│   │   ├── context/                          # Quản lý trạng thái toàn cục (AuthProvider, DisplaySettings...)
│   │   ├── lib/
│   │   │   └── api.ts                        # Cấu hình HTTP client kết nối Backend FastAPI
│   │   ├── mocks/                            # Dữ liệu mẫu phục vụ phát triển (articles, navigation, pillars)
│   │   ├── screens/
│   │   │   ├── Auth/                         # Màn hình Đăng nhập / Đăng ký
│   │   │   ├── MinimalHomepage/              # Trang chủ tối giản & danh mục bài đọc
│   │   │   └── MinimalReadingView/           # Màn hình đọc văn bản chính tích hợp tùy chỉnh FR-03 & Focus Mode
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── .env.example                              # File mẫu cấu hình biến môi trường
├── alembic.ini                               # Cấu hình công cụ migration Alembic
├── pytest.ini                                # Cấu hình chạy kiểm thử Pytest
└── requirements.txt                          # Danh sách thư viện Python cần thiết
```

### Kiến trúc 4 lớp

Mỗi yêu cầu đi qua các lớp theo thứ tự, mỗi lớp một việc:

```
Trình duyệt / Swagger
        │  HTTP + JSON
        ▼
  endpoints/*.py   nhận yêu cầu, trả phản hồi (không chứa luật)
        │  (schemas/*.py kiểm tra dữ liệu vào; sai thì trả 422)
        ▼
  services/*.py    luật nghiệp vụ (trùng email? không tìm thấy? hash mật khẩu...)
        ▼
  repositories/*.py   đọc/ghi database
        ▼
  models/*.py  ->  PostgreSQL
```

`api/deps.py` tự tạo và truyền các đối tượng xuống (dependency injection), nên endpoint không phải tự mở kết nối. Lỗi nghiệp vụ là các lớp con của `AppError` (`core/exceptions.py`), `main.py` chuyển chúng thành JSON `{"detail": "..."}` cùng mã HTTP tương ứng.

## 4. Cài đặt và chạy

### 4.1. Cần cài trước

- **Git**
- **Python 3.12 trở lên, bản 64-bit từ [python.org](https://www.python.org/downloads/)** (tick *Add python.exe to PATH*). Không dùng Python đi kèm MSYS2/Cygwin, vì không cài được các thư viện dựng sẵn (như `psycopg-binary`).
- **PostgreSQL 16 trở lên**. Nhớ mật khẩu tài khoản `postgres`.

### 4.2. Tạo database

Trong pgAdmin 4 hoặc `psql`, tạo một database trống tên `hci_db` (chỉ tạo database, **không tạo bảng bằng tay**):

```sql
CREATE DATABASE hci_db;
```

### 4.3. Lấy mã nguồn và cài thư viện (Windows PowerShell)

```powershell
git clone https://github.com/felixsickofcode/HCI.git
cd HCI

python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Kiểm tra đang dùng đúng Python của venv (phải ra đường dẫn trong thư mục .venv\Scripts)
python -c "import sys; print(sys.executable)"

python -m pip install -r requirements.txt
```

- Nếu PowerShell không cho chạy script kích hoạt: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- macOS/Linux: `python3 -m venv .venv`, `source .venv/bin/activate`, `cp .env.example .env`.

### 4.4. Cấu hình `.env`

```powershell
copy .env.example .env
```

Mở `.env` (nằm cùng thư mục với `alembic.ini`) và sửa:

```
DATABASE_URL=postgresql+psycopg://postgres:MAT_KHAU_CUA_BAN@localhost:5432/hci_db
```

Mật khẩu có ký tự đặc biệt (`@ : / # ? %`) phải mã hóa, ví dụ `@` thành `%40`. **Không commit file** `.env` (đã nằm trong `.gitignore`).

### 4.5. Tạo bảng và chạy server

```powershell
alembic upgrade head
python -m uvicorn app.main:app --reload
```

- `alembic upgrade head` tạo toàn bộ bảng theo các file migration.
- Server chạy ở `http://127.0.0.1:8000`.
- **Trang Swagger** để xem và gọi thử API: `http://127.0.0.1:8000/docs`
- Kiểm tra sống: `http://127.0.0.1:8000/health` trả `{"status":"ok"}`.

> Nếu PowerShell báo `alembic`/`uvicorn` "is not recognized", hãy dùng dạng `python -m alembic ...` và `python -m uvicorn ...`, rồi kiểm tra lại bước kích hoạt venv (xem [mục 10](#10-khắc-phục-sự-cố)).

## 5. Cơ sở dữ liệu và migration

Hiện có hai bảng:

| Bảng | Nội dung |
|---|---|
| `users` | Người dùng: email (duy nhất), họ tên, mật khẩu đã băm, trạng thái, thời điểm tạo/sửa |
| `display_settings` | Cài đặt hiển thị đã lưu, **mỗi người một dòng**. Khóa chính là `user_id` (khóa ngoại tới `users.id`, xóa user thì xóa theo); cột `settings` kiểu JSONB |

Bảng `alembic_version` do Alembic tự tạo để nhớ database đang ở bước migration nào.

### Lệnh thường dùng

```powershell
alembic current                                   # database đang ở bước nào
alembic heads                                     # các "đầu" của chuỗi migration (phải đúng 1)
alembic upgrade head                              # áp dụng mọi migration mới
alembic downgrade -1                              # lùi một bước
alembic revision --autogenerate -m "mô tả ngắn"   # sinh migration từ thay đổi trong models/
```

### Quy tắc khi sửa cấu trúc database

1. **Tạo model mới thì phải thêm một dòng import vào** `app/models/__init__.py`**.** Nếu quên, `--autogenerate` sinh ra migration rỗng mà không báo lỗi.
2. **Luôn mở và đọc file migration vừa sinh** trước khi commit.
3. **Trước khi tạo migration:** `git pull origin main`, rồi `alembic heads` phải ra đúng **một** đầu.
4. **Hai người cùng tạo migration từ một bản gốc sẽ ra hai "đầu"** và `alembic upgrade head` báo `Multiple head revisions are present`. Người merge **sau** mở file migration của mình, đổi `down_revision` thành revision mới nhất của `main`, rồi chạy lại `alembic heads` cho đến khi chỉ còn một đầu. Hoặc dùng `alembic merge -m "merge heads" <rev_a> <rev_b>`.
5. Mỗi người dùng **database riêng trên máy mình**. Khi đổi nhánh mà gặp `Can't locate revision ...`, cách nhanh nhất là xóa và tạo lại `hci_db` rồi `alembic upgrade head`.

## 6. API hiện có

Tiền tố chung: `/api/v1`. Xem chi tiết và gọi thử ở `/docs`.

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/health` | Kiểm tra server sống |
| GET | `/api/v1/users` | Danh sách người dùng (`skip` mặc định 0, `limit` 1–100, mặc định 20) |
| POST | `/api/v1/users` | Tạo người dùng (201) |
| GET | `/api/v1/users/{user_id}` | Xem một người dùng |
| PATCH | `/api/v1/users/{user_id}` | Sửa một phần |
| DELETE | `/api/v1/users/{user_id}` | Xóa (204) |
| GET | `/api/v1/me/display-settings` | Lấy cài đặt hiển thị đã lưu (404 nếu chưa lưu) |
| PUT | `/api/v1/me/display-settings` | Lưu (thay toàn bộ) cài đặt hiển thị |
| DELETE | `/api/v1/me/display-settings` | Đặt lại mặc định = xóa bản đã lưu (luôn 204) |

### Quy ước phản hồi lỗi

| Mã | Khi nào | Dạng nội dung |
|---|---|---|
| 404 | Không tìm thấy (`User not found`, `Display settings not saved yet`) | `{"detail": "..."}` |
| 409 | Email đã đăng ký (`Email already registered`) | `{"detail": "..."}` |
| 422 | Dữ liệu sai định dạng hoặc ngoài dải cho phép | Danh sách lỗi chuẩn của FastAPI |

### Người dùng (`users`)

Tạo người dùng gửi `{"email": "...", "full_name": "...", "password": "..."}` (mật khẩu 8–128 ký tự). Phản hồi không bao giờ chứa mật khẩu.

### Cài đặt hiển thị (`me/display-settings`)

**Xác định người dùng (TẠM THỜI, chờ FR-01):** hiện đọc id từ header `X-User-Id`. Cách này **không an toàn** (ai cũng giả danh được), chỉ dùng khi phát triển. Header thiếu hoặc không phải số thì 422; id không tồn tại thì 404. Khi FR-01 xong chỉ cần thay thân hàm `get_current_user_id` trong `app/api/deps.py`, endpoint và URL giữ nguyên.

Ví dụ lưu (`PUT /api/v1/me/display-settings`), các trường **không gửi sẽ lấy giá trị mặc định**:

```json
{
  "display": {
    "fontFamily": "lexend",
    "fontSize": 24,
    "lineHeight": 1.8,
    "letterSpacing": 0.08,
    "theme": "cream",
    "columnWidth": 60,
    "focus": { "enabled": true, "dimOpacity": 0.6, "followPointer": false }
  }
}
```

Phản hồi có thêm `version` và `updatedAt`:

```json
{ "version": 1, "updatedAt": "2026-10-28T11:30:00Z", "display": { "...": "như trên" } }
```

| Trường | Giá trị cho phép | Mặc định |
|---|---|---|
| `fontFamily` | `lexend`, `arial`, `verdana`, `opendyslexic` | `lexend` |
| `fontSize` (px) | số nguyên 16 – 32 | 20 |
| `lineHeight` (lần) | 1,5 – 2,5 | 1,8 |
| `letterSpacing` (em) | 0 – 0,2 | 0,08 |
| `theme` | `cream`, `softGray`, `dark` | `cream` |
| `columnWidth` (ký tự) | số nguyên 30 – 80 | 60 |
| `focus.enabled` | `true` / `false` | `false` |
| `focus.dimOpacity` | 0,5 – 0,8 | 0,6 |
| `focus.followPointer` | `true` / `false` | `false` |

Lưu ý: JSON của `display-settings` dùng **camelCase**; PUT là **thay toàn bộ**, không phải sửa một phần.

## 7. Kiểm thử

```powershell
python -m pytest
```

- Cần PostgreSQL đang chạy.
- Test dùng database riêng tên `<tên database của bạn>_test` (ví dụ `hci_db_test`), **tự tạo nếu chưa có**. Dữ liệu phát triển của bạn không bị đụng tới. Tài khoản trong `.env` cần quyền tạo database (tài khoản `postgres` có sẵn quyền này).
- Có thể chỉ định database test khác bằng biến môi trường `TEST_DATABASE_URL` (tên database **phải kết thúc bằng** `_test`, nếu không test từ chối chạy).
- Sau mỗi test, mọi bảng được dọn sạch nên các test độc lập nhau.
- Khi thêm tính năng mới, viết test trong `tests/test_<tên_tính_năng>.py`, dùng fixture `client` và `create_user` trong `conftest.py`.

## 8. Quy ước làm việc nhóm

### Git

- Không làm trực tiếp trên `main`. Mỗi chức năng một nhánh: `feature/<mã-fr>-<tên-ngắn>`, ví dụ `feature/fr-05-settings-api`.
- Trước khi tách nhánh: `git pull origin main`. Trong lúc làm: thường xuyên `git fetch origin` rồi `git merge origin/main` vào nhánh của mình để tránh xung đột lớn về sau.
- Commit theo dạng `loại(phạm-vi): mô tả ngắn`, với loại là `feat`, `fix`, `docs`, `test`, `chore`, `refactor`. Ví dụ: `feat(display-settings): add per-user display settings API`.
- Mở Pull Request vào `main` và nhờ ít nhất một bạn review chéo trước khi merge.
- Trước khi commit chạy `git status` và chắc chắn **không có** `.env` trong danh sách.

### Các file chung dễ xung đột

`app/api/deps.py`, `app/api/v1/router.py`, `app/core/exceptions.py`, `app/models/__init__.py` và chuỗi migration trong `alembic/versions/` đều do nhiều người cùng sửa. Báo trong nhóm trước khi sửa lớn, và khi gộp xung đột thì **giữ cả hai phía**.

### Thêm một tính năng backend mới (theo khuôn đang có)

1. `app/models/<ten>.py` và thêm một dòng import vào `app/models/__init__.py`
2. Migration (`alembic revision --autogenerate`), đọc lại, kiểm tra `alembic heads`
3. `app/schemas/<ten>.py` (dải giá trị, mặc định)
4. `app/repositories/<ten>_repository.py` (chỉ đọc/ghi DB)
5. `app/services/<ten>_service.py` (luật nghiệp vụ, ném lỗi từ `core/exceptions.py`)
6. `app/api/deps.py` (hàm lắp ráp service) và `app/api/v1/endpoints/<ten>.py`
7. Đăng ký router trong `app/api/v1/router.py`
8. `tests/test_<ten>.py`, chạy `python -m pytest`

## 9. Khắc phục sự cố

| Thông báo | Nguyên nhân và cách sửa |
|---|---|
| `'alembic' is not recognized`, `'uvicorn' is not recognized` | Chưa kích hoạt venv đúng, hoặc chưa cài thư viện. Dùng `python -m alembic ...` / `python -m uvicorn ...` và kiểm tra `python -c "import sys; print(sys.executable)"` phải ra đường dẫn trong `.venv\Scripts` của dự án |
| `No matching distribution found for psycopg-binary` | Python đang dùng không phải bản Windows chuẩn của python.org (ví dụ của MSYS2, hoặc venv của dự án khác mà terminal tự kích hoạt). Xóa `.venv`, tạo lại bằng Python python.org và dùng đường dẫn đầy đủ tới `python.exe` |
| `ModuleNotFoundError: No module named 'pydantic_settings'` | `python -m pip install pydantic-settings` |
| `ValidationError ... DATABASE_URL Field required` | Chưa có `.env`, hoặc `.env` không nằm cùng thư mục với `alembic.ini`, hoặc chạy lệnh từ thư mục khác |
| `password authentication failed for user "postgres"` | Sai mật khẩu trong `.env` (nhớ mã hóa ký tự đặc biệt) |
| `database "hci_db" does not exist` | Chưa tạo database (mục 4.2) |
| `connection refused` / `could not connect to server` | PostgreSQL chưa chạy: mở *Services* trên Windows, tìm dịch vụ `postgresql-x64-...` và Start; hoặc sai cổng |
| `Multiple head revisions are present` | Hai migration cùng nối vào một bản gốc, xem [mục 5](#5-cơ-sở-dữ-liệu-và-migration) quy tắc 4 |
| `Can't locate revision identified by '...'` | Database còn dấu vết migration từ nhánh khác; xóa và tạo lại database rồi `alembic upgrade head` |
| `pytest`: `permission denied to create database` | Tài khoản trong `.env` không có quyền tạo database; tự tạo `hci_db_test` bằng pgAdmin |
| `pytest`: `No module named 'app'` | Chạy `python -m pytest` từ thư mục gốc repo (nơi có `pytest.ini`) |
| Cổng 8000 đã bận | `python -m uvicorn app.main:app --reload --port 8001` |
