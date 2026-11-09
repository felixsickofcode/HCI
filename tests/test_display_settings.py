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


# --- Xác thực (giờ dùng Bearer token thật, FR-01 đã xong) --------------------


def test_missing_token_is_rejected(client):
    assert client.get(URL).status_code == 401


def test_invalid_token_is_rejected(client):
    headers = {"Authorization": "Bearer not-a-real-token"}
    assert client.get(URL, headers=headers).status_code == 401


def test_token_of_deleted_user_is_rejected(client, create_user):
    uid, headers = create_user()
    assert client.delete(f"/api/v1/users/{uid}").status_code == 204
    assert client.get(URL, headers=headers).status_code == 401


# --- Đọc / lưu ----------------------------------------------------------------


def test_get_before_any_save_returns_404(client, create_user):
    _, headers = create_user()
    response = client.get(URL, headers=headers)
    assert response.status_code == 404
    assert response.json() == {"detail": "Display settings not saved yet"}


def test_save_then_get_returns_same_settings(client, create_user):
    _, headers = create_user()

    saved = client.put(URL, json=CUSTOM, headers=headers)
    assert saved.status_code == 200
    assert saved.json()["version"] == 1
    assert saved.json()["display"] == CUSTOM["display"]

    fetched = client.get(URL, headers=headers)
    assert fetched.status_code == 200
    assert fetched.json() == saved.json()


def test_response_uses_camel_case_keys(client, create_user):
    _, headers = create_user()
    body = client.put(URL, json=CUSTOM, headers=headers).json()

    assert set(body) == {"version", "updatedAt", "display"}
    assert set(body["display"]) == set(DEFAULTS)
    assert set(body["display"]["focus"]) == {"enabled", "dimOpacity", "followPointer"}


def test_missing_fields_fall_back_to_defaults(client, create_user):
    _, headers = create_user()
    response = client.put(URL, json={"display": {"fontSize": 24}}, headers=headers)

    assert response.status_code == 200
    assert response.json()["display"] == {**DEFAULTS, "fontSize": 24}


def test_empty_display_saves_all_defaults(client, create_user):
    _, headers = create_user()
    response = client.put(URL, json={"display": {}}, headers=headers)

    assert response.status_code == 200
    assert response.json()["display"] == DEFAULTS


def test_saving_again_replaces_previous_settings(client, create_user):
    _, headers = create_user()
    first = client.put(URL, json=CUSTOM, headers=headers).json()
    second = client.put(
        URL, json={"display": {"fontFamily": "verdana"}}, headers=headers
    ).json()

    assert second["display"] == {**DEFAULTS, "fontFamily": "verdana"}
    assert second["updatedAt"] != first["updatedAt"]
    assert client.get(URL, headers=headers).json() == second


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
    _, headers = create_user()
    response = client.put(URL, json={"display": bad_display}, headers=headers)

    assert response.status_code == 422
    assert client.get(URL, headers=headers).status_code == 404


def test_boundary_values_are_accepted(client, create_user):
    _, headers = create_user()
    edge = {
        "fontSize": 16,
        "lineHeight": 2.5,
        "letterSpacing": 0,
        "columnWidth": 80,
        "focus": {"dimOpacity": 0.5},
    }
    assert client.put(URL, json={"display": edge}, headers=headers).status_code == 200


# --- Tách biệt giữa các người dùng --------------------------------------------


def test_settings_are_private_to_each_user(client, create_user):
    _, alice_headers = create_user()
    _, bob_headers = create_user()
    client.put(URL, json=CUSTOM, headers=alice_headers)

    assert client.get(URL, headers=bob_headers).status_code == 404

    client.put(URL, json={"display": {"theme": "mint"}}, headers=bob_headers)
    assert client.get(URL, headers=alice_headers).json()["display"]["theme"] == "dark"


# --- Đặt lại mặc định ---------------------------------------------------------


def test_reset_removes_saved_settings_and_is_idempotent(client, create_user):
    _, headers = create_user()
    client.put(URL, json=CUSTOM, headers=headers)

    assert client.delete(URL, headers=headers).status_code == 204
    assert client.get(URL, headers=headers).status_code == 404
    assert client.delete(URL, headers=headers).status_code == 204


# --- Ràng buộc database -------------------------------------------------------


def test_deleting_a_user_deletes_their_settings(client, create_user):
    uid, headers = create_user()
    client.put(URL, json=CUSTOM, headers=headers)

    assert client.delete(f"/api/v1/users/{uid}").status_code == 204

    with engine.connect() as conn:
        assert conn.scalar(text("SELECT count(*) FROM display_settings")) == 0

# --- Khớp với frontend (FR-03) ------------------------------------------------

@pytest.mark.parametrize("font", ["lexend", "arial", "verdana", "opendyslexic", "merriweather"])
def test_every_font_offered_by_frontend_is_accepted(client, create_user, font):
    _, headers = create_user()
    response = client.put(URL, json={"display": {"fontFamily": font}}, headers=headers)
    assert response.status_code == 200
    assert response.json()["display"]["fontFamily"] == font


@pytest.mark.parametrize("theme", ["cream", "mint", "blue", "dark", "navy"])
def test_every_theme_offered_by_frontend_is_accepted(client, create_user, theme):
    _, headers = create_user()
    response = client.put(URL, json={"display": {"theme": theme}}, headers=headers)
    assert response.status_code == 200
    assert response.json()["display"]["theme"] == theme


def test_removed_theme_soft_gray_is_rejected(client, create_user):
    _, headers = create_user()
    response = client.put(URL, json={"display": {"theme": "softGray"}}, headers=headers)
    assert response.status_code == 422


@pytest.mark.parametrize(
    "extreme",
    [
        {"fontSize": 16, "lineHeight": 1.5, "letterSpacing": 0, "columnWidth": 45},
        {"fontSize": 32, "lineHeight": 2.5, "letterSpacing": 0.2, "columnWidth": 75},
    ],
)
def test_frontend_slider_extremes_never_cause_422(client, create_user, extreme):
    _, headers = create_user()
    response = client.put(URL, json={"display": extreme}, headers=headers)
    assert response.status_code == 200