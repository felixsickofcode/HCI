from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update

URL = "/api/v1/me/vocabulary"
DRAFT = {
    "term": "sinh học", "meaning": "Môn học về sự sống", "example": "Em thích sinh học.",
    "contextText": "Em học sinh học.", "sourceDocumentId": "doc-1", "sourceTitle": "Bài đọc",
    "sourceKind": "paste", "segmentId": "paragraph-0", "start": 7, "end": 15,
}


def test_save_duplicate_and_read(client, create_user):
    _, headers = create_user()
    response = client.post(URL, json=DRAFT, headers=headers)
    assert response.status_code == 201, response.text
    entry = response.json()
    assert entry["term"] == DRAFT["term"]
    assert "userId" not in entry and "dedupeKey" not in entry
    duplicate = client.post(URL, json={**DRAFT, "meaning": "Changed"}, headers=headers)
    assert duplicate.status_code == 200
    assert duplicate.json() == entry  # Saving again never silently overwrites the user's note.
    page = client.get(URL, headers=headers).json()
    assert page == {"items": [entry], "total": 1, "skip": 0, "limit": 20, "libraryTotal": 1, "lastRemoved": None}


def test_same_word_different_context_is_separate(client, create_user):
    _, headers = create_user()
    client.post(URL, json=DRAFT, headers=headers)
    response = client.post(URL, json={**DRAFT, "contextText": "Em học sinh học rất vui."}, headers=headers)
    assert response.status_code == 201
    assert client.get(URL, headers=headers).json()["total"] == 2


@pytest.mark.parametrize("method,path", [("get", ""), ("get", "/sources"), ("post", ""), ("delete", ""), ("delete", "/1")])
def test_requires_auth(client, method, path):
    args = {"json": DRAFT} if method == "post" else {}
    assert getattr(client, method)(URL + path, **args).status_code == 401


def test_ownership_isolation_and_clear(client, create_user):
    _, alice = create_user()
    _, bob = create_user()
    entry = client.post(URL, json=DRAFT, headers=alice).json()
    assert client.get(URL, headers=bob).json()["total"] == 0
    assert client.get(URL + "/sources", headers=bob).json() == []
    assert client.delete(f'{URL}/{entry["id"]}', headers=bob).status_code == 404
    assert client.delete(URL, headers=bob).status_code == 204
    assert client.get(URL, headers=alice).json()["total"] == 1
    assert client.delete(URL, headers=alice).status_code == 204
    assert client.delete(URL, headers=alice).status_code == 204
    assert client.get(URL, headers=alice).json()["total"] == 0


@pytest.mark.parametrize("change", [
    {"userId": 9}, {"createdAt": "2026-01-01T00:00:00Z"}, {"term": " "}, {"term": "x" * 121},
    {"contextText": "x" * 4001}, {"meaning": "x" * 2001}, {"start": 6}, {"end": 16},
    {"start": None}, {"segmentId": None}, {"start": True}, {"term": "other"},
    {"sourceKind": "unknown"}, {"contextText": "bad\u0000text"}, {"meaning": "bad\u0000text"},
])
def test_rejects_invalid_input(client, create_user, change):
    _, headers = create_user()
    assert client.post(URL, headers=headers, json={**DRAFT, **change}).status_code == 422
    assert client.get(URL, headers=headers).json()["total"] == 0


def test_optional_meaning_and_utf16_range(client, create_user):
    _, headers = create_user()
    draft = {**DRAFT, "meaning": None, "contextText": "🌱 Em học sinh học.", "start": 10, "end": 18}
    response = client.post(URL, json=draft, headers=headers)
    assert response.status_code == 201, response.text
    assert response.json()["meaning"] is None
    # A range splitting an emoji must be rejected.
    assert client.post(URL, json={**draft, "start": 1, "end": 2, "term": "x"}, headers=headers).status_code == 422


def test_search_sources_dates_and_pagination(client, create_user):
    from app.db.session import SessionLocal
    from app.models.vocabulary import VocabularyEntry

    _, headers = create_user()
    entry = client.post(URL, json=DRAFT, headers=headers).json()
    client.post(URL, json={"term": "đường", "contextText": "Con đường", "sourceDocumentId": "doc-2", "sourceTitle": "Bài khác"}, headers=headers)
    with SessionLocal() as db:
        db.execute(update(VocabularyEntry).values(created_at=datetime(2026, 11, 13, 17, tzinfo=timezone.utc)))
        db.execute(update(VocabularyEntry).where(VocabularyEntry.id == entry["id"]).values(
            created_at=datetime(2026, 11, 12, 17, tzinfo=timezone.utc)))
        db.commit()
    page = client.get(URL, params={"q": " SINH HỌC ", "sourceDocumentId": "doc-1",
        "from": "2026-11-13T00:00:00+07:00", "to": "2026-11-14T00:00:00+07:00"}, headers=headers).json()
    assert page["total"] == 1
    assert page["items"][0]["id"] == entry["id"]
    assert client.get(URL, params={"to": "2026-11-12T17:00:00Z"}, headers=headers).json()["total"] == 0
    assert client.get(URL, params={"q": "%"}, headers=headers).json()["total"] == 0
    assert client.get(URL, params={"skip": 1, "limit": 1}, headers=headers).json()["total"] == 2
    assert len(client.get(URL, params={"skip": 1, "limit": 1}, headers=headers).json()["items"]) == 1
    assert len(client.get(URL + "/sources", headers=headers).json()) == 2
    assert client.get(URL, params={"from": "2026-11-14T00:00:00Z", "to": "2026-11-13T00:00:00Z"}, headers=headers).status_code == 422
    assert client.get(URL, params={"from": "2026-11-14T00:00:00"}, headers=headers).status_code == 422
    assert client.get(URL, params={"limit": 101}, headers=headers).status_code == 422


def test_concurrent_saves_are_idempotent(client, create_user):
    from app.main import app

    _, headers = create_user()
    def save(_):
        with TestClient(app) as other_client:
            return other_client.post(URL, json=DRAFT, headers=headers)
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(executor.map(save, range(4)))
    assert sorted(r.status_code for r in responses) == [200, 200, 200, 201]
    assert len({r.json()["id"] for r in responses}) == 1
    assert client.get(URL, headers=headers).json()["total"] == 1


def test_user_crud_cannot_bypass_vocabulary_privacy(client, create_user):
    from app.db.session import SessionLocal
    from app.models.vocabulary import VocabularyEntry

    alice_id, alice = create_user()
    bob_id, bob = create_user()
    client.post(URL, json=DRAFT, headers=alice)
    for path in ["/api/v1/users", f"/api/v1/users/{alice_id}"]:
        assert client.get(path).status_code == 401
    assert client.get(f"/api/v1/users/{alice_id}", headers=bob).status_code == 404
    assert client.patch(f"/api/v1/users/{alice_id}", json={"password": "stolenpassword"}, headers=bob).status_code == 404
    assert client.delete(f"/api/v1/users/{alice_id}", headers=bob).status_code == 404
    assert [u["id"] for u in client.get("/api/v1/users", headers=bob).json()] == [bob_id]
    assert client.delete(f"/api/v1/users/{alice_id}", headers=alice).status_code == 204
    with SessionLocal() as db:
        assert db.scalar(select(VocabularyEntry).where(VocabularyEntry.user_id == alice_id)) is None
    assert client.get(URL, headers=alice).status_code == 401


def test_notes_and_persistent_undo_belong_to_owner(client, create_user):
    _, alice = create_user()
    _, bob = create_user()
    original = client.post(URL, json=DRAFT, headers=alice).json()
    path = f'{URL}/{original["id"]}'
    assert client.patch(path, headers=bob, json={"meaning": "wrong"}).status_code == 404
    assert client.patch(path, headers=alice, json={"meaning": "x\0x"}).status_code == 422
    edited = client.patch(path, headers=alice, json={"meaning": "  Ghi chú mới  "}).json()
    assert edited == {**original, "meaning": "Ghi chú mới"}
    assert client.delete(path + "?undoable=true", headers=alice).status_code == 204
    shelf = client.get(URL, headers=alice).json()
    assert shelf["total"] == 0 and shelf["lastRemoved"] == {"id": original["id"], "term": DRAFT["term"]}
    assert client.get(URL + "/sources", headers=alice).json() == []
    assert client.post(path + "/restore", headers=bob).status_code == 404
    assert client.get(URL, headers=bob).json()["lastRemoved"] is None
    assert client.post(path + "/restore", headers=alice).json() == edited
    assert client.patch(path, headers=alice, json={"meaning": " "}).json()["meaning"] is None


def test_latest_undo_and_unfiltered_clear_guard(client, create_user):
    _, headers = create_user()
    def add(term):
        return client.post(URL, headers=headers, json={"term": term, "contextText": term}).json()["id"]
    first, second, third = (add(word) for word in ["một", "hai", "ba"])
    for entry_id in [first, second, second]:
        assert client.delete(f"{URL}/{entry_id}?undoable=true", headers=headers).status_code == 204
    assert client.post(f"{URL}/{first}/restore", headers=headers).status_code == 404
    page = client.get(URL, params={"q": "hai"}, headers=headers).json()
    assert (page["total"], page["libraryTotal"], page["lastRemoved"]["id"]) == (0, 1, second)
    assert client.delete(URL + "?expectedTotal=0", headers=headers).status_code == 409
    assert client.get(URL, headers=headers).json()["items"][0]["id"] == third
    assert client.delete(URL + "?expectedTotal=1", headers=headers).status_code == 204
    assert client.post(f"{URL}/{second}/restore", headers=headers).status_code == 404
