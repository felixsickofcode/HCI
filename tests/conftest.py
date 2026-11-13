"""Cấu hình chung cho test.

Test chạy trên một database RIÊNG tên `<tên database của bạn>_test`
(ví dụ hci_db -> hci_db_test), tự tạo nếu chưa có. Dữ liệu phát triển của bạn
không bị đụng tới.

Địa chỉ database lấy theo thứ tự:
  1. biến môi trường TEST_DATABASE_URL (tên database phải kết thúc bằng `_test`)
  2. DATABASE_URL trong biến môi trường hoặc file .env, tự thêm hậu tố `_test`

Test được đánh dấu `no_db` (ví dụ parser thuần) sẽ bỏ qua toàn bộ thiết lập
database, nên chạy được mà không cần PostgreSQL.
"""
import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def _test_database_url() -> str:
    explicit = os.environ.get("TEST_DATABASE_URL")
    if explicit:
        url = make_url(explicit)
    else:
        raw = os.environ.get("DATABASE_URL")
        env_file = Path(__file__).resolve().parents[1] / ".env"
        if not raw and env_file.exists():
            for line in env_file.read_text(encoding="utf-8-sig").splitlines():
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    raw = line.split("=", 1)[1].strip().strip("\"'")
                    break
        if not raw:
            raise RuntimeError("Không tìm thấy DATABASE_URL (biến môi trường hoặc file .env)")
        url = make_url(raw)
        if not url.database.endswith("_test"):
            url = url.set(database=f"{url.database}_test")
    if not url.database.endswith("_test"):
        raise RuntimeError("TEST_DATABASE_URL phải trỏ tới database có tên kết thúc bằng '_test'")
    return url.render_as_string(hide_password=False)


def _ensure_database_exists(test_url: str) -> None:
    url = make_url(test_url)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    try:
        with admin.connect() as conn:
            exists = conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": url.database}
            )
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def _schema():
    test_url = _test_database_url()
    # Phải đặt TRƯỚC khi import `app`, vì app đọc DATABASE_URL ngay lúc import.
    os.environ["DATABASE_URL"] = test_url

    import app.models  # noqa: F401  (để Base.metadata biết hết các bảng)
    from app.db.base import Base
    from app.db.session import engine

    assert engine.url.database.endswith("_test"), "Từ chối chạy test trên database không phải *_test"
    _ensure_database_exists(test_url)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tables(request):
    """Sau mỗi test DB, xóa sạch dữ liệu để các test không ảnh hưởng nhau."""
    if request.node.get_closest_marker("no_db"):
        yield
        return

    request.getfixturevalue("_schema")

    from app.db.base import Base
    from app.db.session import engine

    yield
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def client(_schema):
    from fastapi.testclient import TestClient

    from app.main import app as fastapi_app

    return TestClient(fastapi_app)


@pytest.fixture
def create_user(client):
    """Tạo user qua API, đăng nhập lấy token. Trả về (user_id, headers)."""
    counter = {"n": 0}

    def _create(email: str | None = None) -> tuple[int, dict]:
        counter["n"] += 1
        email = email or f"user{counter['n']}@example.com"
        password = "password123"
        response = client.post(
            "/api/v1/users",
            json={"email": email, "full_name": "Test User", "password": password},
        )
        assert response.status_code == 201, response.text
        user_id = response.json()["id"]

        login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]
        return user_id, {"Authorization": f"Bearer {token}"}

    return _create
