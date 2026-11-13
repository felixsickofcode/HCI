# Module auth và users

## Vai trò

Module này cung cấp CRUD user và JWT auth. Route nằm ở `app/api/v1/endpoints/users.py` và `auth.py`; nghiệp vụ ở `app/services/user_service.py`; xác thực request ở `app/api/deps.py`.

## File/hàm quan trọng

- `app/core/security.py`: `hash_password`, `verify_password`, `create_access_token`, `decode_token`.
- `app/api/deps.py`: `get_current_user`; từ chối thiếu/sai token hoặc user inactive.
- `app/services/user_service.py`: tạo user, kiểm tra email trùng, hash password, authenticate.
- `app/schemas/auth.py`, `app/schemas/user.py`: validation và response không chứa password.

## Invariant và bẫy

- Email unique; password lưu ở `hashed_password`, không trả ra API.
- JWT có `sub` là user id dạng chuỗi và `exp`; auth hiện dùng secret từ settings.
- Endpoint cần user hiện dùng `Authorization: Bearer <token>`, không dùng `X-User-Id`.
- User inactive cũng không được xác thực; xóa user làm token cũ bị từ chối khi lookup lại DB.

## Test

Chạy `python -m pytest`; các test auth/ownership hiện nằm trong `tests/test_display_settings.py` cùng với `tests/conftest.py`.
