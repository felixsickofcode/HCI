import hashlib
import json
import unicodedata

from sqlalchemy.exc import IntegrityError

from app.core.exceptions import NotFoundError
from app.models.vocabulary import VocabularyEntry
from app.repositories.vocabulary_repository import VocabularyRepository
from app.schemas.vocabulary import VocabularyQuery, VocabularyWrite


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFC", value).lower().split())


class VocabularyService:
    def __init__(self, repo: VocabularyRepository):
        self.repo = repo

    def save(self, user_id: int, data: VocabularyWrite) -> tuple[VocabularyEntry, bool]:
        payload = data.model_dump()
        normalized = normalize_text(data.term)
        identity = [normalized, normalize_text(data.context_text), data.source_document_id,
                    data.content_version, data.segment_id, data.start, data.end]
        key = hashlib.sha256(json.dumps(identity, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        existing = self.repo.find_duplicate(user_id, key)
        if existing:
            return existing, False
        record = VocabularyEntry(user_id=user_id, normalized_term=normalized, dedupe_key=key, **payload)
        try:
            return self.repo.create(record), True
        except IntegrityError:
            # A concurrent request may have inserted this selection after our read.
            existing = self.repo.find_duplicate(user_id, key)
            if existing:
                return existing, False
            raise

    def list(self, user_id: int, query: VocabularyQuery):
        return self.repo.list(user_id, query, normalize_text(query.q))

    def sources(self, user_id: int):
        return [{"sourceDocumentId": row.source_document_id,
                 "sourceTitle": row.source_title or "Tài liệu không có tên"}
                for row in self.repo.sources(user_id)]

    def delete(self, user_id: int, entry_id: int) -> None:
        if not self.repo.delete_one(user_id, entry_id):
            raise NotFoundError("Không tìm thấy từ đã lưu")

    def clear(self, user_id: int) -> None:
        self.repo.delete_all(user_id)
