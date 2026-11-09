# Module display settings

## Vai trò

Lưu một bộ cài đặt hiển thị cho mỗi user qua `GET/PUT/DELETE /api/v1/me/display-settings`. Route ở `app/api/v1/endpoints/display_settings.py`, nghiệp vụ ở `app/services/display_settings_service.py`.

## File/hàm quan trọng

- `app/schemas/display_settings.py`: default, range, Literal và `DISPLAY_SETTINGS_VERSION`.
- `app/models/display_settings.py`: bảng JSONB, khóa chính/ngoại `user_id`.
- `app/repositories/display_settings_repository.py`: get/create/update/delete.
- `frontend/src/lib/api.ts`: quy ước base URL/token dùng chung cho frontend.

## Invariant và bẫy

- PUT là replace toàn bộ; field thiếu được Pydantic điền default, không phải PATCH.
- API và JSONB dùng camelCase; Python field vẫn snake_case.
- Mỗi user tối đa một record; race khi tạo được service xử lý bằng retry đọc record sau `IntegrityError`.
- GET khi chưa lưu trả 404; DELETE idempotent và xóa record để frontend quay về default.
- Khi đổi shape settings phải tăng `DISPLAY_SETTINGS_VERSION` và xem xét migration/compatibility.

## Test

Chạy `python -m pytest tests/test_display_settings.py`; test bao phủ auth, default, range, replace, isolation, reset và cascade delete.
