"""Cấu hình chung cho test.

Test chạy trên một database RIÊNG tên `<tên database của bạn>_test`
(ví dụ hci_db -> hci_db_test), tự tạo nếu chưa có. Dữ liệu phát triển của bạn
không bị đụng tới.

Địa chỉ database lấy theo thứ tự:
  1. biến môi trường TEST_DATABASE_URL (tên database phải kết thúc bằng `_test`)
  2. DATABASE_URL trong biến môi trường hoặc file .env, tự thêm hậu tố `_test`
"""
import os
from pathlib import Path

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


# Phải đặt TRƯỚC khi import `app`, vì app đọc DATABASE_URL ngay lúc import.
TEST_URL = _test_database_url()
os.environ["DATABASE_URL"] = TEST_URL

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402,F401  (để Base.metadata biết hết các bảng)
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402


def _ensure_database_exists() -> None:
    url = make_url(TEST_URL)
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


@pytest.fixture(scope="session", autouse=True)
def _schema():
    assert engine.url.database.endswith("_test"), "Từ chối chạy test trên database không phải *_test"
    _ensure_database_exists()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tables():
    """Sau mỗi test, xóa sạch dữ liệu để các test không ảnh hưởng nhau."""
    yield
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def client():
    return TestClient(fastapi_app)


@pytest.fixture
def create_user(client):
    """Trả về hàm tạo user qua API và cho biết id."""
    counter = {"n": 0}

    def _create(email: str | None = None) -> int:
        counter["n"] += 1
        response = client.post(
            "/api/v1/users",
            json={
                "email": email or f"user{counter['n']}@example.com",
                "full_name": "Test User",
                "password": "password123",
            },
        )
        assert response.status_code == 201, response.text
        return response.json()["id"]

    return _create
