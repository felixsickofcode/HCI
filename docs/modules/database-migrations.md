# Module database và migration

## Vai trò

`app/db/base.py` định nghĩa `Base`; `app/db/session.py` tạo engine/session từ `DATABASE_URL`; Alembic đọc metadata qua `alembic/env.py` và áp dụng các file trong `alembic/versions/`.

## Invariant và bẫy

- Luôn tạo migration cho thay đổi schema; không tạo bảng bằng tay.
- Model mới phải import tại `app/models/__init__.py` trước khi autogenerate.
- Chỉ nên có một head; kiểm tra bằng `python -m alembic heads` trước khi upgrade.
- Test dùng database riêng hậu tố `_test`, tự tạo nếu tài khoản PostgreSQL có quyền; không chạy test trên database development.
- Migration có thể tạo divergence khi hai nhánh cùng sinh từ một revision; cần rebase/điều chỉnh `down_revision` hoặc merge heads có chủ đích.

## Lệnh

`python -m alembic current`, `python -m alembic heads`, `python -m alembic upgrade head` đã được đối chiếu với hướng dẫn/ cấu hình repo; chưa chạy các lệnh migration trong phiên này vì không thay đổi schema.
