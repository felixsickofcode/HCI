from typing import Literal

from pydantic import Field, field_validator

from app.schemas.base import CamelModel


class SegmentIn(CamelModel):
    id: str = Field(min_length=1, max_length=100)
    text: str

    @field_validator("text")
    @classmethod
    def _text_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Đoạn văn không được để trống")
        return value


class SummarizeRequest(CamelModel):
    document_id: str = Field(min_length=1, max_length=200)
    segments: list[SegmentIn] = Field(min_length=1)
    method: Literal["extractive", "llm"] = "extractive"
    length: Literal["short", "medium", "long"] = "medium"


class SummaryItem(CamelModel):
    id: str
    text: str
    sources: list[str]


class SummaryVariant(CamelModel):
    length: Literal["short", "medium", "long"]
    items: list[SummaryItem]


class SummarizeResponse(CamelModel):
    document_id: str
    content_version: str
    method: Literal["extractive", "llm"]
    items: list[SummaryItem]
    variants: list[SummaryVariant] = Field(default_factory=list)
