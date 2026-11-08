from typing import Literal

from app.schemas.base import CamelModel


class ExtractedTextRead(CamelModel):
    text: str
    source: Literal["pdf", "image"]
    page_count: int | None = None  
    char_count: int
    ocr_used: bool