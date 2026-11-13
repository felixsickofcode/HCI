# Quy ước chi tiết

## Backend

- Dependency wiring tập trung ở `app/api/deps.py`: service được tạo từ repository và `CurrentUser` là nguồn user đã xác thực.
- Endpoint chỉ nhận schema và gọi service, như `app/api/v1/endpoints/display_settings.py`.
- Service dùng `model_dump(exclude_unset=True)` cho PATCH user (`app/services/user_service.py`); PUT display settings tạo payload đầy đủ theo default (`app/services/display_settings_service.py`).
- Commit/rollback nằm ở repository; `IntegrityError` được service chuyển thành lỗi nghiệp vụ phù hợp.
- Schema trả JSON camelCase qua `app/schemas/base.py`; khi lưu display settings, service cũng lưu payload camelCase vào JSONB.

## Frontend

- Component dùng function component + TypeScript; route tập trung ở `frontend/src/App.tsx`.
- Gọi API qua `frontend/src/lib/api.ts` để dùng chung base URL, Bearer token và `ApiError`; không tạo fetch rải rác nếu không cần.
- Asset/mock dùng đường dẫn và module hiện có; không coi dữ liệu trong `frontend/src/mocks/` là dữ liệu production.

## Database/test

- Model mới phải được import tại `app/models/__init__.py` để `Base.metadata` và Alembic thấy đủ bảng.
- Test tích hợp dùng fixture `client` và `create_user` trong `tests/conftest.py`; database phải kết thúc bằng `_test`.
