from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.vocabulary import VocabularyEntry
from app.schemas.vocabulary import VocabularyQuery


class VocabularyRepository:
    def __init__(self, db: Session):
        self.db = db

    def lock_owner(self, user_id: int) -> None:
        # Serialize changes to the single undo slot and guarded bulk deletes across tabs.
        self.db.scalar(select(User.id).where(User.id == user_id).with_for_update())

    def owned_entry(self, user_id: int, entry_id: int):
        return self.db.scalar(select(VocabularyEntry).where(
            VocabularyEntry.user_id == user_id, VocabularyEntry.id == entry_id,
        ))

    def last_removed(self, user_id: int):
        return self.db.scalar(select(VocabularyEntry).where(
            VocabularyEntry.user_id == user_id, VocabularyEntry.removed.is_(True),
        ))

    def count_visible(self, user_id: int) -> int:
        return self.db.scalar(select(func.count()).select_from(VocabularyEntry).where(
            VocabularyEntry.user_id == user_id, VocabularyEntry.removed.is_(False),
        ))

    def find_duplicate(self, user_id: int, key: str) -> VocabularyEntry | None:
        return self.db.scalar(select(VocabularyEntry).where(
            VocabularyEntry.user_id == user_id, VocabularyEntry.dedupe_key == key,
        ))

    def discard(self, entry: VocabularyEntry) -> None:
        self.db.delete(entry)
        self.db.flush()

    def persist(self, entry: VocabularyEntry) -> VocabularyEntry:
        self.db.add(entry)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise
        self.db.refresh(entry)
        return entry

    def list(self, user_id: int, query: VocabularyQuery, normalized_query: str):
        conditions = [VocabularyEntry.user_id == user_id, VocabularyEntry.removed.is_(False)]
        if normalized_query:
            conditions.append(VocabularyEntry.normalized_term.contains(normalized_query, autoescape=True))
        if query.source_document_id:
            conditions.append(VocabularyEntry.source_document_id == query.source_document_id)
        if query.from_date:
            conditions.append(VocabularyEntry.created_at >= query.from_date)
        if query.to_date:
            conditions.append(VocabularyEntry.created_at < query.to_date)
        total = self.db.scalar(select(func.count()).select_from(VocabularyEntry).where(*conditions))
        items = list(self.db.scalars(select(VocabularyEntry).where(*conditions).order_by(
            VocabularyEntry.created_at.desc(), VocabularyEntry.id.desc(),
        ).offset(query.skip).limit(query.limit)))
        return items, total

    def sources(self, user_id: int):
        return self.db.execute(select(
            VocabularyEntry.source_document_id,
            func.max(VocabularyEntry.source_title).label("source_title"),
        ).where(
            VocabularyEntry.user_id == user_id,
            VocabularyEntry.source_document_id.is_not(None), VocabularyEntry.removed.is_(False),
        ).group_by(VocabularyEntry.source_document_id).order_by(
            VocabularyEntry.source_document_id,
        )).all()

    def delete_one(self, user_id: int, entry_id: int) -> bool:
        result = self.db.execute(delete(VocabularyEntry).where(
            VocabularyEntry.user_id == user_id, VocabularyEntry.id == entry_id,
        ))
        self.db.commit()
        return result.rowcount > 0

    def delete_all(self, user_id: int) -> None:
        self.db.execute(delete(VocabularyEntry).where(VocabularyEntry.user_id == user_id))
        self.db.commit()
