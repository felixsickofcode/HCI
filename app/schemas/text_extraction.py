from typing import Literal

from pydantic import Field

from app.schemas.base import CamelModel


class ReadingBlockRead(CamelModel):
    id: str
    type: Literal["paragraph", "heading", "listItem", "quote", "table", "snapshot"]
    text: str
    page_number: int | None = None
    heading_level: Literal[2, 3] | None = None
    list_kind: Literal["ordered", "unordered"] | None = None
    rows: list[list[str]] | None = None
    caption: str | None = None
    image_src: str | None = None
    image_width: int | None = None
    image_height: int | None = None
    snapshot_kind: Literal["table", "image"] | None = None
    source_bbox: tuple[float, float, float, float] | None = None


class ExtractedTextRead(CamelModel):
    text: str
    source: Literal["pdf", "image"]
    page_count: int | None = None
    char_count: int
    ocr_used: bool
    source_text: str | None = None
    blocks: list[ReadingBlockRead] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    skipped_ocr_pages: list[int] = Field(default_factory=list)
