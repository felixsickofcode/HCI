from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.user import utcnow


class UserDisplaySettings(Base):
    """Cài đặt hiển thị đã lưu của một người dùng (mỗi người một dòng)."""

    __tablename__ = "display_settings"

    # Khóa chính cũng là khóa ngoại: một user chỉ có tối đa một dòng.
    # Xóa user thì dòng này bị xóa theo (ondelete CASCADE).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        autoincrement=False,
    )
    schema_version: Mapped[int] = mapped_column(Integer)
    settings: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
