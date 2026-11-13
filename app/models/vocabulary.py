from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import utcnow


class VocabularyEntry(Base):
    __tablename__ = "vocabulary_entries"
    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_vocabulary_user_dedupe"),
        Index("ix_vocabulary_user_created", "user_id", "created_at", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    term: Mapped[str] = mapped_column(String(120))
    normalized_term: Mapped[str] = mapped_column(String(240))
    meaning: Mapped[str | None] = mapped_column(Text)
    example: Mapped[str | None] = mapped_column(Text)
    context_text: Mapped[str] = mapped_column(Text)
    source_document_id: Mapped[str | None] = mapped_column(String(200))
    source_title: Mapped[str | None] = mapped_column(String(300))
    source_kind: Mapped[str | None] = mapped_column(String(10))
    content_version: Mapped[str | None] = mapped_column(String(64))
    segment_id: Mapped[str | None] = mapped_column(String(100))
    start: Mapped[int | None] = mapped_column(Integer)
    end: Mapped[int | None] = mapped_column(Integer)
    dedupe_key: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
