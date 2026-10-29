import pytest
from sqlalchemy import text

from app.db.session import engine

URL = "/api/v1/me/display-settings"

CUSTOM = {
    "display": {
        "fontFamily": "arial",
        "fontSize": 24,
        "lineHeight": 2.0,
        "letterSpacing": 0.1,
        "theme": "dark",
        "columnWidth": 50,
        "focus": {"enabled": True, "dimOpacity": 0.7, "followPointer": True},
    }
}

DEFAULTS = {
    "fontFamily": "lexend",
    "fontSize": 20,
    "lineHeight": 1.8,
    "letterSpacing": 0.08,
    "theme": "cream",
    "columnWidth": 60,
    "focus": {"enabled": False, "dimOpacity": 0.6, "followPointer": False},
}


def as_user(user_id: int) -> dict:
    # TẠM THỜI (chờ FR-01): xác định user bằng header X-User-Id
    return {"X-User-Id": str(user_id)}


# --- Xác định người dùng (tạm thời) -----------------------------------------


def test_missing_user_header_is_rejected(client):
    assert client.get(URL).status_code == 422


def test_non_numeric_user_header_is_rejected(client):
    assert client.get(URL, headers={"X-User-Id": "abc"}).status_code == 422


def test_unknown_user_returns_404(client):
    response = client.get(URL, headers=as_user(999))
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}


# --- Đọc / lưu ----------------------------------------------------------------


def test_get_before_any_save_returns_404(client, create_user):
    response = client.get(URL, headers=as_user(create_user()))
    assert response.status_code == 404
    assert response.json() == {"detail": "Display settings not saved yet"}


def test_save_then_get_returns_same_settings(client, create_user):
    uid = create_user()

    saved = client.put(URL, json=CUSTOM, headers=as_user(uid))
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert saved.json()["display"] == CUSTOM["display"]

    fetched = client.get(URL, headers=as_user(uid))
    assert fetched.status_code == 200
    assert fetched.json() == saved.json()


def test_response_uses_camel_case_keys(client, create_user):
    uid = create_user()
    body = client.put(URL, json=CUSTOM, headers=as_user(uid)).json()

    assert set(body) == {"version", "updatedAt", "display"}
    assert set(body["display"]) == set(DEFAULTS)
    assert set(body["display"]["focus"]) == {"enabled", "dimOpacity", "followPointer"}


def test_missing_fields_fall_back_to_defaults(client, create_user):
    uid = create_user()
    response = client.put(URL, json={"display": {"fontSize": 24}}, headers=as_user(uid))

    assert response.status_code == 200
    assert response.json()["display"] == {**DEFAULTS, "fontSize": 24}


def test_empty_display_saves_all_defaults(client, create_user):
    uid = create_user()
    response = client.put(URL, json={"display": {}}, headers=as_user(uid))

    assert response.status_code == 200
    assert response.json()["display"] == DEFAULTS


def test_saving_again_replaces_previous_settings(client, create_user):
    uid = create_user()
    first = client.put(URL, json=CUSTOM, headers=as_user(uid)).json()
    second = client.put(
        URL, json={"display": {"fontFamily": "verdana"}}, headers=as_user(uid)
    ).json()

    # Thay toàn bộ: các trường không gửi quay về mặc định, không giữ giá trị cũ
    assert second["display"] == {**DEFAULTS, "fontFamily": "verdana"}
    assert second["updatedAt"] != first["updatedAt"]
    assert client.get(URL, headers=as_user(uid)).json() == second


# --- Kiểm tra dải giá trị -----------------------------------------------------


@pytest.mark.parametrize(
    "bad_display",
    [
        {"fontSize": 15},
        {"fontSize": 33},
        {"lineHeight": 1.4},
        {"lineHeight": 2.6},
        {"letterSpacing": -0.01},
        {"letterSpacing": 0.21},
        {"columnWidth": 29},
        {"columnWidth": 81},
        {"focus": {"dimOpacity": 0.49}},
        {"focus": {"dimOpacity": 0.81}},
        {"theme": "neon"},
        {"fontFamily": "comic-sans"},
        {"fontSize": "lớn"},
    ],
)
def test_out_of_range_or_unknown_values_are_rejected(client, create_user, bad_display):
    uid = create_user()
    response = client.put(URL, json={"display": bad_display}, headers=as_user(uid))

    assert response.status_code == 422
    # Lưu thất bại thì không được để lại dữ liệu
    assert client.get(URL, headers=as_user(uid)).status_code == 404


def test_boundary_values_are_accepted(client, create_user):
    uid = create_user()
    edge = {
        "fontSize": 16,
        "lineHeight": 2.5,
        "letterSpacing": 0,
        "columnWidth": 80,
        "focus": {"dimOpacity": 0.5},
    }
    assert client.put(URL, json={"display": edge}, headers=as_user(uid)).status_code == 200


# --- Tách biệt giữa các người dùng --------------------------------------------


def test_settings_are_private_to_each_user(client, create_user):
    alice, bob = create_user(), create_user()
    client.put(URL, json=CUSTOM, headers=as_user(alice))

    assert client.get(URL, headers=as_user(bob)).status_code == 404

    client.put(URL, json={"display": {"theme": "softGray"}}, headers=as_user(bob))
    assert client.get(URL, headers=as_user(alice)).json()["display"]["theme"] == "dark"


# --- Đặt lại mặc định ---------------------------------------------------------


def test_reset_removes_saved_settings_and_is_idempotent(client, create_user):
    uid = create_user()
    client.put(URL, json=CUSTOM, headers=as_user(uid))

    assert client.delete(URL, headers=as_user(uid)).status_code == 204
    assert client.get(URL, headers=as_user(uid)).status_code == 404
    # Gọi lại khi không còn gì để xóa vẫn thành công
    assert client.delete(URL, headers=as_user(uid)).status_code == 204


# --- Ràng buộc database -------------------------------------------------------


def test_deleting_a_user_deletes_their_settings(client, create_user):
    uid = create_user()
    client.put(URL, json=CUSTOM, headers=as_user(uid))

    assert client.delete(f"/api/v1/users/{uid}").status_code == 204

    with engine.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM display_settings")) == 0
