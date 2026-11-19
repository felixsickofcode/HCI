import hashlib
import json
import unicodedata

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError, NotFoundError
from app.models.vocabulary import VocabularyEntry
from app.repositories.vocabulary_repository import VocabularyRepository
from app.schemas.vocabulary import VocabularyQuery, VocabularyWrite


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFC", value).lower().split())


class VocabularyService:
    def __init__(self, repo: VocabularyRepository):
        self.repo = repo

    def save(self, user_id: int, data: VocabularyWrite) -> tuple[VocabularyEntry, bool]:
        self.repo.lock_owner(user_id)
        payload = data.model_dump()
        normalized = normalize_text(data.term)
        identity = [normalized, normalize_text(data.context_text), data.source_document_id,
                    data.content_version, data.segment_id, data.start, data.end]
        key = hashlib.sha256(json.dumps(identity, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        existing = self.repo.find_duplicate(user_id, key)
        if existing and existing.removed:
            self.repo.discard(existing)
        elif existing:
            return existing, False
        record = VocabularyEntry(user_id=user_id, normalized_term=normalized, dedupe_key=key, **payload)
        try:
            return self.repo.persist(record), True
        except IntegrityError:
            # A concurrent request may have inserted this selection after our read.
            existing = self.repo.find_duplicate(user_id, key)
            if existing:
                return existing, False
            raise

    def list(self, user_id: int, query: VocabularyQuery):
        items, total = self.repo.list(user_id, query, normalize_text(query.q))
        filtered = query.q or query.source_document_id or query.from_date or query.to_date
        library_total = self.repo.count_visible(user_id) if filtered else total
        removed = self.repo.last_removed(user_id)
        return items, total, library_total, {"id": removed.id, "term": removed.term} if removed else None

    def sources(self, user_id: int):
        return [{"sourceDocumentId": row.source_document_id,
                 "sourceTitle": row.source_title or "Tài liệu không có tên"}
                for row in self.repo.sources(user_id)]

    def update_note(self, user_id: int, entry_id: int, meaning: str | None):
        self.repo.lock_owner(user_id)
        entry = self.repo.owned_entry(user_id, entry_id)
        if entry is None or entry.removed:
            raise NotFoundError("Không tìm thấy từ đã lưu")
        entry.meaning = meaning
        return self.repo.persist(entry)

    def restore(self, user_id: int, entry_id: int):
        self.repo.lock_owner(user_id)
        entry = self.repo.owned_entry(user_id, entry_id)
        if entry is None:
            raise NotFoundError("Từ này không còn để hoàn tác")
        entry.removed = False
        return self.repo.persist(entry)

    def delete(self, user_id: int, entry_id: int, undoable: bool = False) -> None:
        self.repo.lock_owner(user_id)
        if undoable:
            entry = self.repo.owned_entry(user_id, entry_id)
            if entry is None:
                raise NotFoundError("Không tìm thấy từ đã lưu")
            previous = self.repo.last_removed(user_id)
            if previous and previous.id != entry_id:
                self.repo.discard(previous)
            entry.removed = True
            self.repo.persist(entry)
            return
        if not self.repo.delete_one(user_id, entry_id):
            raise NotFoundError("Không tìm thấy từ đã lưu")

    def clear(self, user_id: int, expected_total: int | None = None) -> None:
        self.repo.lock_owner(user_id)
        if expected_total is not None and expected_total != self.repo.count_visible(user_id):
            raise ConflictError("Số từ đã thay đổi. Hãy mở lại xác nhận xóa.")
        self.repo.delete_all(user_id)
