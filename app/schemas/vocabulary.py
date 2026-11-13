from datetime import datetime
from typing import Literal, Self

from pydantic import AwareDatetime, ConfigDict, Field, field_validator, model_validator

from app.schemas.base import CamelModel


class VocabularyWrite(CamelModel):
    # Reject forged owner/timestamp fields rather than silently accepting them.
    model_config = ConfigDict(extra="forbid")
    term: str = Field(min_length=1, max_length=120)
    meaning: str | None = Field(default=None, max_length=2000)
    example: str | None = Field(default=None, max_length=2000)
    context_text: str = Field(min_length=1, max_length=4000)
    source_document_id: str | None = Field(default=None, min_length=1, max_length=200)
    source_title: str | None = Field(default=None, min_length=1, max_length=300)
    source_kind: Literal["paste", "pdf", "image"] | None = None
    content_version: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    segment_id: str | None = Field(default=None, min_length=1, max_length=100)
    start: int | None = Field(default=None, ge=0, strict=True)
    end: int | None = Field(default=None, ge=1, strict=True)

    @field_validator("meaning", "example", mode="before")
    @classmethod
    def blank_optional_text(cls, value):
        return (value.strip() or None) if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_selection(self) -> Self:
        if not self.term.strip() or not self.context_text.strip():
            raise ValueError("Từ và ngữ cảnh không được trống")
        for value in self.model_dump().values():
            if isinstance(value, str):
                if "\x00" in value:
                    raise ValueError("Văn bản chứa ký tự NUL không hợp lệ")
                try:
                    value.encode("utf-16-le")
                except UnicodeEncodeError:
                    raise ValueError("Văn bản chứa Unicode không hợp lệ") from None
        if len(self.term.encode("utf-16-le")) // 2 > 120:
            raise ValueError("Từ/cụm từ tối đa 120 ký tự UTF-16")
        if len(self.context_text.encode("utf-16-le")) // 2 > 4000:
            raise ValueError("Ngữ cảnh tối đa 4000 ký tự UTF-16")
        coordinates = (self.segment_id, self.start, self.end)
        if any(v is not None for v in coordinates):
            if any(v is None for v in coordinates):
                raise ValueError("segmentId, start và end phải được gửi cùng nhau")
            encoded = self.context_text.encode("utf-16-le")
            if self.start >= self.end or self.end * 2 > len(encoded):
                raise ValueError("Vị trí từ nằm ngoài đoạn ngữ cảnh")
            try:
                selected = encoded[self.start * 2:self.end * 2].decode("utf-16-le")
            except UnicodeDecodeError:
                raise ValueError("Vị trí từ chia đôi ký tự Unicode") from None
            if selected != self.term:
                raise ValueError("Từ được lưu không khớp vị trí trong ngữ cảnh")
        return self


class VocabularyRead(VocabularyWrite):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


class VocabularyQuery(CamelModel):
    q: str = Field(default="", max_length=120)
    source_document_id: str | None = Field(default=None, max_length=200)
    from_date: AwareDatetime | None = Field(default=None, alias="from")
    to_date: AwareDatetime | None = Field(default=None, alias="to")
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.from_date and self.to_date and self.from_date >= self.to_date:
            raise ValueError("Ngày kết thúc phải sau ngày bắt đầu")
        return self


class VocabularyPage(CamelModel):
    items: list[VocabularyRead]
    total: int
    skip: int
    limit: int


class VocabularySource(CamelModel):
    source_document_id: str
    source_title: str
